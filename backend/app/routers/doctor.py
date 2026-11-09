from datetime import datetime, timedelta

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import client_ip, current_doctor, get_current_user
from app.models import Appointment, AppointmentStatus as S, Doctor, LabReport, LabStatus, Role, User
from app.routers.appointments import to_out
from app.schemas import (
    AvailabilityOut,
    AvailabilityReplace,
    ConsultationIn,
    DoctorDashboard,
    EmergencyAccessIn,
    LabReportOut,
    MedicalRecordOut,
    Message,
    PatientHistory,
    RecordAmendIn,
)
from app.services import audit, clinical, files, scheduling
from app.utils import now_local

router = APIRouter(tags=["doctor"])


@router.get("/doctor/dashboard", response_model=DoctorDashboard)
def dashboard(db: Session = Depends(get_db), doctor: Doctor = Depends(current_doctor)):
    now = now_local()
    today = datetime.combine(now.date(), datetime.min.time())
    week_start = today - timedelta(days=today.weekday())
    rows = db.scalars(
        scheduling.appointment_query()
        .where(
            Appointment.doctor_id == doctor.id,
            Appointment.start_at >= today,
            Appointment.start_at < today + timedelta(days=1),
            Appointment.status != S.cancelled,
        )
        .order_by(Appointment.start_at)
    ).all()

    def count(*where):
        return db.scalar(select(func.count(Appointment.id)).where(Appointment.doctor_id == doctor.id, *where)) or 0

    return DoctorDashboard(
        today=to_out(db, list(rows)),
        upcoming_count=count(Appointment.start_at >= now, Appointment.status.in_(scheduling.ACTIVE)),
        completed_this_week=count(Appointment.start_at >= week_start, Appointment.status == S.completed),
        pending_labs=db.scalar(
            select(func.count(LabReport.id)).where(
                LabReport.doctor_id == doctor.id, LabReport.status != LabStatus.completed
            )
        )
        or 0,
    )


@router.get("/doctor/availability", response_model=list[AvailabilityOut])
def my_availability(doctor: Doctor = Depends(current_doctor)):
    return doctor.availability


@router.put("/doctor/availability", response_model=list[AvailabilityOut])
def set_availability(
    data: AvailabilityReplace, request: Request, db: Session = Depends(get_db), doctor: Doctor = Depends(current_doctor)
):
    scheduling.replace_availability(db, doctor, data.windows)
    audit.record(db, "availability.update", doctor.user_id, "doctor", doctor.id, ip=client_ip(request))
    db.commit()
    db.refresh(doctor)
    return doctor.availability


@router.get("/doctor/patients/{patient_id}/history", response_model=PatientHistory)
def patient_history(patient_id: int, request: Request, db: Session = Depends(get_db), doctor: Doctor = Depends(current_doctor)):
    return clinical.doctor_view_history(db, doctor, patient_id, ip=client_ip(request))


@router.post("/doctor/appointments/{appointment_id}/consultation", response_model=Message, status_code=201)
def consultation(
    appointment_id: int,
    data: ConsultationIn,
    request: Request,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(current_doctor),
):
    appt = scheduling.get_visible_appointment(db, doctor.user, appointment_id)
    clinical.save_consultation(db, doctor, appt, data, ip=client_ip(request))
    return Message(detail="Consultation saved")


@router.post("/doctor/patients/{patient_id}/emergency-access", response_model=PatientHistory)
def emergency_access(
    patient_id: int, data: EmergencyAccessIn, request: Request, db: Session = Depends(get_db), doctor: Doctor = Depends(current_doctor)
):
    """Break-glass read of an unrelated patient's history: reason required, audited, admins alerted."""
    return clinical.emergency_access(db, doctor, patient_id, data, ip=client_ip(request))


@router.put("/doctor/records/{record_id}", response_model=MedicalRecordOut)
def amend_record(
    record_id: int, data: RecordAmendIn, request: Request, db: Session = Depends(get_db), doctor: Doctor = Depends(current_doctor)
):
    return MedicalRecordOut.build(clinical.amend_record(db, doctor, record_id, data, ip=client_ip(request)))


@router.get("/doctor/labs", response_model=list[LabReportOut])
def my_lab_requests(
    status: Literal["pending", "completed"] = "pending",
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(current_doctor),
):
    """Tests this doctor requested. Results appear only after the lab verifies them (read-only here)."""
    done = LabReport.status == LabStatus.completed
    stmt = select(LabReport).options(*clinical.lab_opts()).where(LabReport.doctor_id == doctor.id, done if status == "completed" else ~done)
    order = LabReport.completed_at.desc() if status == "completed" else LabReport.requested_at.desc()
    rows = db.scalars(stmt.order_by(order).limit(100)).all()
    return [LabReportOut.build(r) for r in rows]


def _may_download(db: Session, user: User, lab: LabReport) -> bool:
    if user.role == Role.lab:
        return lab.assigned_to_id == user.id  # the technician working the order
    if lab.status != LabStatus.completed:
        return False  # unverified results are not released
    if user.role == Role.patient:
        return bool(user.patient) and lab.patient_id == user.patient.id
    if user.role == Role.doctor:
        return lab.doctor_id == user.doctor.id or scheduling.doctor_treats_patient(db, user.doctor.id, lab.patient_id)
    return False  # admin and billing have no access to lab files


@router.get("/labs/{lab_id}/file")
def download_lab_file(lab_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lab = db.get(LabReport, lab_id)
    if not lab or not lab.file_key or not _may_download(db, user, lab):
        raise HTTPException(404, "File not found")
    audit.record(db, "lab.download", user.id, "lab_report", lab.id, ip=client_ip(request))
    db.commit()
    return FileResponse(
        files.path_for(lab.file_key),
        media_type=lab.file_mime,
        filename=lab.file_name,
        headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"},
    )
