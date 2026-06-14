import logging
from django.db.models import Sum, Count, Q
from django.utils import timezone
from django.core.cache import cache
from rest_framework import generics, status
from rest_framework.views import APIView
import datetime

logger = logging.getLogger(__name__)

from apps.students.models import StudentProfile
from apps.attendance.models import Attendance
from apps.payments.models import Payment
from apps.seats.models import Seat
from apps.memberships.models import Membership, MembershipPlan
from apps.notifications.models import AdminInboxNotification
from shreshtlibrary.utils.permissions import IsLibraryAdmin
from utils.response import standard_response
from api.v1.v2_admin import _full_name

def clear_dashboard_cache():
    """Utility to clear all dashboard stats and chart cache keys."""
    today = timezone.now().date()
    stats_sections = ["students", "attendance/today", "payments/today", "payments/month", "memberships", "seats", "overview"]
    for section in stats_sections:
        cache.delete(f"dashboard_stats_{section}_{today}")
    
    chart_domains = ["attendance", "revenue", "students", "memberships", "seats"]
    for domain in chart_domains:
        for chart in ["overview", "daily", "monthly", "stats", "all"]:
            cache.delete(f"dashboard_chart_{domain}_{chart}_{today}")

class DashboardStatsView(APIView):
    permission_classes = [IsLibraryAdmin]

    def get(self, request, section="overview"):
        today = timezone.now().date()
        cache_key = f"dashboard_stats_{section}_{today}"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return standard_response(data=cached_data)

        total_students = StudentProfile.objects.count()
        present = Attendance.objects.filter(date=today, is_present=True).count()
        
        is_pending_period = False
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
            logger.warning(f"Error parsing pending period for dashboard stats: {e}")

        data = {}
        if section == "students":
            counts = StudentProfile.objects.aggregate(
                total=Count('id'),
                live=Count('id', filter=Q(status='LIVE')),
                expired=Count('id', filter=Q(status='EXPIRED')),
                suspended=Count('id', filter=Q(status='SUSPENDED')),
                girls=Count('id', filter=Q(gender__iexact='Female')),
                boys=Count('id', filter=Q(gender__iexact='Male')),
            )
            data = {
                "total": counts["total"],
                "live": counts["live"],
                "expired": counts["expired"],
                "suspended": counts["suspended"],
                "girls": counts["girls"],
                "boys": counts["boys"],
                "other": max(counts["total"] - counts["girls"] - counts["boys"], 0)
            }
        elif section == "attendance/today":
            pending = max(total_students - present, 0) if is_pending_period else 0
            absent = 0 if is_pending_period else max(total_students - present, 0)
            data = {"today_present": present, "today_absent": absent, "today_pending": pending, "today_total": total_students, "today_percentage": round((present / total_students * 100), 2) if total_students else 0}
        elif section == "payments/today":
            payments_today = Payment.objects.filter(payment_date=today, status="verified")
            data = {"today_amount": str(payments_today.aggregate(total=Sum("amount"))["total"] or 0), "today_count": payments_today.count()}
        elif section == "payments/month":
            payments_month = Payment.objects.filter(payment_date__year=today.year, payment_date__month=today.month, status="verified")
            data = {"month_amount": str(payments_month.aggregate(total=Sum("amount"))["total"] or 0), "month_count": payments_month.count()}
        elif section == "memberships":
            data = {"active": Membership.objects.filter(status="active").count(), "expiring_in_7_days": Membership.objects.filter(end_date__lte=today + datetime.timedelta(days=7), end_date__gte=today).count(), "expired_today": Membership.objects.filter(end_date=today).count()}
        elif section == "seats":
            seat_counts = Seat.objects.aggregate(
                total=Count('id'),
                occupied=Count('id', filter=Q(status='occupied')),
                available=Count('id', filter=Q(status='available')),
                reserved=Count('id', filter=Q(status='reserved')),
            )
            data = {
                "total": seat_counts["total"],
                "occupied": seat_counts["occupied"],
                "available": seat_counts["available"],
                "reserved": seat_counts["reserved"],
            }
        else:
            payments_today = Payment.objects.filter(payment_date=today, status="verified")
            payments_month = Payment.objects.filter(payment_date__year=today.year, payment_date__month=today.month, status="verified")
            
            counts = StudentProfile.objects.aggregate(
                total=Count('id'),
                live=Count('id', filter=Q(status='LIVE')),
                expired=Count('id', filter=Q(status='EXPIRED')),
                suspended=Count('id', filter=Q(status='SUSPENDED')),
                new_this_month=Count('id', filter=Q(created_at__year=today.year, created_at__month=today.month)),
                girls=Count('id', filter=Q(gender__iexact='Female')),
                boys=Count('id', filter=Q(gender__iexact='Male')),
            )
            
            seat_counts = Seat.objects.aggregate(
                total=Count('id'),
                occupied=Count('id', filter=Q(status='occupied')),
                available=Count('id', filter=Q(status='available')),
                reserved=Count('id', filter=Q(status='reserved')),
            )
            
            pending = max(total_students - present, 0) if is_pending_period else 0
            absent = 0 if is_pending_period else max(total_students - present, 0)
            
            data = {
                "students": {
                    "total": counts["total"], 
                    "live": counts["live"], 
                    "expired": counts["expired"], 
                    "suspended": counts["suspended"], 
                    "new_this_month": counts["new_this_month"],
                    "girls": counts["girls"],
                    "boys": counts["boys"],
                    "other": max(counts["total"] - counts["girls"] - counts["boys"], 0)
                },
                "attendance": {
                    "today_present": present, 
                    "today_absent": absent, 
                    "today_pending": pending,
                    "today_total": total_students, 
                    "today_percentage": round((present / total_students * 100), 2) if total_students else 0
                },
                "payments": {"today_amount": str(payments_today.aggregate(total=Sum("amount"))["total"] or 0), "today_count": payments_today.count(), "month_amount": str(payments_month.aggregate(total=Sum("amount"))["total"] or 0), "month_count": payments_month.count(), "pending_count": Payment.objects.filter(status="pending").count()},
                "memberships": {"active": Membership.objects.filter(status="active").count(), "expiring_in_7_days": Membership.objects.filter(end_date__lte=today + datetime.timedelta(days=7), end_date__gte=today).count(), "expired_today": Membership.objects.filter(end_date=today).count()},
                "seats": {
                    "total": seat_counts["total"],
                    "occupied": seat_counts["occupied"],
                    "available": seat_counts["available"],
                    "reserved": seat_counts["reserved"],
                },
                "notifications": {"sent_today": Notification.objects.filter(sent_at__date=today).count(), "unread_count": StudentNotification.objects.filter(is_read=False).count()},
            }
        
        cache.set(cache_key, data, timeout=300) # Cache for 5 minutes
        return standard_response(data=data)

class DashboardChartView(APIView):
    permission_classes = [IsLibraryAdmin]

    def get(self, request, domain, chart):
        today = timezone.now().date()
        cache_key = f"dashboard_chart_{domain}_{chart}_{today}"
        cached_data = cache.get(cache_key)

        if cached_data:
            return standard_response(data=cached_data)

        if domain == "attendance":
            labels, present = [], []
            start_date = today - datetime.timedelta(days=13)
            attendance_counts = dict(
                Attendance.objects.filter(
                    date__gte=start_date, date__lte=today, is_present=True
                )
                .values('date')
                .annotate(count=Count('id'))
                .values_list('date', 'count')
            )
            for offset in range(13, -1, -1):
                day = today - datetime.timedelta(days=offset)
                labels.append(day.strftime("%d %b"))
                present.append(attendance_counts.get(day, 0))
            data = {"labels": labels, "present": present, "total_students": StudentProfile.objects.count()}
        elif domain == "revenue":
            labels, revenue = [], []
            start_month = (today.replace(day=1) - datetime.timedelta(days=11 * 30)).replace(day=1)
            payments = Payment.objects.filter(
                payment_date__gte=start_month,
                payment_date__lte=today,
                status="verified"
            ).values('payment_date', 'amount')
            
            revenue_by_month = {}
            for pay in payments:
                pdate = pay['payment_date']
                key = (pdate.year, pdate.month)
                revenue_by_month[key] = revenue_by_month.get(key, 0) + float(pay['amount'] or 0)
                
            for offset in range(11, -1, -1):
                month = (today.replace(day=1) - datetime.timedelta(days=offset * 30)).replace(day=1)
                labels.append(month.strftime("%b %Y"))
                key = (month.year, month.month)
                revenue.append(revenue_by_month.get(key, 0.0))
            data = {"labels": labels, "revenue": revenue, "payment_count": []}
        elif domain == "students":
            data = {"items": list(StudentProfile.objects.values("goal").annotate(count=Count("id")).order_by("goal"))}
        elif domain == "memberships":
            active_counts = dict(
                Membership.objects.filter(status="active")
                .values("plan_id")
                .annotate(count=Count("id"))
                .values_list("plan_id", "count")
            )
            items = []
            for plan in MembershipPlan.objects.all():
                items.append({
                    "name": plan.name,
                    "active": active_counts.get(plan.id, 0)
                })
            data = {"items": items}
        elif domain == "seats":
            data = {"items": list(Seat.objects.values("floor", "status").annotate(count=Count("id")))}
        else:
            data = {"items": []}
            
        cache.set(cache_key, data, timeout=300)
        return standard_response(data=data)

class AdminInboxView(APIView):
    permission_classes = [IsLibraryAdmin]

    def get(self, request):
        today = timezone.now().date()
        
        # Implement a cache-based concurrency lock to avoid duplicate notification generation
        lock_key = "admin_inbox_notifications_lock"
        lock_acquired = cache.add(lock_key, "locked", timeout=15)
        
        if lock_acquired:
            try:
                # Auto-generate EXPIRING_SOON notifications
                # Capture memberships expiring between tomorrow and 3 days from now
                expiring_memberships = Membership.objects.filter(
                    end_date__lte=today + datetime.timedelta(days=3),
                    end_date__gt=today,
                    status='active'
                ).select_related('student')
                
                # Auto-generate EXPIRED notifications
                # Capture memberships that have expired today or earlier, but are still marked active
                expired_memberships = Membership.objects.filter(
                    end_date__lte=today,
                    status='active'
                ).select_related('student')

                # Gather target related_ids to check for existence in a single query
                expiring_related_ids = [f"exp_{mem.student_id}_{mem.end_date}" for mem in expiring_memberships]
                expired_related_ids = [f"expired_{mem.student_id}_{mem.end_date}" for mem in expired_memberships]
                all_related_ids = expiring_related_ids + expired_related_ids
                
                existing_related_ids = set(
                    AdminInboxNotification.objects.filter(
                        type__in=['EXPIRING_SOON', 'EXPIRED'],
                        related_id__in=all_related_ids
                      ).values_list('related_id', flat=True)
                ) if all_related_ids else set()

                notifications_to_create = []

                for mem in expiring_memberships:
                    related_id = f"exp_{mem.student_id}_{mem.end_date}"
                    if related_id not in existing_related_ids:
                        notifications_to_create.append(
                            AdminInboxNotification(
                                type='EXPIRING_SOON',
                                title='Student Plan Expiring Soon',
                                message=f"Membership for {_full_name(mem.student)} is expiring on {mem.end_date}.",
                                related_id=related_id,
                                student=mem.student
                            )
                        )
                        
                for mem in expired_memberships:
                    related_id = f"expired_{mem.student_id}_{mem.end_date}"
                    if related_id not in existing_related_ids:
                        notifications_to_create.append(
                            AdminInboxNotification(
                                type='EXPIRED',
                                title='Student Plan Expired',
                                message=f"Membership for {_full_name(mem.student)} expired on {mem.end_date}.",
                                related_id=related_id,
                                student=mem.student
                            )
                        )
                        
                if notifications_to_create:
                    AdminInboxNotification.objects.bulk_create(notifications_to_create)
            finally:
                cache.delete(lock_key)
                
        # Limit to last 100 notifications to prevent memory exhaustion and DoS
        notifications = AdminInboxNotification.objects.select_related('student', 'student__student_profile').all().order_by('-created_at')[:100]
        
        data = []
        for n in notifications:
            student_name = _full_name(n.student) if n.student else None
            student_avatar = None
            if n.student and hasattr(n.student, 'student_profile') and n.student.student_profile.profile_photo:
                student_avatar = request.build_absolute_uri(n.student.student_profile.profile_photo.url)
                
            data.append({
                'id': n.id,
                'title': n.title,
                'message': n.message,
                'type': n.type,
                'is_read': n.is_read,
                'created_at': n.created_at,
                'related_id': n.related_id,
                'student_id': n.student.id if n.student else None,
                'student_name': student_name,
                'student_avatar': student_avatar
            })
            
        return standard_response(data=data)

class AdminInboxNotificationDetailView(APIView):
    permission_classes = [IsLibraryAdmin]

    def post(self, request, pk, action):
        notification = AdminInboxNotification.objects.filter(id=pk).first()
        if not notification:
            return standard_response('error', 'Notification not found', status_code=404)
            
        if action == 'read':
            notification.is_read = True
            notification.save()
            return standard_response(message='Notification marked as read')
        elif action == 'unread':
            notification.is_read = False
            notification.save()
            return standard_response(message='Notification marked as unread')
            
        return standard_response('error', 'Invalid action', status_code=400)
        
    def delete(self, request, pk):
        notification = AdminInboxNotification.objects.filter(id=pk).first()
        if notification:
            notification.delete()
        return standard_response(message='Notification deleted')
