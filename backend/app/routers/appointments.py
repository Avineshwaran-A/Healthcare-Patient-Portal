from datetime import date, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import client_ip, current_patient, get_current_user, require_roles
from app.models import Appointment, AppointmentStatus, MedicalRecord, Patient, Role, User
from app.schemas import (
    AppointmentCreate,
    AppointmentOut,
    AppointmentReschedule,
    AppointmentStatusIn,
    Page,
)
from app.services import scheduling
from app.utils import now_local

router = APIRouter(prefix="/appointments", tags=["appointments"])


def to_out(db: Session, rows: list[Appointment]) -> list[AppointmentOut]:
    ids = [a.id for a in rows]
    with_record = (
        set(db.scalars(select(MedicalRecord.appointment_id).where(MedicalRecord.appointment_id.in_(ids))))
        if ids
        else set()
    )
    return [AppointmentOut.build(a, a.id in with_record) for a in rows]


@router.get("", response_model=Page[AppointmentOut])
def list_appointments(
    scope: Literal["upcoming", "past", "all"] = "all",
    status: AppointmentStatus | None = None,
    day: date | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = scheduling.appointment_query()
    if user.role == Role.patient:
        stmt = stmt.where(Appointment.patient_id == user.patient.id)
    elif user.role == Role.doctor:
        stmt = stmt.where(Appointment.doctor_id == user.doctor.id)
    now = now_local()
    order = Appointment.start_at.asc()
    if scope == "upcoming":
        stmt = stmt.where(Appointment.start_at >= now, Appointment.status.in_(scheduling.ACTIVE))
    elif scope == "past":
        stmt = stmt.where((Appointment.start_at < now) | Appointment.status.notin_(scheduling.ACTIVE))
        order = Appointment.start_at.desc()
    else:
        order = Appointment.start_at.desc()
    if status:
        stmt = stmt.where(Appointment.status == status)
    if day:
        start = datetime.combine(day, datetime.min.time())
        stmt = stmt.where(Appointment.start_at >= start, Appointment.start_at < start + timedelta(days=1))
        order = Appointment.start_at.asc()
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(order).offset((page - 1) * size).limit(size)).all()
    return Page(items=to_out(db, list(rows)), total=total or 0, page=page, size=size)


@router.post("", response_model=AppointmentOut, status_code=201)
def book(data: AppointmentCreate, request: Request, db: Session = Depends(get_db), patient: Patient = Depends(current_patient)):
    appt = scheduling.book(db, patient, data.doctor_id, data.start_at, data.reason, ip=client_ip(request))
    appt = scheduling.get_visible_appointment(db, patient.user, appt.id)
    return AppointmentOut.build(appt)


@router.get("/{appointment_id}", response_model=AppointmentOut)
def get_one(appointment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    appt = scheduling.get_visible_appointment(db, user, appointment_id)
    return to_out(db, [appt])[0]


@router.post("/{appointment_id}/cancel", response_model=AppointmentOut)
def cancel(appointment_id: int, request: Request, db: Session = Depends(get_db), patient: Patient = Depends(current_patient)):
    appt = scheduling.get_visible_appointment(db, patient.user, appointment_id)
    return AppointmentOut.build(scheduling.cancel_by_patient(db, patient, appt, ip=client_ip(request)))


@router.post("/{appointment_id}/reschedule", response_model=AppointmentOut)
def reschedule(
    appointment_id: int,
    data: AppointmentReschedule,
    request: Request,
    db: Session = Depends(get_db),
    patient: Patient = Depends(current_patient),
):
    appt = scheduling.get_visible_appointment(db, patient.user, appointment_id)
    return AppointmentOut.build(scheduling.reschedule(db, patient, appt, data.start_at, ip=client_ip(request)))


@router.patch("/{appointment_id}/status", response_model=AppointmentOut)
def update_status(
    appointment_id: int,
    data: AppointmentStatusIn,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.doctor, Role.admin)),
):
    appt = scheduling.get_visible_appointment(db, user, appointment_id)
    return to_out(db, [scheduling.set_status(db, user, appt, data.status, ip=client_ip(request))])[0]
