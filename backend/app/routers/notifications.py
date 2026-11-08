from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import Message, NotificationList, NotificationOut
from app.services import notifications

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationList)
def list_notifications(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    items, unread = notifications.list_for(db, user.id)
    return NotificationList(items=[NotificationOut.model_validate(n) for n in items], unread=unread)


@router.post("/{notification_id}/read", response_model=Message)
def read_one(notification_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    notifications.mark_read(db, user.id, notification_id)
    return Message(detail="ok")


@router.post("/read-all", response_model=Message)
def read_all(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    notifications.mark_read(db, user.id)
    return Message(detail="ok")
