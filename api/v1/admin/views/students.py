import datetime
import logging
from django.db import transaction
from django.db.models import Q, Count
from django.utils import timezone
from rest_framework import generics, parsers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import UserRateThrottle
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model

from core.models import ActivityLog
from apps.students.models import StudentProfile
from apps.attendance.models import Attendance
from apps.payments.models import Payment
from shreshtlibrary.utils.permissions import HasAdminPermission
from api.v1.admin.pagination import AdminStandardPagination
from api.v1.admin.serializers import StudentProfileSerializer, PaymentSerializer, AttendanceSerializer
from utils.response import standard_response
from api.v1.v2_admin import _activity, _admin_user, _image_upload
from api.v1.admin.views.dashboard import clear_dashboard_cache

User = get_user_model()
logger = logging.getLogger(__name__)

class StudentActionThrottle(UserRateThrottle):
    rate = '60/minute'

class AdminStudentsView(generics.ListCreateAPIView):
    permission_classes = [HasAdminPermission("manage_students")]
    parser_classes = [parsers.JSONParser, parsers.MultiPartParser, parsers.FormParser]
    pagination_class = AdminStandardPagination
    serializer_class = StudentProfileSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'goal', 'gender']
    throttle_classes = [StudentActionThrottle]

    def get_queryset(self):
        qs = StudentProfile.objects.select_related("user").all().order_by("-created_at", "-id")
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(student_id__icontains=search) |
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(user__email__icontains=search) |
                Q(user__mobile__icontains=search)
            )
        
        from rest_framework.exceptions import ValidationError
        created_from = self.request.query_params.get("created_from")
        created_to = self.request.query_params.get("created_to")
        if created_from and created_from.strip():
            try:
                qs = qs.filter(created_at__date__gte=datetime.date.fromisoformat(created_from))
            except ValueError:
                raise ValidationError({"created_from": "Invalid date format. Use YYYY-MM-DD."})
        if created_to and created_to.strip():
            try:
                qs = qs.filter(created_at__date__lte=datetime.date.fromisoformat(created_to))
            except ValueError:
                raise ValidationError({"created_to": "Invalid date format. Use YYYY-MM-DD."})
        return qs

    def create(self, request, *args, **kwargs):
        payload = request.data
        mobile = payload.get("mobile")
        if mobile == "":
            mobile = None
        email = payload.get("email")
        if email == "":
            email = None
        
        if not mobile:
            return standard_response("error", "Mobile is required.", errors={"mobile": ["This field is required."]}, status_code=400)
            
        errors = {}
        # Enforce mobile format (e.g. 10 digits)
        if mobile and not (str(mobile).isdigit() and len(str(mobile)) == 10):
            errors["mobile"] = ["Enter a valid 10-digit mobile number."]
            
        parent_mobile = payload.get("parent_mobile")
        if parent_mobile and not (str(parent_mobile).isdigit() and len(str(parent_mobile)) == 10):
            errors["parent_mobile"] = ["Enter a valid 10-digit mobile number."]

        gender = payload.get("gender")
        if gender and gender not in ["Male", "Female", "Other"]:
            errors["gender"] = ["Gender must be 'Male', 'Female', or 'Other'."]
            
        # Unique validation
        if User.objects.filter(mobile=mobile).exists():
            errors["mobile"] = errors.get("mobile", []) + ["A student with this mobile number already exists."]
        if email and User.objects.filter(email=email).exists():
            errors["email"] = ["A student with this email address already exists."]
        username = payload.get("username") or mobile
        if User.objects.filter(username=username).exists():
            errors["username"] = ["A student with this username already exists."]
            
        if errors:
            return standard_response("error", "Validation failed.", errors=errors, status_code=400)
            
        password = payload.get("password") or mobile or "studentpassword123"
        
        # Validate date of birth
        dob = payload.get("dob") or payload.get("date_of_birth")
        if dob == "":
            dob = None
        if dob:
            try:
                datetime.date.fromisoformat(str(dob))
            except ValueError:
                return standard_response("error", "Invalid date format for Date of Birth. Use YYYY-MM-DD.", errors={"dob": ["Enter a valid date in YYYY-MM-DD format."]}, status_code=400)
        
        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    mobile=mobile,
                    first_name=payload.get("first_name", ""),
                    last_name=payload.get("last_name", ""),
                    role="student",
                    password=password,
                )
                
                profile = StudentProfile.objects.create(
                    user=user,
                    middle_name=payload.get("middle_name"),
                    goal=payload.get("goal", "Other"),
                    dob=dob,
                    gender=payload.get("gender", "Other"),
                    caste=payload.get("caste"),
                    address=payload.get("address"),
                    profile_photo=_image_upload(request, "profile_photo", "profile_image", "image"),
                    parent_mobile=payload.get("parent_mobile"),
                    preferred_language=payload.get("preferred_language", "en"),
                )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.exception("Failed to create student profile")
            return standard_response("error", "Failed to create student due to an internal server error.", status_code=500)
        
        _activity(request, "ADD_STUDENT", "StudentProfile", profile.id, f"Created student {profile.student_id}")
        
        try:
            from apps.notifications.models import AdminInboxNotification
            creator = _admin_user(request)
            creator_name = creator.username if creator else "Admin/Keeper"
            AdminInboxNotification.objects.create(
                type='NEW_STUDENT',
                title='New Student Added Manually',
                message=f"Student {user.username} was added by {creator_name}.",
                related_id=str(user.id),
                student=user
            )
        except Exception:
            pass

        clear_dashboard_cache()
        return standard_response(message="Student created successfully.", data=self.get_serializer(profile).data, status_code=201)


class AdminStudentDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [HasAdminPermission("manage_students")]
    parser_classes = [parsers.JSONParser, parsers.MultiPartParser, parsers.FormParser]
    serializer_class = StudentProfileSerializer
    throttle_classes = [StudentActionThrottle]

    def get_object(self):
        pk = str(self.kwargs['pk'])
        if pk.isdigit():
            return get_object_or_404(StudentProfile.objects.select_related("user"), Q(pk=pk) | Q(user_id=pk))
        return get_object_or_404(StudentProfile.objects.select_related("user"), student_id__iexact=pk)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return standard_response(data=self.get_serializer(instance).data)

    def update(self, request, *args, **kwargs):
        profile = self.get_object()
        user = profile.user
        
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        if "email" in data and data["email"] == "":
            data["email"] = None
        if "mobile" in data and data["mobile"] == "":
            data["mobile"] = None
        
        errors = {}
        if "mobile" in data:
            mobile = data["mobile"]
            if mobile and not (str(mobile).isdigit() and len(str(mobile)) == 10):
                errors["mobile"] = ["Enter a valid 10-digit mobile number."]
            if mobile and User.objects.filter(mobile=mobile).exclude(id=user.id).exists():
                errors["mobile"] = errors.get("mobile", []) + ["A student with this mobile number already exists."]
        if "parent_mobile" in data:
            parent_mobile = data["parent_mobile"]
            if parent_mobile and not (str(parent_mobile).isdigit() and len(str(parent_mobile)) == 10):
                errors["parent_mobile"] = ["Enter a valid 10-digit mobile number."]
        if "gender" in data:
            gender = data["gender"]
            if gender and gender not in ["Male", "Female", "Other"]:
                errors["gender"] = ["Gender must be 'Male', 'Female', or 'Other'."]
        if "email" in data:
            email = data["email"]
            if email and User.objects.filter(email=email).exclude(id=user.id).exists():
                errors["email"] = ["A student with this email address already exists."]
        if "username" in data:
            username = data["username"]
            if User.objects.filter(username=username).exclude(id=user.id).exists():
                errors["username"] = ["A student with this username already exists."]
                
        dob = data.get("dob") or data.get("date_of_birth")
        if dob == "":
            dob = None
        if dob:
            try:
                datetime.date.fromisoformat(str(dob))
            except ValueError:
                errors["dob"] = ["Enter a valid date in YYYY-MM-DD format."]
                
        if errors:
            return standard_response("error", "Validation failed.", errors=errors, status_code=400)
            
        try:
            with transaction.atomic():
                for field in ["first_name", "last_name", "email", "mobile", "username"]:
                    if field in data:
                        setattr(user, field, data[field])
                if "is_active" in request.data:
                    user.is_active = str(request.data["is_active"]).lower() in ["true", "1", "yes"]
                user.save()
                
                for field in ["middle_name", "goal", "gender", "caste", "address", "parent_mobile", "status", "preferred_language"]:
                    if field in request.data:
                        setattr(profile, field, request.data[field])
                
                if "dob" in request.data or "date_of_birth" in request.data:
                    profile.dob = dob
                    
                image = _image_upload(request, "profile_photo", "profile_image", "image")
                if image:
                    profile.profile_photo = image
                    
                profile.save()
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.exception("Failed to update student profile")
            return standard_response("error", "Failed to update student due to an internal server error.", status_code=500)
            
        _activity(request, "EDIT_STUDENT", "StudentProfile", profile.id, f"Updated student {profile.student_id}")
        clear_dashboard_cache()
        return standard_response(message="Student updated successfully.", data=self.get_serializer(profile).data)

    def destroy(self, request, *args, **kwargs):
        from shreshtlibrary.utils.permissions import IsSuperAdmin
        if not IsSuperAdmin().has_permission(request, self):
            return standard_response("error", "Super admin access required.", status_code=403)
            
        profile = self.get_object()
        user = profile.user
        _activity(request, "DELETE_STUDENT", "StudentProfile", profile.id, f"Deleted student {profile.student_id}")
        user.delete()
        clear_dashboard_cache()
        return standard_response(message="Student deleted successfully.")


class AdminStudentPhotoView(APIView):
    permission_classes = [HasAdminPermission("manage_students")]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]
    throttle_classes = [StudentActionThrottle]

    def _upload(self, request, pk):
        pk = str(pk)
        if pk.isdigit():
            profile = get_object_or_404(StudentProfile, Q(pk=pk) | Q(user_id=pk))
        else:
            profile = get_object_or_404(StudentProfile, student_id__iexact=pk)
        image = _image_upload(request, "profile_photo", "profile_image", "image")
        if not image:
            return standard_response(
                "error",
                "Profile image is required.",
                errors={"profile_photo": ["Upload an image file."]},
                status_code=400,
            )
            
        # File type validation
        ext = image.name.split('.')[-1].lower() if '.' in image.name else ''
        if ext not in ['jpg', 'jpeg', 'png', 'webp']:
            return standard_response(
                "error",
                "Invalid image format.",
                errors={"profile_photo": ["Allowed formats: JPG, JPEG, PNG, WEBP."]},
                status_code=400,
            )
            
        # File size validation (max 5MB)
        if image.size > 5 * 1024 * 1024:
            return standard_response(
                "error",
                "Image size too large.",
                errors={"profile_photo": ["Maximum allowed size is 5MB."]},
                status_code=400,
            )
            
        profile.profile_photo = image
        profile.save()
        _activity(request, "UPLOAD_STUDENT_PHOTO", "StudentProfile", profile.id, f"Updated photo for {profile.student_id}")
        clear_dashboard_cache()
        return standard_response(message="Profile image uploaded successfully.", data=StudentProfileSerializer(profile, context={'request': request}).data)

    def post(self, request, pk): return self._upload(request, pk)
    def put(self, request, pk): return self._upload(request, pk)


class AdminStudentStatusView(APIView):
    permission_classes = [HasAdminPermission("manage_students")]

    def post(self, request, pk, action):
        pk = str(pk)
        if pk.isdigit():
            profile = get_object_or_404(StudentProfile, Q(pk=pk) | Q(user_id=pk))
        else:
            profile = get_object_or_404(StudentProfile, student_id__iexact=pk)
        if action == "suspend":
            profile.status = "SUSPENDED"
            profile.suspension_reason = request.data.get("reason") or request.data.get("suspension_reason")
            profile.suspended_at = timezone.now()
            profile.suspended_by = _admin_user(request)
            event = "SUSPEND_STUDENT"
        else:
            profile.status = "LIVE"
            profile.suspension_reason = None
            profile.suspended_at = None
            profile.suspended_by = None
            event = "ACTIVATE_STUDENT"
        profile.save()
        _activity(request, event, "StudentProfile", profile.id, f"{event} {profile.student_id}")
        clear_dashboard_cache()
        return standard_response(data=StudentProfileSerializer(profile, context={'request': request}).data)


class AdminStudentRelatedView(APIView):
    permission_classes = [HasAdminPermission("manage_students")]

    def get(self, request, pk, kind):
        pk = str(pk)
        if pk.isdigit():
            profile = get_object_or_404(StudentProfile, Q(pk=pk) | Q(user_id=pk))
        else:
            profile = get_object_or_404(StudentProfile, student_id__iexact=pk)
        if kind == "timeline":
            activities = ActivityLog.objects.filter(details__target_id=profile.id, details__target_model="StudentProfile").order_by("-timestamp")[:50]
            return standard_response(data=[{
                "id": item.id,
                "action": item.action,
                "description": item.details.get("description", ""),
                "created_at": item.timestamp,
            } for item in activities])
        if kind == "payments":
            payments = Payment.objects.filter(student=profile.user).select_related("student", "membership", "membership__plan").order_by("-payment_date")
            return standard_response(data=PaymentSerializer(payments, many=True).data)
        if kind == "attendance":
            attendances = Attendance.objects.filter(student=profile.user).select_related("student").order_by("-date")
            return standard_response(data=AttendanceSerializer(attendances, many=True).data)
        return standard_response("error", "Unknown related view.", status_code=404)


class AdminStudentCountsView(APIView):
    permission_classes = [HasAdminPermission("manage_students")]

    def get(self, request):
        counts = StudentProfile.objects.aggregate(
            total=Count('id'),
            live=Count('id', filter=Q(status='LIVE')),
            expired=Count('id', filter=Q(status='EXPIRED')),
            suspended=Count('id', filter=Q(status='SUSPENDED')),
            girls=Count('id', filter=Q(gender__iexact='Female')),
            boys=Count('id', filter=Q(gender__iexact='Male')),
        )
        return standard_response(data={
            "total": counts["total"],
            "live": counts["live"],
            "expired": counts["expired"],
            "suspended": counts["suspended"],
            "girls": counts["girls"],
            "boys": counts["boys"],
            "other": max(counts["total"] - counts["girls"] - counts["boys"], 0),
        })

# Keep the analytics and export logic from v2_admin, simply updating it to use the new serializer structure if needed.
from api.v1.v2_admin import AdminStudentAnalyticsView as LegacyAdminStudentAnalyticsView
from api.v1.v2_admin import AdminStudentExportView as LegacyAdminStudentExportView
class AdminStudentAnalyticsView(LegacyAdminStudentAnalyticsView): pass
class AdminStudentExportView(LegacyAdminStudentExportView): pass
