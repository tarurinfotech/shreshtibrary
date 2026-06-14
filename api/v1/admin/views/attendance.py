import uuid
import datetime
import logging
from django.db import transaction
from django.db.models import Q, Count
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import UserRateThrottle
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)

class QRActionThrottle(UserRateThrottle):
    rate = '30/minute'

class AttendanceActionThrottle(UserRateThrottle):
    rate = '60/minute'

from apps.attendance.models import Attendance, Holiday, QRCode
from apps.students.models import StudentProfile
from shreshtlibrary.utils.permissions import HasAdminPermission
from api.v1.admin.pagination import AdminStandardPagination
from api.v1.admin.serializers import AttendanceSerializer, HolidaySerializer, QRCodeSerializer, StudentProfileSerializer
from utils.response import standard_response
from api.v1.v2_admin import _activity, _admin_user, _date, _holiday_for_date
from api.v1.admin.views.dashboard import clear_dashboard_cache

User = get_user_model()

def _generate_qr(request, method="MANUAL"):
    with transaction.atomic():
        # Prevent concurrent modification by locking active QR codes
        active_qrs = list(QRCode.objects.select_for_update().filter(is_active=True))
        QRCode.objects.filter(id__in=[q.id for q in active_qrs]).update(is_active=False, is_expired=True)
        
        now = timezone.now()
        qr = QRCode.objects.create(
            token=uuid.uuid4(),
            code=f"library-qr-{now.date()}-{uuid.uuid4()}",
            valid_date=now.date(),
            expiry_timestamp=now + datetime.timedelta(days=1),
            expires_at=now + datetime.timedelta(days=1),
            is_active=True,
            is_expired=False,
            generation_method=method,
            created_by=_admin_user(request),
        )
    _activity(request, "GENERATE_QR", "QRCode", qr.id, "Generated QR code")
    return qr

class AdminQRView(APIView):
    permission_classes = [HasAdminPermission("manage_attendance")]
    throttle_classes = [QRActionThrottle]

    def get(self, request, action=None, pk=None):
        if action == "history":
            qs = QRCode.objects.all().order_by("-created_at")
            paginator = AdminStandardPagination()
            paginated_qs = paginator.paginate_queryset(qs, request)
            return paginator.get_paginated_response(QRCodeSerializer(paginated_qs, many=True).data)
            
        if action == "scans":
            qs = Attendance.objects.filter(qr_code_id=pk).select_related("student")
            return standard_response(data=AttendanceSerializer(qs, many=True).data)
            
        qr = QRCode.objects.filter(is_active=True).order_by("-created_at").first()
        return standard_response(data=QRCodeSerializer(qr).data if qr else None)

    def post(self, request, action=None):
        if action in ["generate", "regenerate"]:
            qr = _generate_qr(request)
            return standard_response(data=QRCodeSerializer(qr).data, status_code=201)
            
        if action == "expire":
            with transaction.atomic():
                active_qrs = list(QRCode.objects.select_for_update().filter(is_active=True))
                QRCode.objects.filter(id__in=[q.id for q in active_qrs]).update(is_active=False, is_expired=True)
            return standard_response(message="Current QR expired.")
            
        return standard_response("error", "Unknown QR action.", status_code=404)


class AdminAttendanceView(generics.ListCreateAPIView):
    permission_classes = [HasAdminPermission("manage_attendance")]
    serializer_class = AttendanceSerializer
    pagination_class = AdminStandardPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['student_id', 'date', 'method']
    throttle_classes = [AttendanceActionThrottle]

    def get_queryset(self):
        qs = Attendance.objects.select_related("student").all().order_by("-date", "-marked_at")
        from_date = self.request.query_params.get("from_date")
        to_date = self.request.query_params.get("to_date")
        
        from rest_framework.exceptions import ValidationError
        if from_date and from_date.strip():
            try:
                qs = qs.filter(date__gte=_date(from_date))
            except ValueError:
                raise ValidationError({"from_date": "Invalid date format. Use YYYY-MM-DD."})
        if to_date and to_date.strip():
            try:
                qs = qs.filter(date__lte=_date(to_date))
            except ValueError:
                raise ValidationError({"to_date": "Invalid date format. Use YYYY-MM-DD."})
        return qs

    def create(self, request, *args, **kwargs):
        student = None
        student_id = request.data.get("student_id")
        student_mobile = request.data.get("student_mobile")
        
        if student_id:
            try:
                student = get_object_or_404(User, id=student_id, role="student")
            except (ValueError, TypeError):
                return standard_response("error", "Invalid Student ID format.", status_code=400)
        elif student_mobile:
            student = get_object_or_404(User, mobile=student_mobile, role="student")
            
        if not student:
            return standard_response("error", "Student is required.", status_code=400)
            
        raw_date = request.data.get("date")
        try:
            date = _date(raw_date, timezone.now().date())
        except ValueError:
            return standard_response("error", "Invalid date format. Use YYYY-MM-DD.", status_code=400)
            
        holiday = _holiday_for_date(date)
        if holiday:
            return standard_response("error", f"Attendance is closed for holiday: {holiday.title}.", data=HolidaySerializer(holiday).data, status_code=400)
            
        payload = {
            "student": student.id,
            "date": date,
            "is_present": request.data.get("is_present", True),
            "is_manual": True,
            "method": "MANUAL",
            "marked_by": _admin_user(request).id,
            "note": request.data.get("note"),
        }
        
        with transaction.atomic():
            existing_record = Attendance.objects.select_for_update().filter(student=student, date=date).first()
            if existing_record:
                serializer = self.get_serializer(existing_record, data=payload, partial=True)
            else:
                serializer = self.get_serializer(data=payload)
            serializer.is_valid(raise_exception=True)
            record = serializer.save()
            
        _activity(request, "MANUAL_ATTENDANCE", "Attendance", record.id, f"Manual attendance for {student.username}")
        clear_dashboard_cache()
        return standard_response(data=self.get_serializer(record).data, status_code=201)


class AdminAttendanceDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [HasAdminPermission("manage_attendance")]
    serializer_class = AttendanceSerializer
    queryset = Attendance.objects.all()

    def update(self, request, *args, **kwargs):
        record = self.get_object()
        raw_date = request.data.get("date")
        try:
            target_date = _date(raw_date, record.date)
        except ValueError:
            return standard_response("error", "Invalid date format. Use YYYY-MM-DD.", status_code=400)
            
        holiday = _holiday_for_date(target_date)
        if holiday:
            return standard_response("error", f"Attendance is closed for holiday: {holiday.title}.", data=HolidaySerializer(holiday).data, status_code=400)
            
        serializer = self.get_serializer(record, data=request.data, partial=True)
        if serializer.is_valid():
            if "date" in request.data:
                serializer.validated_data["date"] = target_date
            record = serializer.save()
            clear_dashboard_cache()
            return standard_response(data=self.get_serializer(record).data)
        return standard_response("error", "Validation failed.", errors=serializer.errors, status_code=400)

    def destroy(self, request, *args, **kwargs):
        self.get_object().delete()
        clear_dashboard_cache()
        return standard_response(message="Attendance deleted.")


class AdminAttendanceSummaryView(APIView):
    permission_classes = [HasAdminPermission("manage_attendance")]

    def get(self, request, kind):
        raw_date = request.query_params.get("date")
        try:
            date = _date(raw_date, timezone.now().date())
        except ValueError:
            return standard_response("error", "Invalid date format. Use YYYY-MM-DD.", status_code=400)
        present_students = Attendance.objects.filter(date=date, is_present=True).values_list("student_id", flat=True)
        
        is_pending_period = False
        if date == timezone.now().date():
            from core.models import GlobalSetting
            from apps.library.models import LibraryInfo
            lib_info = LibraryInfo.objects.first()
            open_time_str = lib_info.open_time.strftime('%H:%M') if lib_info and lib_info.open_time else "08:00"
            padding_str = GlobalSetting.objects.filter(key="attendance_padding_time").values_list("value", flat=True).first() or "60"
            try:
                open_h, open_m = map(int, open_time_str.split(':'))
                padding = int(padding_str)
                now = timezone.now()
                open_dt = timezone.datetime.combine(now.date(), timezone.datetime.min.time().replace(hour=open_h, minute=open_m))
                open_dt = timezone.make_aware(open_dt, timezone.get_current_timezone())
                if now <= open_dt + timezone.timedelta(minutes=padding):
                    is_pending_period = True
            except Exception as e:
                logger.warning(f"Error parsing pending period for attendance summary: {e}")

        if kind == "daily-summary":
            total = User.objects.filter(role="student").count()
            present = len(set(present_students))
            pending_count = max(total - present, 0) if is_pending_period else 0
            absent_count = 0 if is_pending_period else max(total - present, 0)
            return standard_response(data={"date": date, "present": present, "absent": absent_count, "pending": pending_count, "total": total})
            
        if kind == "absentees":
            qs = StudentProfile.objects.exclude(user_id__in=present_students).select_related("user")
            res = []
            for item in qs:
                ser = StudentProfileSerializer(item, context={'request': request}).data
                ser["attendance_status"] = "pending" if is_pending_period else "absent"
                res.append(ser)
            return standard_response(data=res)
            
        profiles = StudentProfile.objects.select_related("user").annotate(
            streak=Count('user__attendances', filter=Q(user__attendances__is_present=True))
        ).order_by('-streak')[:20]
        
        streaks = [
            {
                "student": StudentProfileSerializer(profile, context={'request': request}).data,
                "streak": profile.streak
            }
            for profile in profiles
        ]
        return standard_response(data=streaks)
