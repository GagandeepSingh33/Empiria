"""Local mail adapter and notification dispatcher for Empiria.

In production environments, email delivery relies on configured external SMTP / SES adapters.
In development and test environments, this adapter captures outbound emails in an in-memory
outbox and logs structured events, enabling automated assertions on token delivery,
recovery URLs, and recipient addresses without external mail server dependencies.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, List
import logging

logger = logging.getLogger("empiria.mail")


@dataclass
class OutboundEmail:
    recipient: str
    subject: str
    body: str
    purpose: str
    token: Optional[str] = None
    action_url: Optional[str] = None
    role: Optional[str] = None
    institution_name: Optional[str] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class LocalMailAdapter:
    """In-memory test mail adapter that records sent emails and logs delivery."""

    def __init__(self):
        self._outbox: List[OutboundEmail] = []

    @property
    def outbox(self) -> List[OutboundEmail]:
        """Return a copy of all recorded outbound emails."""
        return list(self._outbox)

    def clear(self) -> None:
        """Clear all messages from the in-memory outbox."""
        self._outbox.clear()

    def clear_outbox(self) -> None:
        """Alias for clearing outbox in test suites."""
        self.clear()

    def get_outbox(self) -> List[dict]:
        """Return structured representations of outbound emails for testing."""
        return [
            {
                "recipient": m.recipient,
                "subject": m.subject,
                "body": m.body,
                "purpose": m.purpose,
                "token": m.token,
                "action_url": m.action_url,
                "role": m.role,
                "institution_name": m.institution_name,
                "timestamp": m.created_at.isoformat(),
            }
            for m in self._outbox
        ]

    def get_latest_email(self) -> Optional[dict]:
        """Return the most recently recorded email message."""
        if not self._outbox:
            return None
        last = self._outbox[-1]
        return {
            "recipient": last.recipient,
            "subject": last.subject,
            "purpose": last.purpose,
            "token": last.token,
            "role": last.role,
            "institution_name": last.institution_name,
            "timestamp": last.created_at.isoformat(),
        }

    def send_password_reset_email(self, recipient: str, token: str, reset_url: str) -> OutboundEmail:
        """Record and log an account password recovery email."""
        subject = "EMPIRIA Platform — Password Recovery Request"
        body = (
            f"A password reset was requested for your EMPIRIA account.\n\n"
            f"Use the following one-time recovery token to reset your password:\n"
            f"Token: {token}\n\n"
            f"Direct link: {reset_url}\n\n"
            f"This link and token will expire in 1 hour. If you did not request this, please disregard."
        )
        msg = OutboundEmail(
            recipient=recipient,
            subject=subject,
            body=body,
            purpose="credential_recovery",
            token=token,
            action_url=reset_url,
        )
        self._outbox.append(msg)
        logger.info(
            f"[TEST-MAIL-ADAPTER] Dispatched password reset email to {recipient} with token {token[:8]}..."
        )
        return msg

    def send_invitation_email(
        self,
        recipient: str,
        token: str,
        invite_url: str,
        role: str,
        institution_name: str,
    ) -> OutboundEmail:
        """Record and log an institutional membership onboarding invitation email."""
        subject = f"EMPIRIA Platform — Invitation to join {institution_name}"
        body = (
            f"You have been invited to join {institution_name} on EMPIRIA as a {role}.\n\n"
            f"To activate your account and verify your institutional membership, visit:\n"
            f"Invitation link: {invite_url}\n"
            f"Invitation token: {token}\n\n"
            f"This invitation is single-use and will expire in 7 days."
        )
        msg = OutboundEmail(
            recipient=recipient,
            subject=subject,
            body=body,
            purpose="membership_invitation",
            token=token,
            action_url=invite_url,
            role=role,
            institution_name=institution_name,
        )
        self._outbox.append(msg)
        logger.info(
            f"[TEST-MAIL-ADAPTER] Dispatched invitation email to {recipient} for {institution_name} ({role})"
        )
        return msg

    def get_latest_for_recipient(self, recipient: str) -> Optional[OutboundEmail]:
        """Find the most recent email dispatched to a specific recipient address."""
        for msg in reversed(self._outbox):
            if msg.recipient.lower() == recipient.lower():
                return msg
        return None


# Global singleton instance for local mail delivery
mail_adapter = LocalMailAdapter()
