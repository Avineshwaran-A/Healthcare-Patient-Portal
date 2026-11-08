import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import DUMMY_HASH, create_access_token, hash_password, verify_password
from app.db import get_db
from app.deps import client_ip, get_current_user
from app.models import Department, Doctor, Patient, Role, User
from app.schemas import DoctorRegister, LoginIn, MeOut, Message, PatientRegister
from app.services import audit
from app.services.notifications import notify

router = APIRouter(prefix="/auth", tags=["auth"])

# Simple in-process limiter for failed logins (per IP+email). For multiple
# API replicas, move this to a shared store.
_failures: dict[str, deque] = defaultdict(deque)


def _throttled(key: str) -> bool:
    s = get_settings()
    q = _failures[key]
    cutoff = time.monotonic() - s.login_window_seconds
    while q and q[0] < cutoff:
        q.popleft()
    return len(q) >= s.login_max_attempts


def _set_session(response: Response, user: User) -> None:
    s = get_settings()
    response.set_cookie(
        s.cookie_name,
        create_access_token(user.id, user.role.value),
        max_age=s.access_token_minutes * 60,
        httponly=True,
        secure=s.cookie_secure,
        samesite="lax",
        path="/",
    )


def me_out(user: User) -> MeOut:
    out = MeOut.model_validate(user)
    out.patient_id = user.patient.id if user.patient else None
    out.doctor_id = user.doctor.id if user.doctor else None
    return out


def _email_taken(db: Session, email: str) -> bool:
    return bool(db.scalar(select(User.id).where(func.lower(User.email) == email.lower())))


@router.post("/register/patient", response_model=MeOut, status_code=201)
def register_patient(data: PatientRegister, request: Request, response: Response, db: Session = Depends(get_db)):
    if _email_taken(db, data.email):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    user = User(
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        full_name=data.full_name.strip(),
        phone=data.phone,
        role=Role.patient,
    )
    user.patient = Patient(date_of_birth=data.date_of_birth, gender=data.gender)
    db.add(user)
    db.flush()
    audit.record(db, "auth.register", user.id, "user", user.id, detail="patient", ip=client_ip(request))
    db.commit()
    _set_session(response, user)
    return me_out(user)


@router.post("/register/doctor", response_model=Message, status_code=201)
def register_doctor(data: DoctorRegister, request: Request, db: Session = Depends(get_db)):
    if _email_taken(db, data.email):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    if db.scalar(select(Doctor.id).where(Doctor.registration_number == data.registration_number)):
        raise HTTPException(status.HTTP_409_CONFLICT, "This registration number is already registered")
    if data.department_id and not db.get(Department, data.department_id):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unknown department")
    user = User(
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        full_name=data.full_name.strip(),
        phone=data.phone,
        role=Role.doctor,
    )
    user.doctor = Doctor(
        department_id=data.department_id,
        specialty=data.specialty,
        qualifications=data.qualifications,
        registration_number=data.registration_number,
        experience_years=data.experience_years,
        is_approved=False,
    )
    db.add(user)
    db.flush()
    for admin_id in db.scalars(select(User.id).where(User.role == Role.admin, User.is_active.is_(True))):
        notify(db, admin_id, "Doctor awaiting approval", f"{user.full_name} ({data.specialty}) registered.", "/admin/doctors")
    audit.record(db, "auth.register", user.id, "user", user.id, detail="doctor", ip=client_ip(request))
    db.commit()
    return Message(detail="Registration received. An administrator will review your account.")


@router.post("/login", response_model=MeOut)
def login(data: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    ip = client_ip(request)
    key = f"{ip}|{data.email.lower()}"
    if _throttled(key):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many attempts. Try again in a few minutes.")
    user = db.scalar(select(User).where(func.lower(User.email) == data.email.lower()))
    ok = verify_password(user.password_hash if user else DUMMY_HASH, data.password) and user is not None
    if not ok or not user.is_active:
        _failures[key].append(time.monotonic())
        audit.record(db, "auth.login_failed", user.id if user else None, detail=None, ip=ip)
        db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if user.role == Role.doctor and not user.doctor.is_approved:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Your doctor account is pending administrator approval")
    _failures.pop(key, None)
    audit.record(db, "auth.login", user.id, ip=ip)
    db.commit()
    _set_session(response, user)
    return me_out(user)


@router.post("/logout", response_model=Message)
def logout(response: Response):
    s = get_settings()
    response.delete_cookie(s.cookie_name, path="/", secure=s.cookie_secure, httponly=True, samesite="lax")
    return Message(detail="Signed out")


@router.get("/me", response_model=MeOut)
def me(user: User = Depends(get_current_user)):
    return me_out(user)
