from collections.abc import Callable

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.permissions import Perm, has
from app.core.security import decode_access_token
from app.db import get_db
from app.models import Doctor, Patient, Role, User


def client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(get_settings().cookie_name)
    payload = decode_access_token(token) if token else None
    if not payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    if user.role == Role.doctor and not (user.doctor and user.doctor.is_approved):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Doctor account pending approval")
    return user


def require_roles(*roles: Role) -> Callable[[User], User]:
    def _dep(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
        return user

    return _dep


def require_perm(perm: Perm) -> Callable[[User], User]:
    """Endpoint guard by permission (see app/core/permissions.py)."""

    def _dep(user: User = Depends(get_current_user)) -> User:
        if not has(user.role, perm):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
        return user

    return _dep


def current_patient(user: User = Depends(require_roles(Role.patient))) -> Patient:
    if not user.patient:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Patient profile missing")
    return user.patient


def current_doctor(user: User = Depends(require_roles(Role.doctor))) -> Doctor:
    return user.doctor  # approval already enforced in get_current_user


require_admin = require_roles(Role.admin)
require_lab = require_perm(Perm.lab_orders)
