"""Availability, slot generation and appointment lifecycle."""

from datetime import date, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import exists, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.models import (
    Appointment,
    AppointmentStatus as S,
    Doctor,
    DoctorAvailability,
    Invoice,
    Patient,
    Role,
    User,
)
from app.schemas import AvailabilityIn
from app.services import audit
from app.services.notifications import notify
from app.utils import now_local

ACTIVE = (S.scheduled, S.confirmed)

# Allowed transitions for doctors / admins.
TRANSITIONS: dict[S, set[S]] = {
    S.scheduled: {S.confirmed, S.cancelled, S.no_show, S.completed},
    S.confirmed: {S.completed, S.cancelled, S.no_show},
}


def appointment_query():
    return select(Appointment).options(
        selectinload(Appointment.patient).selectinload(Patient.user),
        selectinload(Appointment.doctor).selectinload(Doctor.user),
    )


def _fmt(dt: datetime) -> str:
    return dt.strftime("%d %b %Y, %I:%M %p")


# ---------- availability ----------
def replace_availability(db: Session, doctor: Doctor, windows: list[AvailabilityIn]) -> None:
    by_day: dict[int, list[AvailabilityIn]] = {}
    for w in windows:
        by_day.setdefault(w.weekday, []).append(w)
    for day in by_day.values():
        day.sort(key=lambda w: w.start_time)
        for a, b in zip(day, day[1:]):
            if b.start_time < a.end_time:
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Availability windows overlap")
    doctor.availability.clear()
    db.flush()
    for w in windows:
        doctor.availability.append(DoctorAvailability(**w.model_dump()))


def _all_slots(doctor: Doctor, day: date) -> list[tuple[datetime, datetime]]:
    slots = []
    for w in doctor.availability:
        if w.weekday != day.weekday():
            continue
        cur = datetime.combine(day, w.start_time)
        end = datetime.combine(day, w.end_time)
        step = timedelta(minutes=w.slot_minutes)
        while cur + step <= end:
            slots.append((cur, cur + step))
            cur += step
    return sorted(slots)


def free_slots(db: Session, doctor: Doctor, day: date) -> list[tuple[datetime, datetime]]:
    now = now_local()
    horizon = now.date() + timedelta(days=get_settings().booking_horizon_days)
    if day < now.date() or day > horizon:
        return []
    start = datetime.combine(day, datetime.min.time())
    taken = set(
        db.scalars(
            select(Appointment.start_at).where(
                Appointment.doctor_id == doctor.id,
                Appointment.start_at >= start,
                Appointment.start_at < start + timedelta(days=1),
                Appointment.status != S.cancelled,
            )
        )
    )
    return [(s, e) for s, e in _all_slots(doctor, day) if s > now and s not in taken]


def _validate_slot(doctor: Doctor, start_at: datetime) -> datetime:
    start_at = start_at.replace(tzinfo=None, second=0, microsecond=0)
    now = now_local()
    if start_at <= now:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Slot is in the past")
    if start_at.date() > now.date() + timedelta(days=get_settings().booking_horizon_days):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Slot is beyond the booking window")
    for s, e in _all_slots(doctor, start_at.date()):
        if s == start_at:
            return e
    raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Doctor is not available at that time")


def _patient_busy(db: Session, patient_id: int, start_at: datetime, exclude_id: int | None = None) -> bool:
    q = select(
        exists().where(
            Appointment.patient_id == patient_id,
            Appointment.start_at == start_at,
            Appointment.status.in_(ACTIVE),
            Appointment.id != (exclude_id or 0),
        )
    )
    return bool(db.scalar(q))


def _commit_slot(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "That slot has just been booked. Please pick another.")


# ---------- lifecycle ----------
def book(db: Session, patient: Patient, doctor_id: int, start_at: datetime, reason: str | None, ip=None) -> Appointment:
    doctor = db.get(Doctor, doctor_id)
    if not doctor or not doctor.is_approved or not doctor.user.is_active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Doctor not found")
    end_at = _validate_slot(doctor, start_at)
    start_at = start_at.replace(tzinfo=None, second=0, microsecond=0)
    if _patient_busy(db, patient.id, start_at):
        raise HTTPException(status.HTTP_409_CONFLICT, "You already have an appointment at that time")
    appt = Appointment(
        patient_id=patient.id, doctor_id=doctor.id, start_at=start_at, end_at=end_at, reason=reason
    )
    db.add(appt)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "That slot has just been booked. Please pick another.")
    notify(
        db,
        doctor.user_id,
        "New appointment",
        f"{patient.user.full_name} booked {_fmt(start_at)}.",
        f"/doctor/appointments/{appt.id}",
    )
    audit.record(db, "appointment.book", patient.user_id, "appointment", appt.id, ip=ip)
    _commit_slot(db)
    return appt


def reschedule(db: Session, patient: Patient, appt: Appointment, start_at: datetime, ip=None) -> Appointment:
    if appt.status not in ACTIVE or appt.start_at <= now_local():
        raise HTTPException(status.HTTP_409_CONFLICT, "This appointment can no longer be rescheduled")
    end_at = _validate_slot(appt.doctor, start_at)
    start_at = start_at.replace(tzinfo=None, second=0, microsecond=0)
    if _patient_busy(db, patient.id, start_at, exclude_id=appt.id):
        raise HTTPException(status.HTTP_409_CONFLICT, "You already have an appointment at that time")
    old = appt.start_at
    appt.start_at, appt.end_at, appt.status = start_at, end_at, S.scheduled
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "That slot has just been booked. Please pick another.")
    notify(
        db,
        appt.doctor.user_id,
        "Appointment rescheduled",
        f"{patient.user.full_name} moved {_fmt(old)} to {_fmt(start_at)}.",
        f"/doctor/appointments/{appt.id}",
    )
    audit.record(db, "appointment.reschedule", patient.user_id, "appointment", appt.id, ip=ip)
    _commit_slot(db)
    return appt


def cancel_by_patient(db: Session, patient: Patient, appt: Appointment, ip=None) -> Appointment:
    if appt.status not in ACTIVE or appt.start_at <= now_local():
        raise HTTPException(status.HTTP_409_CONFLICT, "This appointment can no longer be cancelled")
    appt.status = S.cancelled
    notify(
        db,
        appt.doctor.user_id,
        "Appointment cancelled",
        f"{patient.user.full_name} cancelled {_fmt(appt.start_at)}.",
        f"/doctor/appointments/{appt.id}",
    )
    audit.record(db, "appointment.cancel", patient.user_id, "appointment", appt.id, ip=ip)
    db.commit()
    return appt


def ensure_invoice(db: Session, appt: Appointment) -> None:
    if db.scalar(select(Invoice.id).where(Invoice.appointment_id == appt.id)):
        return
    db.add(
        Invoice(
            patient_id=appt.patient_id,
            appointment_id=appt.id,
            description=f"Consultation – {appt.doctor.user.full_name} ({appt.start_at:%d %b %Y})",
            amount=appt.doctor.consultation_fee,
        )
    )


def set_status(db: Session, actor: User, appt: Appointment, new: S, ip=None) -> Appointment:
    if new not in TRANSITIONS.get(appt.status, set()):
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Cannot change status from {appt.status.value} to {new.value}"
        )
    if new in (S.completed, S.no_show) and appt.start_at.date() > now_local().date():
        raise HTTPException(status.HTTP_409_CONFLICT, "Future appointments cannot be completed yet")
    appt.status = new
    if new == S.completed:
        ensure_invoice(db, appt)
    labels = {
        S.confirmed: "confirmed",
        S.cancelled: "cancelled by the clinic",
        S.completed: "marked as completed",
        S.no_show: "marked as missed",
    }
    notify(
        db,
        appt.patient.user_id,
        "Appointment update",
        f"Your appointment with {appt.doctor.user.full_name} on {_fmt(appt.start_at)} was {labels[new]}.",
        "/patient/appointments",
    )
    audit.record(db, "appointment.status", actor.id, "appointment", appt.id, detail=new.value, ip=ip)
    db.commit()
    return appt


# ---------- access control ----------
def get_visible_appointment(db: Session, user: User, appointment_id: int) -> Appointment:
    appt = db.scalar(appointment_query().where(Appointment.id == appointment_id))
    allowed = appt and (
        user.role == Role.admin
        or (user.role == Role.patient and user.patient and appt.patient_id == user.patient.id)
        or (user.role == Role.doctor and user.doctor and appt.doctor_id == user.doctor.id)
    )
    if not allowed:
        # 404 rather than 403 so IDs of other people's appointments are not confirmed.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Appointment not found")
    return appt


def doctor_treats_patient(db: Session, doctor_id: int, patient_id: int) -> bool:
    """Treatment relationship: the doctor has a non-cancelled appointment with the patient."""
    return bool(
        db.scalar(
            select(
                exists().where(
                    Appointment.doctor_id == doctor_id,
                    Appointment.patient_id == patient_id,
                    Appointment.status != S.cancelled,
                )
            )
        )
    )
