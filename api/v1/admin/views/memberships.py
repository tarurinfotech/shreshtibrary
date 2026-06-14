import logging
from django.db.models import Q, Count
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.throttling import UserRateThrottle
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)

class MembershipActionThrottle(UserRateThrottle):
    rate = '30/minute'

from apps.memberships.models import Membership, MembershipPlan
from shreshtlibrary.utils.permissions import HasAdminPermission
from api.v1.admin.pagination import AdminStandardPagination
from api.v1.admin.serializers import MembershipSerializer, MembershipPlanSerializer, StudentProfileSerializer
from utils.response import standard_response
from api.v1.v2_admin import _activity, _admin_user, _date
from api.v1.admin.views.dashboard import clear_dashboard_cache

User = get_user_model()

class PlansView(generics.ListCreateAPIView):
    serializer_class = MembershipPlanSerializer
    throttle_classes = [MembershipActionThrottle]

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [HasAdminPermission("manage_plans")()]

    def get_queryset(self):
        return MembershipPlan.objects.filter(is_active=True).order_by("sort_order", "price")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            if not request.data.get("duration_months") and request.data.get("duration_days"):
                try:
                    serializer.validated_data["duration_months"] = max(int(request.data.get("duration_days", 30)) // 30, 1)
                except ValueError:
                    return standard_response("error", "Invalid duration_days.", errors={"duration_days": ["Must be an integer."]}, status_code=400)
            plan = serializer.save()
            _activity(request, "CREATE_PLAN", "MembershipPlan", plan.id, f"Created plan {plan.name}")
            clear_dashboard_cache()
            return standard_response(message="Plan created successfully.", data=self.get_serializer(plan).data, status_code=201)
        return standard_response("error", "Validation failed.", errors=serializer.errors, status_code=400)


class PlansAllView(generics.ListAPIView):
    permission_classes = [HasAdminPermission("manage_plans")]
    serializer_class = MembershipPlanSerializer
    queryset = MembershipPlan.objects.all().order_by("sort_order", "price")

    def list(self, request, *args, **kwargs):
        return standard_response(data=self.get_serializer(self.get_queryset(), many=True).data)


class PlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MembershipPlanSerializer
    queryset = MembershipPlan.objects.all()
    throttle_classes = [MembershipActionThrottle]

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [HasAdminPermission("manage_plans")()]

    def retrieve(self, request, *args, **kwargs):
        return standard_response(data=self.get_serializer(self.get_object()).data)

    def update(self, request, *args, **kwargs):
        plan = self.get_object()
        serializer = self.get_serializer(plan, data=request.data, partial=True)
        if serializer.is_valid():
            plan = serializer.save()
            _activity(request, "EDIT_PLAN", "MembershipPlan", plan.id, f"Updated plan {plan.name}")
            clear_dashboard_cache()
            return standard_response(data=self.get_serializer(plan).data)
        return standard_response("error", "Validation failed.", errors=serializer.errors, status_code=400)

    def destroy(self, request, *args, **kwargs):
        plan = self.get_object()
        if Membership.objects.filter(plan=plan).exists():
            return standard_response("error", "Plan has memberships and cannot be deleted.", status_code=400)
        plan.delete()
        clear_dashboard_cache()
        return standard_response(message="Plan deleted successfully.")


class PlanToggleView(APIView):
    permission_classes = [HasAdminPermission("manage_plans")]
    throttle_classes = [MembershipActionThrottle]

    def patch(self, request, pk):
        plan = get_object_or_404(MembershipPlan, id=pk)
        plan.is_active = request.data.get("is_active", not plan.is_active)
        plan.save(update_fields=["is_active", "updated_at"])
        clear_dashboard_cache()
        return standard_response(data=MembershipPlanSerializer(plan).data)


class PlanStudentsView(APIView):
    permission_classes = [HasAdminPermission("manage_plans")]

    def get(self, request, pk):
        profiles = StudentProfile.objects.filter(
            user__memberships__plan_id=pk,
            user__memberships__status="active"
        ).select_related("user")
        data = StudentProfileSerializer(profiles, many=True, context={'request': request}).data
        return standard_response(data=data)


class PlanStatsView(APIView):
    permission_classes = [HasAdminPermission("manage_plans")]

    def get(self, request):
        plans = MembershipPlan.objects.annotate(
            active_students_count=Count('membership_set__student', filter=Q(membership_set__status='active'), distinct=True),
            all_time_students_count=Count('membership_set__student', distinct=True)
        )
        data = []
        for plan in plans:
            plan_data = MembershipPlanSerializer(plan).data
            plan_data["active_students"] = plan.active_students_count
            plan_data["all_time_students"] = plan.all_time_students_count
            data.append(plan_data)
        return standard_response(data=data)


class AdminMembershipsView(generics.ListAPIView):
    permission_classes = [HasAdminPermission("manage_plans")]
    serializer_class = MembershipSerializer
    pagination_class = AdminStandardPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'student_id', 'plan_id']

    def get_queryset(self):
        return Membership.objects.select_related("student", "plan").all().order_by("-start_date")


class AdminMembershipActionView(APIView):
    permission_classes = [HasAdminPermission("manage_plans")]
    throttle_classes = [MembershipActionThrottle]

    def post(self, request, action):
        student = get_object_or_404(User, id=request.data.get("student_id"), role="student")
        plan = get_object_or_404(MembershipPlan, id=request.data.get("plan_id"))
        import datetime
        from django.db import transaction
        today = timezone.now().date()
        
        try:
            with transaction.atomic():
                # Acquire row-level lock on student to prevent concurrent duplicate renewals
                locked_student = User.objects.select_for_update().get(id=student.id)
                if action == "renew":
                    current = Membership.objects.filter(student=locked_student, status="active").order_by("-end_date").first()
                    start = current.end_date + datetime.timedelta(days=1) if current else today
                    renewal_count = (current.renewal_count + 1) if current else 1
                else:
                    Membership.objects.filter(student=locked_student, status="active").update(status="cancelled", is_active=False)
                    start = _date(request.data.get("start_date"), today)
                    renewal_count = 0
                    
                end = _date(request.data.get("end_date"), start + datetime.timedelta(days=plan.duration_days))
                membership = Membership.objects.create(
                    student=locked_student,
                    plan=plan,
                    start_date=start,
                    end_date=end,
                    status="active",
                    renewal_count=renewal_count,
                    notes=request.data.get("notes"),
                    created_by=_admin_user(request),
                )
        except Exception as e:
            logger.exception("Failed to create or renew membership")
            return standard_response("error", "Failed to process membership action due to a database error.", status_code=500)
            
        _activity(request, f"MEMBERSHIP_{action.upper()}", "Membership", membership.id, f"{action} membership for {student.username}")
        clear_dashboard_cache()
        return standard_response(data=MembershipSerializer(membership).data, status_code=201)


class AdminMembershipDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [HasAdminPermission("manage_plans")]
    serializer_class = MembershipSerializer
    queryset = Membership.objects.all()
    throttle_classes = [MembershipActionThrottle]

    def retrieve(self, request, *args, **kwargs):
        return standard_response(data=self.get_serializer(self.get_object()).data)

    def update(self, request, *args, **kwargs):
        membership = self.get_object()
        serializer = self.get_serializer(membership, data=request.data, partial=True)
        if serializer.is_valid():
            membership = serializer.save()
            clear_dashboard_cache()
            return standard_response(data=self.get_serializer(membership).data)
        return standard_response("error", "Validation failed.", errors=serializer.errors, status_code=400)


class AdminMembershipSpecialView(APIView):
    permission_classes = [HasAdminPermission("manage_plans")]
    throttle_classes = [MembershipActionThrottle]

    def get(self, request, kind):
        import datetime
        from rest_framework.exceptions import ValidationError
        today = timezone.now().date()
        if kind == "expiring":
            try:
                days = int(request.query_params.get("days", 7))
                if days < 0:
                    raise ValueError
            except ValueError:
                raise ValidationError({"days": "Must be a non-negative integer."})
            qs = Membership.objects.filter(status="active", end_date__lte=today + datetime.timedelta(days=days), end_date__gte=today)
        else:
            qs = Membership.objects.filter(end_date=today)
        return standard_response(data=MembershipSerializer(qs.select_related("student", "plan"), many=True).data)
