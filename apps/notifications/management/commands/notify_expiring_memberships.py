from django.core.management.base import BaseCommand
from django.utils import timezone
import datetime
from apps.memberships.models import Membership
from apps.notifications.models import Notification, StudentNotification
from utils.mail import send_stylish_email

class Command(BaseCommand):
    help = 'Sends alert emails to students whose memberships are expiring in 3 days, 1 day, or today'

    def handle(self, *args, **options):
        today = timezone.now().date()
        
        # 1. Expiring in 3 Days
        target_3_days = today + datetime.timedelta(days=3)
        memberships_3 = Membership.objects.filter(
            end_date=target_3_days,
            status='active'
        ).select_related('student', 'plan')
        
        for membership in memberships_3:
            student = membership.student
            if student.email:
                try:
                    send_stylish_email(
                        subject="Membership Expiring in 3 Days - Shresht Library",
                        to_email=student.email,
                        email_type="general_announcement",
                        context={
                            "title": "Membership Plan Expiring Soon",
                            "subtitle": f"Plan: {membership.plan.name}",
                            "body": f"Hello {student.first_name or student.username}, just a friendly reminder that your Shresht Library membership plan is expiring in 3 days on {membership.end_date.strftime('%B %d, %Y')}.",
                            "description": "Please renew your plan early to maintain uninterrupted seat reservations and facilities access.",
                            "link_button_text": "Renew Membership"
                        }
                    )
                    self.stdout.write(f"Sent 3-day warning to {student.email}")
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Failed to notify {student.email}: {e}"))

        # 2. Expiring in 1 Day
        target_1_day = today + datetime.timedelta(days=1)
        memberships_1 = Membership.objects.filter(
            end_date=target_1_day,
            status='active'
        ).select_related('student', 'plan')
        
        for membership in memberships_1:
            student = membership.student
            if student.email:
                try:
                    send_stylish_email(
                        subject="Membership Expiring Tomorrow! - Shresht Library",
                        to_email=student.email,
                        email_type="general_announcement",
                        context={
                            "title": "Membership Plan Expiring Tomorrow",
                            "subtitle": f"Plan: {membership.plan.name}",
                            "body": f"Hello {student.first_name or student.username}, this is an urgent reminder that your Shresht Library membership plan is expiring tomorrow on {membership.end_date.strftime('%B %d, %Y')}.",
                            "description": "If your plan expires, your assigned seat will automatically return to the general availability pool. Renew today to keep your seat.",
                            "link_button_text": "Renew Now"
                        }
                    )
                    self.stdout.write(f"Sent 1-day warning to {student.email}")
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Failed to notify {student.email}: {e}"))

        # 3. Expiring Today
        memberships_today = Membership.objects.filter(
            end_date=today,
            status='active'
        ).select_related('student', 'plan')
        
        for membership in memberships_today:
            student = membership.student
            
            # Update status or let a separate expiration cron do it; here we just notify
            title = "Your Membership Expired Today"
            body = f"Your Shresht Library membership ({membership.plan.name}) has expired today, {today.strftime('%B %d, %Y')}."
            
            # Create system notification
            notification = Notification.objects.create(
                title=title,
                body=body,
                type="PLAN_EXPIRY",
                target="INDIVIDUAL",
                target_group="expired",
                send_push=True,
                send_email=True,
                sent_at=timezone.now()
            )
            StudentNotification.objects.create(
                student=student,
                notification=notification,
                push_delivered=True,
                email_delivered=True
            )
            
            if student.email:
                try:
                    send_stylish_email(
                        subject="Membership Expired Today - Shresht Library",
                        to_email=student.email,
                        email_type="general_announcement",
                        context={
                            "title": title,
                            "subtitle": f"Plan: {membership.plan.name}",
                            "body": f"Hello {student.first_name or student.username}, your membership plan has officially expired today.",
                            "description": "Your assigned seat allocation has been released. Please purchase a new membership plan immediately to regain booking permissions.",
                            "link_button_text": "Purchase Plan"
                        }
                    )
                    self.stdout.write(f"Sent expiration alert to {student.email}")
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Failed to notify {student.email}: {e}"))

        self.stdout.write(self.style.SUCCESS("Expiring membership check completed successfully."))
