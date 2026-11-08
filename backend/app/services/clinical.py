"""Consultation notes, prescriptions and lab reports."""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Appointment,
    AppointmentStatus as S,
    Doctor,
    LabReport,
    LabStatus,
    MedicalRecord,
    Patient,
    Prescription,
    PrescriptionItem,
)
from app.schemas import (
    ConsultationIn,
    LabReportOut,
    MedicalRecordOut,
    PatientHistory,
    PatientProfileOut,
    PrescriptionOut,
)
from app.services import audit, scheduling
from app.services.notifications import notify
from app.utils import now_local


def profile_out(p: Patient) -> PatientProfileOut:
    u = p.user
    return PatientProfileOut(
        id=p.id,
        email=u.email,
        full_name=u.full_name,
        phone=u.phone,
        date_of_birth=p.date_of_birth,
        gender=p.gender,
        blood_group=p.blood_group,
        address=p.address,
        emergency_contact=p.emergency_contact,
        allergies=p.allergies,
    )


def _doc_opt(model):
    return selectinload(model.doctor).selectinload(Doctor.user)


def records_for(db: Session, patient_id: int) -> list[MedicalRecord]:
    return list(
        db.scalars(
            select(MedicalRecord)
            .options(_doc_opt(MedicalRecord))
            .where(MedicalRecord.patient_id == patient_id)
            .order_by(MedicalRecord.created_at.desc())
        )
    )


def prescriptions_for(db: Session, patient_id: int) -> list[Prescription]:
    return list(
        db.scalars(
            select(Prescription)
            .options(_doc_opt(Prescription), selectinload(Prescription.items))
            .where(Prescription.patient_id == patient_id)
            .order_by(Prescription.created_at.desc())
        )
    )


def labs_for(db: Session, patient_id: int) -> list[LabReport]:
    return list(
        db.scalars(
            select(LabReport)
            .options(_doc_opt(LabReport))
            .where(LabReport.patient_id == patient_id)
            .order_by(LabReport.requested_at.desc())
        )
    )


def history(db: Session, patient: Patient) -> PatientHistory:
    return PatientHistory(
        patient=profile_out(patient),
        records=[MedicalRecordOut.build(r) for r in records_for(db, patient.id)],
        prescriptions=[PrescriptionOut.build(p) for p in prescriptions_for(db, patient.id)],
        labs=[LabReportOut.build(r) for r in labs_for(db, patient.id)],
    )


def doctor_view_history(db: Session, doctor: Doctor, patient_id: int, ip=None) -> PatientHistory:
    patient = db.get(Patient, patient_id)
    if not patient or not scheduling.doctor_treats_patient(db, doctor.id, patient_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")
    audit.record(db, "record.view", doctor.user_id, "patient", patient_id, ip=ip)
    db.commit()
    return history(db, patient)


def save_consultation(db: Session, doctor: Doctor, appt: Appointment, data: ConsultationIn, ip=None) -> None:
    if appt.doctor_id != doctor.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Appointment not found")
    if appt.status in (S.cancelled, S.no_show):
        raise HTTPException(status.HTTP_409_CONFLICT, "Cannot document a cancelled or missed appointment")
    if appt.start_at.date() > now_local().date():
        raise HTTPException(status.HTTP_409_CONFLICT, "Consultations can be documented on or after the visit date")
    if db.scalar(select(MedicalRecord.id).where(MedicalRecord.appointment_id == appt.id)):
        raise HTTPException(status.HTTP_409_CONFLICT, "This appointment already has consultation notes")

    record = MedicalRecord(
        patient_id=appt.patient_id,
        doctor_id=doctor.id,
        appointment_id=appt.id,
        chief_complaint=data.chief_complaint,
        assessment=data.assessment,
        notes=data.notes,
    )
    db.add(record)
    patient_user = appt.patient.user_id

    if data.prescription_items:
        rx = Prescription(
            patient_id=appt.patient_id,
            doctor_id=doctor.id,
            appointment_id=appt.id,
            notes=data.prescription_notes,
            items=[PrescriptionItem(**i.model_dump()) for i in data.prescription_items],
        )
        db.add(rx)
        notify(db, patient_user, "New prescription", f"{doctor.user.full_name} issued a prescription.", "/patient/records")

    for test in data.lab_tests:
        db.add(LabReport(patient_id=appt.patient_id, doctor_id=doctor.id, appointment_id=appt.id, test_name=test))
    if data.lab_tests:
        notify(db, patient_user, "Lab tests requested", f"{len(data.lab_tests)} test(s) requested by {doctor.user.full_name}.", "/patient/records")

    db.flush()
    audit.record(db, "record.create", doctor.user_id, "appointment", appt.id, ip=ip)

    if data.mark_completed and appt.status in (S.scheduled, S.confirmed):
        scheduling.set_status(db, doctor.user, appt, S.completed, ip=ip)  # commits
    else:
        db.commit()


def get_lab_for_doctor(db: Session, doctor: Doctor, lab_id: int) -> LabReport:
    lab = db.scalar(select(LabReport).options(_doc_opt(LabReport)).where(LabReport.id == lab_id))
    if not lab or lab.doctor_id != doctor.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lab report not found")
    return lab


def complete_lab(db: Session, doctor: Doctor, lab: LabReport, summary: str, file_info, ip=None) -> LabReport:
    if file_info:
        lab.file_key, lab.file_name, lab.file_mime = file_info
    lab.result_summary = summary
    lab.status = LabStatus.completed
    lab.completed_at = now_local()
    patient = db.get(Patient, lab.patient_id)
    notify(db, patient.user_id, "Lab result available", f"Your {lab.test_name} result is ready.", "/patient/records")
    audit.record(db, "lab.complete", doctor.user_id, "lab_report", lab.id, ip=ip)
    db.commit()
    return lab
