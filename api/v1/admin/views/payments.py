from decimal import Decimal
import logging
from django.db.models import Sum
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.throttling import UserRateThrottle
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)

class PaymentActionThrottle(UserRateThrottle):
    rate = '30/minute'

from apps.payments.models import Payment
from apps.memberships.models import Membership
from shreshtlibrary.utils.permissions import HasAdminPermission
from api.v1.admin.pagination import AdminStandardPagination
from api.v1.admin.serializers import PaymentSerializer
from utils.response import standard_response
from utils.exporters import export_to_pdf
from api.v1.v2_admin import _activity, _admin_user, _file_response, _now, _date
from api.v1.admin.views.dashboard import clear_dashboard_cache

User = get_user_model()

class AdminPaymentsView(generics.ListCreateAPIView):
    permission_classes = [HasAdminPermission("manage_payments")]
    serializer_class = PaymentSerializer
    pagination_class = AdminStandardPagination
    throttle_classes = [PaymentActionThrottle]
    # Note: status and method filters are handled manually in get_queryset
    # to normalize case (frontend sends lowercase, DB stores lowercase)

    def get_queryset(self):
        qs = Payment.objects.select_related("student", "membership", "membership__plan").all().order_by("-payment_date", "-id")
        # Normalize status filter — frontend sends lowercase, DB stores lowercase
        status_filter = self.request.query_params.get("status", "").lower()
        if status_filter:
            qs = qs.filter(status=status_filter)
        student_id = self.request.query_params.get("student_id")
        if student_id and student_id.strip():
            qs = qs.filter(student_id=student_id)
        method = self.request.query_params.get("method")
        if method and method.strip():
            qs = qs.filter(payment_mode=method)
        from rest_framework.exceptions import ValidationError
        from_date = self.request.query_params.get("from_date")
        if from_date and from_date.strip():
            try:
                qs = qs.filter(payment_date__gte=_date(from_date))
            except ValueError:
                raise ValidationError({"from_date": "Invalid date format. Use YYYY-MM-DD."})
        return qs

    def create(self, request, *args, **kwargs):
        # Validate amount before attempting Decimal conversion
        raw_amount = request.data.get("amount")
        try:
            amount = Decimal(str(raw_amount))
            if amount <= 0:
                return standard_response("error", "Amount must be greater than zero.", status_code=400)
        except Exception:
            return standard_response("error", "Invalid amount value.", status_code=400)

        student_id = request.data.get("student_id")
        if not student_id:
            return standard_response("error", "Student ID is required.", status_code=400)
            
        try:
            student = get_object_or_404(User, id=student_id, role="student")
        except (ValueError, TypeError):
            return standard_response("error", "Invalid Student ID format.", status_code=400)
            
        membership_id = request.data.get("membership_id")
        membership = None
        if membership_id:
            try:
                membership = Membership.objects.filter(id=membership_id).first()
            except (ValueError, TypeError):
                return standard_response("error", "Invalid Membership ID format.", status_code=400)
                
        payment_mode = request.data.get("payment_mode") or request.data.get("method", "Cash")
        
        payload = {
            "student": student.id,
            "membership": membership.id if membership else None,
            "amount": str(amount),
            "payment_mode": payment_mode,
            "method": payment_mode.upper().replace(" ", "_"),
            "transaction_id": request.data.get("transaction_id") or request.data.get("transaction_ref"),
            "transaction_ref": request.data.get("transaction_ref") or request.data.get("transaction_id"),
            "notes": request.data.get("notes"),
            "recorded_by": _admin_user(request).id,
            "paid_at": _now(),
            "status": "pending",
        }
        
        from django.db import transaction
        try:
            with transaction.atomic():
                serializer = self.get_serializer(data=payload)
                serializer.is_valid(raise_exception=True)
                payment = serializer.save()
        except Exception as e:
            logger.exception("Failed to record manual payment")
            return standard_response("error", "Failed to record payment due to a database error.", status_code=500)
            
        _activity(request, "RECORD_PAYMENT", "Payment", payment.id, f"Recorded payment {payment.payment_id}")

        try:
            from apps.notifications.models import AdminInboxNotification
            from api.v1.v2_admin import _full_name
            creator = _admin_user(request)
            creator_name = creator.username if creator else "Admin/Keeper"
            AdminInboxNotification.objects.create(
                type='PAYMENT',
                title='New Payment Recorded Manually',
                message=f"A payment of {payment.amount} for {_full_name(student)} was recorded by {creator_name}.",
                related_id=str(payment.id),
                student=student
            )
        except Exception:
            pass

        clear_dashboard_cache()
        return standard_response(data=self.get_serializer(payment).data, status_code=201)


class AdminPaymentDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [HasAdminPermission("manage_payments")]
    serializer_class = PaymentSerializer
    queryset = Payment.objects.all()
    throttle_classes = [PaymentActionThrottle]

    def retrieve(self, request, *args, **kwargs):
        return standard_response(data=self.get_serializer(self.get_object()).data)

    def update(self, request, *args, **kwargs):
        payment = self.get_object()
        serializer = self.get_serializer(payment, data=request.data, partial=True)
        if serializer.is_valid():
            payment = serializer.save()
            clear_dashboard_cache()
            return standard_response(data=self.get_serializer(payment).data)
        return standard_response("error", "Validation failed.", errors=serializer.errors, status_code=400)


class AdminPaymentActionView(APIView):
    permission_classes = [HasAdminPermission("manage_payments")]
    throttle_classes = [PaymentActionThrottle]

    def post(self, request, pk, action):
        from django.http import Http404
        from django.db import transaction
        try:
            with transaction.atomic():
                # Acquire database lock to prevent concurrent modifications
                payment = get_object_or_404(Payment.objects.select_for_update(), id=pk)
                if action == "verify":
                    payment.status = "verified"
                    payment.verified_by = _admin_user(request)
                    payment.verified_at = _now()
                    if payment.membership:
                        payment.membership.status = "active"
                        payment.membership.save()
                    event = "VERIFY_PAYMENT"
                elif action == "refund":
                    payment.status = "refunded"
                    try:
                        payment.refund_amount = Decimal(str(request.data.get("refund_amount", payment.amount)))
                    except Exception:
                        return standard_response("error", "Invalid refund amount.", status_code=400)
                    payment.refund_reason = request.data.get("refund_reason") or request.data.get("reason")
                    payment.refunded_at = _now()
                    event = "REFUND_PAYMENT"
                else:
                    return standard_response("error", "Unknown payment action.", status_code=404)
                payment.save()
        except Http404:
            raise
        except Exception as e:
            logger.exception("Failed to verify/refund payment")
            return standard_response("error", "Failed to update payment status due to a database error.", status_code=500)
            
        _activity(request, event, "Payment", payment.id, f"{event} {payment.payment_id}")
        clear_dashboard_cache()
        return standard_response(data=PaymentSerializer(payment).data)


class AdminPaymentReceiptView(APIView):
    permission_classes = [HasAdminPermission("manage_payments")]

    def get(self, request, pk):
        payment = get_object_or_404(Payment, id=pk)
        data = PaymentSerializer(payment).data
        receipt_text = (
            f"PAYMENT RECEIPT\n"
            f"{'=' * 40}\n"
            f"Receipt No : {data.get('payment_id') or data.get('id')}\n"
            f"Student    : {data.get('student_name')}\n"
            f"Plan       : {data.get('plan_name') or 'N/A'}\n"
            f"Amount     : {data.get('amount')}\n"
            f"Status     : {data.get('status', '').upper()}\n"
            f"Mode       : {data.get('payment_mode')}\n"
            f"Date       : {data.get('payment_date')}\n"
            f"Txn Ref    : {data.get('transaction_ref') or data.get('transaction_id') or 'N/A'}\n"
            f"Notes      : {data.get('notes') or 'N/A'}\n"
            f"{'=' * 40}\n"
        )
        return _file_response(export_to_pdf(receipt_text), f"{payment.payment_id or payment.id}.pdf", "application/pdf")


class AdminPaymentSpecialView(APIView):
    permission_classes = [HasAdminPermission("manage_payments")]
    throttle_classes = [PaymentActionThrottle]

    def get(self, request, kind):
        today = timezone.now().date()
        if kind == "summary":
            verified = Payment.objects.filter(status="verified")
            return standard_response(data={
                "today_amount": str(verified.filter(payment_date=today).aggregate(total=Sum("amount"))["total"] or 0),
                "today_count": verified.filter(payment_date=today).count(),
                "month_amount": str(verified.filter(payment_date__year=today.year, payment_date__month=today.month).aggregate(total=Sum("amount"))["total"] or 0),
                "year_amount": str(verified.filter(payment_date__year=today.year).aggregate(total=Sum("amount"))["total"] or 0),
                "pending_count": Payment.objects.filter(status="pending").count(),
            })
        if kind == "pending":
            qs = Payment.objects.filter(status="pending")
        else:
            # Overdue = pending payments not actioned within 3 days
            from datetime import timedelta
            overdue_cutoff = timezone.now() - timedelta(days=3)
            qs = Payment.objects.filter(status="pending", created_at__lte=overdue_cutoff)
        return standard_response(data=PaymentSerializer(qs.select_related("student", "membership", "membership__plan"), many=True).data)
