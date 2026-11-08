from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
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
    LabReportOut,
    Message,
    PatientHistory,
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
                LabReport.doctor_id == doctor.id, LabReport.status == LabStatus.requested
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


@router.get("/doctor/labs", response_model=list[LabReportOut])
def my_lab_requests(
    status: LabStatus | None = LabStatus.requested,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(current_doctor),
):
    stmt = select(LabReport).where(LabReport.doctor_id == doctor.id)
    if status:
        stmt = stmt.where(LabReport.status == status)
    rows = db.scalars(stmt.order_by(LabReport.requested_at.desc()).limit(100)).all()
    return [LabReportOut.build(r) for r in rows]


@router.post("/doctor/labs/{lab_id}/result", response_model=LabReportOut)
async def upload_lab_result(
    lab_id: int,
    request: Request,
    summary: str = Form(min_length=1, max_length=5000),
    file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(current_doctor),
):
    lab = clinical.get_lab_for_doctor(db, doctor, lab_id)
    info = None
    if file is not None and file.filename:
        info = await files.save_upload(file)
        files.delete(lab.file_key)  # replace previous file, if any
    return LabReportOut.build(clinical.complete_lab(db, doctor, lab, summary, info, ip=client_ip(request)))


@router.get("/labs/{lab_id}/file")
def download_lab_file(lab_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lab = db.get(LabReport, lab_id)
    allowed = lab and (
        (user.role == Role.patient and user.patient and lab.patient_id == user.patient.id)
        or (
            user.role == Role.doctor
            and (lab.doctor_id == user.doctor.id or scheduling.doctor_treats_patient(db, user.doctor.id, lab.patient_id))
        )
    )
    if not allowed or not lab.file_key:
        raise HTTPException(404, "File not found")
    audit.record(db, "lab.download", user.id, "lab_report", lab.id, ip=client_ip(request))
    db.commit()
    return FileResponse(
        files.path_for(lab.file_key),
        media_type=lab.file_mime,
        filename=lab.file_name,
        headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"},
    )
