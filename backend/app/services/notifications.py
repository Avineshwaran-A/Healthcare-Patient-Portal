from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.models import Notification


def notify(db: Session, user_id: int, title: str, message: str, link: str | None = None) -> None:
    """Queue an in-app notification in the current transaction (caller commits).

    Delivery channels (email/SMS) can be added here later without touching callers.
    """
    db.add(Notification(user_id=user_id, title=title[:150], message=message[:500], link=link))


def list_for(db: Session, user_id: int, limit: int = 20) -> tuple[list[Notification], int]:
    items = db.scalars(
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .limit(limit)
    ).all()
    unread = db.scalar(
        select(func.count()).where(Notification.user_id == user_id, Notification.is_read.is_(False))
    )
    return list(items), unread or 0


def mark_read(db: Session, user_id: int, notification_id: int | None = None) -> None:
    stmt = update(Notification).where(Notification.user_id == user_id)
    if notification_id is not None:
        stmt = stmt.where(Notification.id == notification_id)
    db.execute(stmt.values(is_read=True))
    db.commit()
