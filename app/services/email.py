from email.message import EmailMessage
import smtplib
from urllib.parse import urlencode

from app.core.config import get_settings

settings = get_settings()


def build_password_reset_link(token: str) -> str:
    query = urlencode({"token": token})
    separator = "&" if "?" in settings.password_reset_url_base else "?"
    return f"{settings.password_reset_url_base}{separator}{query}"


def send_password_reset_email(*, to_email: str, username: str, token: str) -> None:
    # Skip SMTP delivery in local dev/tests unless explicitly enabled.
    if not settings.password_reset_email_enabled:
        return

    reset_link = build_password_reset_link(token)
    message = EmailMessage()
    message["Subject"] = "Password reset request"
    message["From"] = settings.smtp_from_email
    message["To"] = to_email
    message.set_content(
        "\n".join(
            [
                f"Hello {username},",
                "",
                "We received a request to reset your password.",
                f"Open this link to set a new one (valid for {settings.password_reset_token_ttl_minutes} minutes):",
                reset_link,
                "",
                "If you did not request this, you can safely ignore this email.",
            ]
        )
    )

    if settings.smtp_security == "ssl":
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            if settings.smtp_user and settings.smtp_password:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(message)
        return

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        if settings.smtp_security == "starttls":
            smtp.starttls()
        if settings.smtp_user and settings.smtp_password:
            smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(message)
