from sqlalchemy.orm import Session

from app.models import AuditLog


def record(
    db: Session,
    action: str,
    actor_id: int | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
    detail: str | None = None,
    ip: str | None = None,
) -> None:
    """Add an audit entry to the current transaction (caller commits).

    `detail` must never contain clinical content or secrets.
    """
    db.add(
        AuditLog(
            actor_user_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            detail=(detail or None) and detail[:500],
            ip_address=ip,
        )
    )
