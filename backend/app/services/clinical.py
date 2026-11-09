"""Consultation notes, prescriptions and lab requests (doctor-owned clinical data).

Lab *results* are owned by the laboratory: see services/lab.py.
"""

from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Appointment,
    Role,
    User,
    AppointmentStatus as S,
    Doctor,
    LabReport,
    MedicalRecord,
    Patient,
    Prescription,
    PrescriptionItem,
)
from app.schemas import (
    ConsultationIn,
    EmergencyAccessIn,
    LabReportOut,
    MedicalRecordOut,
    PatientHistory,
    PatientProfileOut,
    PrescriptionOut,
    RecordAmendIn,
)
from app.services import audit, scheduling
from app.services.notifications import notify
from app.utils import now_local


def profile_out(p: Patient) -> PatientProfileOut:
    u = p.user
    return PatientProfileOut(
        id=p.id,
        patient_code=p.code,
        email=u.email,
        full_name=u.full_name,
        phone=u.phone,
        date_of_birth=p.date_of_birth,
        gender=p.gender,
        blood_group=p.blood_group,
        address=p.address,
        emergency_contact=p.emergency_contact,
        allergies=p.allergies,
        insurer=p.insurer,
        policy_number=p.policy_number,
        insurance_status=p.insurance_status,
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


def lab_opts():
    return (
        _doc_opt(LabReport),
        selectinload(LabReport.patient).selectinload(Patient.user),
        selectinload(LabReport.assigned_to),
    )


def labs_for(db: Session, patient_id: int) -> list[LabReport]:
    return list(
        db.scalars(
            select(LabReport)
            .options(*lab_opts())
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


def emergency_access(db: Session, doctor: Doctor, patient_id: int, data: EmergencyAccessIn, ip=None) -> PatientHistory:
    """Exceptional access to a patient the doctor has no appointment with.

    Requires a stated reason, grants this single read only, is audited, and is
    flagged to every active administrator for review.
    """
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")
    audit.record(db, "record.emergency_access", doctor.user_id, "patient", patient_id, detail=data.reason, ip=ip)
    for admin_id in db.scalars(select(User.id).where(User.role == Role.admin, User.is_active.is_(True))):
        notify(
            db,
            admin_id,
            "Emergency record access",
            f"{doctor.user.full_name} used emergency access for patient {patient.code}. Review the audit log.",
            "/admin/audit?action=record.emergency",
        )
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
        follow_up_date=(appt.start_at.date() + timedelta(days=data.follow_up_in_days)) if data.follow_up_in_days else None,
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

    if record.follow_up_date:
        notify(
            db,
            patient_user,
            "Follow-up recommended",
            f"{doctor.user.full_name} recommends a follow-up around {record.follow_up_date:%d %b %Y}.",
            f"/patient/doctors/{doctor.id}",
        )

    db.flush()
    audit.record(db, "record.create", doctor.user_id, "appointment", appt.id, ip=ip)
    if data.prescription_items:
        audit.record(db, "prescription.create", doctor.user_id, "appointment", appt.id, ip=ip)
    if data.lab_tests:
        audit.record(db, "lab.request", doctor.user_id, "appointment", appt.id, detail=f"{len(data.lab_tests)} test(s)", ip=ip)

    if data.mark_completed and appt.status in (S.scheduled, S.confirmed):
        scheduling.set_status(db, doctor.user, appt, S.completed, ip=ip)  # commits
    else:
        db.commit()


def amend_record(db: Session, doctor: Doctor, record_id: int, data: RecordAmendIn, ip=None) -> MedicalRecord:
    """Only the authoring doctor may amend a note, and must give a reason. Audited with the changed fields."""
    record = db.scalar(select(MedicalRecord).options(_doc_opt(MedicalRecord)).where(MedicalRecord.id == record_id))
    if not record or record.doctor_id != doctor.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Record not found")
    fields = ("chief_complaint", "assessment", "notes", "follow_up_date")
    changed = [f for f in fields if getattr(record, f) != getattr(data, f)]
    if not changed:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Nothing changed")
    for f in changed:
        setattr(record, f, getattr(data, f))
    record.amended_at = now_local()
    record.amendment_reason = data.reason
    audit.record(db, "record.amend", doctor.user_id, "medical_record", record.id, detail="fields: " + ",".join(changed), ip=ip)
    db.commit()
    return record
