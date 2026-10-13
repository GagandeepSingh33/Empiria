from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    Notification,
)
from app.security import (
    require_authenticated,
    CurrentUser,
)

router = APIRouter(tags=["Persistent In-App Notifications"])


class NotificationResponse(BaseModel):
    id: str
    institution_id: str
    notification_type: str
    conversation_id: str | None
    message_id: str | None
    title: str
    is_read: bool
    read_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    unread_count: int
    notifications: list[NotificationResponse]


@router.get("/notifications", response_model=NotificationListResponse)
def get_user_notifications(
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    if not current_user.active_membership:
        return NotificationListResponse(unread_count=0, notifications=[])

    mem_id = current_user.active_membership.id

    notifs = (
        db.query(Notification)
        .filter(
            Notification.institution_id == current_user.institution_id,
            Notification.recipient_membership_id == mem_id,
        )
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )

    unread_count = (
        db.query(Notification)
        .filter(
            Notification.institution_id == current_user.institution_id,
            Notification.recipient_membership_id == mem_id,
            Notification.is_read.is_(False),
        )
        .count()
    )

    return NotificationListResponse(
        unread_count=unread_count,
        notifications=[
            NotificationResponse(
                id=n.id,
                institution_id=n.institution_id,
                notification_type=n.notification_type,
                conversation_id=n.conversation_id,
                message_id=n.message_id,
                title=n.title,
                is_read=n.is_read,
                read_at=n.read_at,
                created_at=n.created_at,
            )
            for n in notifs
        ],
    )


@router.patch("/notifications/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    if not current_user.active_membership:
        raise HTTPException(status_code=404, detail="Notification not found")

    mem_id = current_user.active_membership.id

    notif = (
        db.query(Notification)
        .filter(
            Notification.institution_id == current_user.institution_id,
            Notification.id == notification_id,
            Notification.recipient_membership_id == mem_id,
        )
        .first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    notif.read_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(notif)

    return NotificationResponse(
        id=notif.id,
        institution_id=notif.institution_id,
        notification_type=notif.notification_type,
        conversation_id=notif.conversation_id,
        message_id=notif.message_id,
        title=notif.title,
        is_read=notif.is_read,
        read_at=notif.read_at,
        created_at=notif.created_at,
    )


@router.post("/notifications/mark-all-read")
def mark_all_notifications_read(
    current_user: CurrentUser = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    if not current_user.active_membership:
        return {"message": "All notifications marked as read"}

    mem_id = current_user.active_membership.id
    now = datetime.now(timezone.utc)

    db.query(Notification).filter(
        Notification.institution_id == current_user.institution_id,
        Notification.recipient_membership_id == mem_id,
        Notification.is_read.is_(False),
    ).update(
        {"is_read": True, "read_at": now},
        synchronize_session=False,
    )
    db.commit()

    return {"message": "All notifications marked as read"}
