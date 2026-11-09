from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.deps import client_ip, require_admin
from app.models import (
    Appointment,
    AppointmentStatus as S,
    AuditLog,
    Department,
    Doctor,
    Invoice,
    InvoiceStatus,
    Patient,
    Role,
    User,
)
from app.schemas import (
    AdminDoctorRow,
    AuditOut,
    AvailabilityOut,
    AvailabilityReplace,
    DepartmentIn,
    DepartmentOut,
    DoctorAdminUpdate,
    Message,
    Page,
    Stats,
    RoleIn,
    StaffCreate,
    UserOut,
    UserStatusIn,
)
from app.services import audit, scheduling
from app.services.notifications import notify
from app.core.security import hash_password
from app.core.permissions import STAFF_ROLES
from app.utils import now_local

router = APIRouter(prefix="/admin", tags=["admin"])


def _page(db: Session, stmt, page: int, size: int):
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    return db.scalars(stmt.offset((page - 1) * size).limit(size)).all(), total


# ---------- statistics ----------
@router.get("/stats", response_model=Stats)
def stats(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    now = now_local()
    today = datetime.combine(now.date(), datetime.min.time())

    def c(stmt):
        return db.scalar(stmt) or 0

    by_status = dict(db.execute(select(Appointment.status, func.count()).group_by(Appointment.status)).all())
    revenue = dict(
        db.execute(select(Invoice.status, func.coalesce(func.sum(Invoice.amount), 0)).group_by(Invoice.status)).all()
    )
    week_start = today - timedelta(days=6)
    day_counts = dict(
        db.execute(
            select(func.date(Appointment.start_at), func.count())
            .where(Appointment.start_at >= week_start, Appointment.start_at < today + timedelta(days=1))
            .group_by(func.date(Appointment.start_at))
        ).all()
    )
    last7 = []
    for i in range(7):
        d = (week_start + timedelta(days=i)).date()
        last7.append({"date": d.isoformat(), "count": int(day_counts.get(d, day_counts.get(d.isoformat(), 0)))})

    return Stats(
        patients=c(select(func.count(Patient.id))),
        doctors=c(select(func.count(Doctor.id)).where(Doctor.is_approved.is_(True))),
        pending_doctors=c(select(func.count(Doctor.id)).where(Doctor.is_approved.is_(False))),
        departments=c(select(func.count(Department.id))),
        appointments_today=c(
            select(func.count(Appointment.id)).where(
                Appointment.start_at >= today,
                Appointment.start_at < today + timedelta(days=1),
                Appointment.status != S.cancelled,
            )
        ),
        appointments_upcoming=c(
            select(func.count(Appointment.id)).where(Appointment.start_at >= now, Appointment.status.in_(scheduling.ACTIVE))
        ),
        appointments_by_status={k.value if hasattr(k, "value") else k: v for k, v in by_status.items()},
        revenue_paid=Decimal(revenue.get(InvoiceStatus.paid, 0) or 0),
        revenue_outstanding=Decimal(revenue.get(InvoiceStatus.unpaid, 0) or 0),
        appointments_last_7_days=last7,
    )


# ---------- users ----------
@router.get("/users", response_model=Page[UserOut])
def users(
    role: Role | None = None,
    q: str | None = Query(default=None, max_length=80),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    stmt = select(User)
    if role:
        stmt = stmt.where(User.role == role)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(or_(func.lower(User.full_name).like(like), func.lower(User.email).like(like)))
    rows, total = _page(db, stmt.order_by(User.created_at.desc(), User.id.desc()), page, size)
    return Page(items=[UserOut.model_validate(u) for u in rows], total=total, page=page, size=size)


@router.patch("/users/{user_id}", response_model=UserOut)
def set_user_status(
    user_id: int, data: UserStatusIn, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_admin)
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == admin.id:
        raise HTTPException(409, "You cannot change your own account status")
    user.is_active = data.is_active
    audit.record(
        db, "user.activate" if data.is_active else "user.deactivate", admin.id, "user", user.id, ip=client_ip(request)
    )
    db.commit()
    return UserOut.model_validate(user)


@router.post("/staff", response_model=UserOut, status_code=201)
def create_staff(data: StaffCreate, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """Create a lab, billing or admin account. Doctors register with credentials and are approved instead."""
    if db.scalar(select(User.id).where(func.lower(User.email) == data.email.lower())):
        raise HTTPException(409, "An account with this email already exists")
    user = User(
        email=data.email.lower(), password_hash=hash_password(data.password), full_name=data.full_name.strip(),
        phone=data.phone, role=Role(data.role),
    )
    db.add(user)
    db.flush()
    audit.record(db, "staff.create", admin.id, "user", user.id, detail=f"role={data.role}", ip=client_ip(request))
    db.commit()
    return UserOut.model_validate(user)


@router.patch("/users/{user_id}/role", response_model=UserOut)
def set_role(user_id: int, data: RoleIn, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == admin.id:
        raise HTTPException(409, "You cannot change your own role")
    if user.role not in STAFF_ROLES:
        raise HTTPException(409, "Patient and doctor accounts keep their role")
    before = user.role
    user.role = Role(data.role)
    audit.record(db, "user.role", admin.id, "user", user.id, detail=f"{before.value}->{data.role}", ip=client_ip(request))
    db.commit()
    return UserOut.model_validate(user)


# ---------- doctors ----------
@router.get("/doctors", response_model=Page[AdminDoctorRow])
def doctors(
    approved: bool | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    stmt = select(Doctor).join(User).options(selectinload(Doctor.user), selectinload(Doctor.department))
    if approved is not None:
        stmt = stmt.where(Doctor.is_approved.is_(approved))
    rows, total = _page(db, stmt.order_by(Doctor.is_approved, User.full_name), page, size)
    items = [
        AdminDoctorRow(
            id=d.id,
            user_id=d.user_id,
            full_name=d.user.full_name,
            email=d.user.email,
            specialty=d.specialty,
            registration_number=d.registration_number,
            department=d.department.name if d.department else None,
            is_approved=d.is_approved,
            is_active=d.user.is_active,
        )
        for d in rows
    ]
    return Page(items=items, total=total, page=page, size=size)


@router.post("/doctors/{doctor_id}/approve", response_model=Message)
def approve_doctor(doctor_id: int, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    d = db.get(Doctor, doctor_id)
    if not d:
        raise HTTPException(404, "Doctor not found")
    if d.is_approved:
        return Message(detail="Already approved")
    d.is_approved = True
    notify(db, d.user_id, "Account approved", "Your doctor account has been approved. Set your availability to start receiving bookings.", "/doctor/availability")
    audit.record(db, "doctor.approve", admin.id, "doctor", d.id, ip=client_ip(request))
    db.commit()
    return Message(detail="Doctor approved")


@router.patch("/doctors/{doctor_id}", response_model=Message)
def update_doctor(
    doctor_id: int, data: DoctorAdminUpdate, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_admin)
):
    d = db.get(Doctor, doctor_id)
    if not d:
        raise HTTPException(404, "Doctor not found")
    changes = data.model_dump(exclude_unset=True)
    if changes.get("department_id") and not db.get(Department, changes["department_id"]):
        raise HTTPException(422, "Unknown department")
    for k, v in changes.items():
        setattr(d, k, v)
    audit.record(db, "doctor.update", admin.id, "doctor", d.id, detail=",".join(changes), ip=client_ip(request))
    db.commit()
    return Message(detail="Doctor updated")


@router.get("/doctors/{doctor_id}/availability", response_model=list[AvailabilityOut])
def doctor_availability(doctor_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    d = db.get(Doctor, doctor_id)
    if not d:
        raise HTTPException(404, "Doctor not found")
    return d.availability


@router.put("/doctors/{doctor_id}/availability", response_model=list[AvailabilityOut])
def set_doctor_availability(
    doctor_id: int, data: AvailabilityReplace, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_admin)
):
    d = db.get(Doctor, doctor_id)
    if not d:
        raise HTTPException(404, "Doctor not found")
    scheduling.replace_availability(db, d, data.windows)
    audit.record(db, "availability.update", admin.id, "doctor", d.id, ip=client_ip(request))
    db.commit()
    db.refresh(d)
    return d.availability


# ---------- departments ----------
@router.post("/departments", response_model=DepartmentOut, status_code=201)
def create_department(data: DepartmentIn, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    dep = Department(name=data.name.strip(), description=data.description)
    db.add(dep)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Department already exists")
    audit.record(db, "department.create", admin.id, "department", dep.id, detail=dep.name, ip=client_ip(request))
    db.commit()
    return dep


@router.put("/departments/{dep_id}", response_model=DepartmentOut)
def update_department(
    dep_id: int, data: DepartmentIn, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_admin)
):
    dep = db.get(Department, dep_id)
    if not dep:
        raise HTTPException(404, "Department not found")
    dep.name, dep.description = data.name.strip(), data.description
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Department already exists")
    audit.record(db, "department.update", admin.id, "department", dep.id, ip=client_ip(request))
    db.commit()
    return dep


@router.delete("/departments/{dep_id}", response_model=Message)
def delete_department(dep_id: int, request: Request, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    dep = db.get(Department, dep_id)
    if not dep:
        raise HTTPException(404, "Department not found")
    if db.scalar(select(func.count(Doctor.id)).where(Doctor.department_id == dep_id)):
        raise HTTPException(409, "Reassign this department's doctors before deleting it")
    db.delete(dep)
    audit.record(db, "department.delete", admin.id, "department", dep_id, detail=dep.name, ip=client_ip(request))
    db.commit()
    return Message(detail="Department deleted")


# ---------- audit ----------
@router.get("/audit-logs", response_model=Page[AuditOut])
def audit_logs(
    action: str | None = Query(default=None, max_length=60),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    stmt = select(AuditLog).options(selectinload(AuditLog.actor))
    if action:
        stmt = stmt.where(AuditLog.action.like(f"{action}%"))
    rows, total = _page(db, stmt.order_by(AuditLog.created_at.desc(), AuditLog.id.desc()), page, size)
    items = [
        AuditOut(
            id=a.id,
            actor=a.actor.email if a.actor else None,
            action=a.action,
            entity_type=a.entity_type,
            entity_id=a.entity_id,
            detail=a.detail,
            ip_address=a.ip_address,
            created_at=a.created_at,
        )
        for a in rows
    ]
    return Page(items=items, total=total, page=page, size=size)
