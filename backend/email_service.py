"""
Email service for sending staff invitations
Supports console logging (development) and SMTP (production)
"""

import os
from typing import Optional
from datetime import datetime

# Email configuration
EMAIL_MODE = os.getenv("EMAIL_MODE", "console")  # "console" or "smtp"
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@rotaapp.com")

# Business configuration (should be stored in database eventually)
BUSINESS_NAME = os.getenv("BUSINESS_NAME", "Your Business")
APP_URL = os.getenv("APP_URL", "http://localhost:8000")


def send_invitation_email(staff_name: str, email: str, token: str) -> bool:
    """
    Send invitation email to staff member

    Args:
        staff_name: Name of the staff member
        email: Email address to send to
        token: Unique invitation token

    Returns:
        bool: True if email sent successfully, False otherwise
    """

    invitation_url = f"{APP_URL}/static/accept-invitation.html?token={token}"

    subject = f"You've been invited to join {BUSINESS_NAME} Staff Portal"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Welcome to {BUSINESS_NAME}!</h1>
            </div>
            <div class="content">
                <p>Hi <strong>{staff_name}</strong>,</p>

                <p>You've been invited to join the staff portal for <strong>{BUSINESS_NAME}</strong>.</p>

                <p>Click the button below to set your password and access your account:</p>

                <div style="text-align: center;">
                    <a href="{invitation_url}" class="button">Accept Invitation</a>
                </div>

                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background: #fff; padding: 10px; border-radius: 5px;">
                    {invitation_url}
                </p>

                <p><strong>⏰ This invitation expires in 7 days.</strong></p>

                <p>If you have any questions, please contact your manager.</p>

                <p>Best regards,<br>{BUSINESS_NAME} Team</p>
            </div>
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Welcome to {BUSINESS_NAME}!

    Hi {staff_name},

    You've been invited to join the staff portal for {BUSINESS_NAME}.

    Click the link below to set your password and access your account:
    {invitation_url}

    This invitation expires in 7 days.

    If you have any questions, please contact your manager.

    Best regards,
    {BUSINESS_NAME} Team
    """

    if EMAIL_MODE == "console":
        return _send_console_email(email, subject, text_body, html_body, invitation_url)
    elif EMAIL_MODE == "smtp":
        return _send_smtp_email(email, subject, text_body, html_body)
    else:
        print(f"Unknown email mode: {EMAIL_MODE}")
        return False


def _send_console_email(to_email: str, subject: str, text_body: str, html_body: str, invitation_url: str) -> bool:
    """
    Console logging mode for development
    Prints email details to console instead of sending
    """
    print("\n" + "="*80)
    print("📧 EMAIL (Console Mode - Not Actually Sent)")
    print("="*80)
    print(f"To: {to_email}")
    print(f"Subject: {subject}")
    print(f"\nInvitation Link: {invitation_url}")
    print(f"\n--- Text Body ---")
    print(text_body)
    print("="*80 + "\n")
    return True


def _send_smtp_email(to_email: str, subject: str, text_body: str, html_body: str) -> bool:
    """
    SMTP mode for production
    Actually sends email via configured SMTP server
    """
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email

        # Attach both text and HTML versions
        part1 = MIMEText(text_body, 'plain')
        part2 = MIMEText(html_body, 'html')
        msg.attach(part1)
        msg.attach(part2)

        # Send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)

        print(f"✓ Email sent successfully to {to_email}")
        return True

    except Exception as e:
        print(f"✗ Failed to send email to {to_email}: {e}")
        return False


def send_invitation_resend_email(staff_name: str, email: str, token: str) -> bool:
    """
    Send resend invitation email (same as original, could customize message)
    """
    return send_invitation_email(staff_name, email, token)
