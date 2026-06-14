import threading
import logging
from django.core.mail import EmailMultiAlternatives
from django.utils.html import strip_tags
from django.conf import settings

logger = logging.getLogger(__name__)

# Base HTML Wrapper for consistent, stylish branding
BASE_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f3f4f6;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
        }}
        .wrapper {{
            background-color: #f3f4f6;
            padding: 40px 20px;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            border: 1px solid #e5e7eb;
        }}
        .header {{
            background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
            padding: 32px;
            text-align: center;
        }}
        .header h1 {{
            color: #ffffff;
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.025em;
        }}
        .header p {{
            color: #e0e7ff;
            margin: 4px 0 0 0;
            font-size: 14px;
        }}
        .content {{
            padding: 32px;
            color: #374151;
            line-height: 1.6;
        }}
        .content h2 {{
            color: #111827;
            margin-top: 0;
            font-size: 20px;
            font-weight: 600;
        }}
        .btn {{
            display: inline-block;
            background-color: #4f46e5;
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
        }}
        .btn:hover {{
            background-color: #4338ca;
        }}
        .detail-card {{
            background-color: #f9fafb;
            border: 1px solid #f3f4f6;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }}
        .detail-row {{
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
        }}
        .detail-row:last-child {{
            margin-bottom: 0;
        }}
        .detail-label {{
            color: #6b7280;
            font-weight: 500;
        }}
        .detail-value {{
            color: #1f2937;
            font-weight: 600;
            text-align: right;
        }}
        .otp-code {{
            background-color: #f3f4f6;
            border: 2px dashed #6366f1;
            border-radius: 12px;
            padding: 16px;
            text-align: center;
            font-size: 32px;
            font-weight: 800;
            letter-spacing: 0.25em;
            color: #4f46e5;
            margin: 24px 0;
        }}
        .footer {{
            background-color: #f9fafb;
            padding: 24px;
            text-align: center;
            border-top: 1px solid #f3f4f6;
            color: #9ca3af;
            font-size: 12px;
        }}
        .footer a {{
            color: #6366f1;
            text-decoration: none;
        }}
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1>Shresht Library</h1>
                <p>Digital Library Management System</p>
            </div>
            <div class="content">
                {content_body}
            </div>
            <div class="footer">
                &copy; {year} Shresht Library. All rights reserved.<br>
                Need help? Contact us or visit our <a href="{website_url}">website</a>.
            </div>
        </div>
    </div>
</body>
</html>
"""

def _send_email_thread(email):
    """Target function for sending email asynchronously in a background thread."""
    try:
        email.send()
        logger.info(f"Successfully sent email to {email.to}")
    except Exception as e:
        logger.error(f"Failed to send email to {email.to}: {e}", exc_info=True)

def send_stylish_email(subject, to_email, email_type, context):
    """
    Sends a beautifully formatted HTML email based on the email_type.
    Runs asynchronously in a background thread to prevent blocking main process.
    """
    import datetime
    current_year = datetime.datetime.now().year
    website_url = settings.MEDIA_URL  # Fallback to site link or dynamic config if available

    content_body = ""
    title = subject

    if email_type == "welcome":
        name = context.get("name", "Student")
        username = context.get("username", "your registered email/mobile")
        content_body = f"""
            <h2>Welcome to Shresht Library!</h2>
            <p>Hello {name},</p>
            <p>Thank you for registering an account with Shresht Library. We are thrilled to have you join our digital reading and learning community.</p>
            <div class="detail-card">
                <div class="detail-row">
                    <span class="detail-label">Username / Identity</span>
                    <span class="detail-value">{username}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status</span>
                    <span class="detail-value" style="color: #059669;">Registered</span>
                </div>
            </div>
            <p>You can now check in to the library, select membership plans, book your study seat, and track your attendance directly from your dashboard.</p>
            <p>If you have any questions or need assistance, feel free to reach out to library support.</p>
        """

    elif email_type == "forgot_password":
        name = context.get("name", "Student")
        code = context.get("code", "")
        content_body = f"""
            <h2>Password Reset Request</h2>
            <p>Hello {name},</p>
            <p>We received a request to reset the password for your Shresht Library account. Use the following validation token to verify your identity and set a new password:</p>
            <div class="otp-code">{code}</div>
            <p>This validation token is valid for <strong>1 hour</strong>. If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
        """

    elif email_type == "payment_receipt":
        name = context.get("name", "Student")
        payment_id = context.get("payment_id", "N/A")
        amount = context.get("amount", "0.00")
        plan_name = context.get("plan_name", "Library Plan")
        payment_mode = context.get("payment_mode", "Online")
        date_str = context.get("date", "Today")
        
        content_body = f"""
            <h2>Payment Verified Successfully!</h2>
            <p>Hello {name},</p>
            <p>Great news! Your payment of <strong>₹{amount}</strong> has been verified by the administrator, and your membership plan is now active.</p>
            <div class="detail-card">
                <div class="detail-row">
                    <span class="detail-label">Receipt ID</span>
                    <span class="detail-value">{payment_id}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Plan Name</span>
                    <span class="detail-value">{plan_name}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Amount Paid</span>
                    <span class="detail-value">₹{amount}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Payment Method</span>
                    <span class="detail-value">{payment_mode}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Payment Date</span>
                    <span class="detail-value">{date_str}</span>
                </div>
            </div>
            <p>You can now utilize your seat reservation and access library amenities during your active session times. Your digital invoice PDF is attached or available in your profile dashboard.</p>
        """

    elif email_type == "payment_refund":
        name = context.get("name", "Student")
        payment_id = context.get("payment_id", "N/A")
        refund_amount = context.get("refund_amount", "0.00")
        reason = context.get("reason", "Requested by user")
        date_str = context.get("date", "Today")
        
        content_body = f"""
            <h2>Refund Processed</h2>
            <p>Hello {name},</p>
            <p>A refund has been processed for your payment. Please find the receipt details below:</p>
            <div class="detail-card">
                <div class="detail-row">
                    <span class="detail-label">Receipt ID</span>
                    <span class="detail-value">{payment_id}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Refunded Amount</span>
                    <span class="detail-value">₹{refund_amount}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Reason</span>
                    <span class="detail-value">{reason}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Date Processed</span>
                    <span class="detail-value">{date_str}</span>
                </div>
            </div>
            <p>Refunds generally take 5-7 business days to reflect in your original payment source. If you have questions, please reach out to admin support.</p>
        """

    elif email_type == "seat_assignment":
        name = context.get("name", "Student")
        seat_number = context.get("seat_number", "")
        floor = context.get("floor", "")
        row = context.get("row", "")
        date_str = context.get("date", "Today")
        
        content_body = f"""
            <h2>Study Seat Assigned!</h2>
            <p>Hello {name},</p>
            <p>You have been assigned a designated study seat in Shresht Library. Here are your seat reservation details:</p>
            <div class="detail-card">
                <div class="detail-row">
                    <span class="detail-label">Seat Number</span>
                    <span class="detail-value" style="font-size: 18px; color: #4f46e5;">{seat_number}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Row</span>
                    <span class="detail-value">{row}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Floor</span>
                    <span class="detail-value">{floor}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Assignment Date</span>
                    <span class="detail-value">{date_str}</span>
                </div>
            </div>
            <p>Please sit only at your assigned seat. Remember to scan your QR code at the library entrance to check in and record your attendance.</p>
        """

    elif email_type == "general_announcement":
        title = context.get("title", subject)
        subtitle = context.get("subtitle", "")
        body = context.get("body", "")
        description = context.get("description", "")
        link_url = context.get("link_url", "")
        link_button_text = context.get("link_button_text", "View Details")
        
        button_html = ""
        if link_url:
            button_html = f'<div style="text-align: center;"><a href="{link_url}" class="btn">{link_button_text}</a></div>'
            
        desc_html = ""
        if description:
            desc_html = f'<div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #f3f4f6; color: #4b5563; font-size: 14px;">{description}</div>'

        content_body = f"""
            <h2>{title}</h2>
            {f'<p style="color: #6b7280; font-size: 16px; font-weight: 500; margin-top: -8px;">{subtitle}</p>' if subtitle else ''}
            <p>{body}</p>
            {button_html}
            {desc_html}
        """

    else:
        # Fallback generic email
        body = context.get("body", "")
        content_body = f"""
            <h2>Notification Alert</h2>
            <p>{body}</p>
        """

    # Format the complete HTML template
    html_content = BASE_TEMPLATE.format(
        title=title,
        content_body=content_body,
        year=current_year,
        website_url=website_url
    )

    # Plain text fallback
    text_content = strip_tags(html_content)

    # Create the email message
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@shreshtlibrary.com')
    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=from_email,
        to=[to_email]
    )
    email.attach_alternative(html_content, "text/html")

    # Start the async thread
    thread = threading.Thread(target=_send_email_thread, args=(email,))
    thread.daemon = True
    thread.start()
