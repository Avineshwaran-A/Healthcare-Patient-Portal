from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.deps import client_ip, current_patient
from app.models import InsuranceClaim, Invoice, Patient
from app.schemas import (
    ClaimOut,
    InvoiceOut,
    LabReportOut,
    MedicalRecordOut,
    PatientHistory,
    PatientProfileIn,
    PatientProfileOut,
    PrescriptionOut,
)
from app.services import audit, clinical

router = APIRouter(prefix="/patients/me", tags=["patient"])


@router.get("", response_model=PatientProfileOut)
def get_profile(patient: Patient = Depends(current_patient)):
    return clinical.profile_out(patient)


@router.put("", response_model=PatientProfileOut)
def update_profile(data: PatientProfileIn, request: Request, db: Session = Depends(get_db), patient: Patient = Depends(current_patient)):
    patient.user.full_name = data.full_name.strip()
    patient.user.phone = data.phone
    for field in ("date_of_birth", "gender", "blood_group", "address", "emergency_contact", "allergies"):
        setattr(patient, field, getattr(data, field))
    audit.record(db, "profile.update", patient.user_id, "patient", patient.id, ip=client_ip(request))
    db.commit()
    return clinical.profile_out(patient)


@router.get("/history", response_model=PatientHistory)
def my_history(db: Session = Depends(get_db), patient: Patient = Depends(current_patient)):
    return clinical.history(db, patient)


@router.get("/records", response_model=list[MedicalRecordOut])
def my_records(db: Session = Depends(get_db), patient: Patient = Depends(current_patient)):
    return [MedicalRecordOut.build(r) for r in clinical.records_for(db, patient.id)]


@router.get("/prescriptions", response_model=list[PrescriptionOut])
def my_prescriptions(db: Session = Depends(get_db), patient: Patient = Depends(current_patient)):
    return [PrescriptionOut.build(p) for p in clinical.prescriptions_for(db, patient.id)]


@router.get("/labs", response_model=list[LabReportOut])
def my_labs(db: Session = Depends(get_db), patient: Patient = Depends(current_patient)):
    return [LabReportOut.build(r) for r in clinical.labs_for(db, patient.id)]


@router.get("/invoices", response_model=list[InvoiceOut])
def my_invoices(db: Session = Depends(get_db), patient: Patient = Depends(current_patient)):
    rows = db.scalars(
        select(Invoice)
        .options(selectinload(Invoice.patient).selectinload(Patient.user))
        .where(Invoice.patient_id == patient.id)
        .order_by(Invoice.issued_at.desc())
    ).all()
    return [InvoiceOut.build(i) for i in rows]


@router.get("/claims", response_model=list[ClaimOut])
def my_claims(db: Session = Depends(get_db), patient: Patient = Depends(current_patient)):
    rows = db.scalars(
        select(InsuranceClaim)
        .options(selectinload(InsuranceClaim.patient).selectinload(Patient.user))
        .where(InsuranceClaim.patient_id == patient.id)
        .order_by(InsuranceClaim.created_at.desc())
    ).all()
    return [ClaimOut.build(c) for c in rows]
