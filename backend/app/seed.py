"""Load SYNTHETIC demo data. Never use real patient information.

Usage:  python -m app.seed            (refuses to run if users already exist)
        python -m app.seed --reset    (drops & recreates all tables first; dev only)

Demo accounts (all share DEMO_PASSWORD below):
    admin@example.com                 – administrator
    dr.mehta@example.com, dr.rao@example.com, ... – approved doctors
    dr.pending@example.com            – doctor awaiting approval
    lab@example.com, lab2@example.com – lab technicians
    billing@example.com               – billing / insurance staff
    asha@example.com, rahul@example.com, meera@example.com – patients

On a database that already has users (e.g. one created before the lab and
billing roles existed), the seed only adds any missing demo staff accounts,
and never in production.
"""

import sys
from datetime import datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import hash_password
from app.db import Base, SessionLocal, engine
from app.models import (
    Appointment,
    AppointmentStatus as S,
    Department,
    Doctor,
    DoctorAvailability,
    Invoice,
    InsuranceStatus,
    InvoiceStatus,
    LabReport,
    LabStatus,
    MedicalRecord,
    Patient,
    Prescription,
    PrescriptionItem,
    Role,
    User,
)
from app.utils import now_local

DEMO_PASSWORD = "Demo@12345"

DEPARTMENTS = [
    ("General Medicine", "Primary care and internal medicine"),
    ("Cardiology", "Heart and blood vessel care"),
    ("Dermatology", "Skin, hair and nail conditions"),
    ("Paediatrics", "Care for infants, children and adolescents"),
    ("Orthopaedics", "Bones, joints and muscles"),
]

DOCTORS = [
    ("dr.mehta@example.com", "Dr. Anil Mehta", "General Medicine", "General Physician", "MBBS, MD (Internal Medicine)", 14, "600"),
    ("dr.rao@example.com", "Dr. Kavya Rao", "Cardiology", "Cardiologist", "MBBS, MD, DM (Cardiology)", 11, "1200"),
    ("dr.iyer@example.com", "Dr. Sanjay Iyer", "Dermatology", "Dermatologist", "MBBS, MD (Dermatology)", 8, "800"),
    ("dr.khan@example.com", "Dr. Farah Khan", "Paediatrics", "Paediatrician", "MBBS, DCH, MD (Paediatrics)", 12, "700"),
    ("dr.singh@example.com", "Dr. Harpreet Singh", "Orthopaedics", "Orthopaedic Surgeon", "MBBS, MS (Orthopaedics)", 16, "1000"),
]

STAFF = [
    ("lab@example.com", "Ravi Kumar", Role.lab),
    ("lab2@example.com", "Divya Menon", Role.lab),
    ("billing@example.com", "Sunita Das", Role.billing),
]

PATIENTS = [
    ("asha@example.com", "Asha Verma", "1990-04-12", "Female", "B+"),
    ("rahul@example.com", "Rahul Nair", "1985-09-30", "Male", "O+"),
    ("meera@example.com", "Meera Joshi", "2001-01-22", "Female", "A-"),
]


def run(reset: bool = False) -> None:
    if reset:
        if get_settings().environment == "production":
            raise SystemExit("Refusing to reset a production database")
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
    db = SessionLocal()
    if db.scalar(select(User.id).limit(1)):
        if get_settings().environment == "production":
            print("Database already has users; skipping seed.")
            return
        added = _ensure_staff(db, hash_password(DEMO_PASSWORD))
        print(f"Database already has users; added {added} missing demo staff account(s). Use --reset for a full reseed.")
        return
    pw = hash_password(DEMO_PASSWORD)
    _ensure_staff(db, pw)

    deps = {n: Department(name=n, description=d) for n, d in DEPARTMENTS}
    db.add_all(deps.values())
    db.add(User(email="admin@example.com", password_hash=pw, full_name="Priya Admin", role=Role.admin))

    doctors = []
    for i, (email, name, dep, spec, qual, exp, fee) in enumerate(DOCTORS):
        u = User(email=email, password_hash=pw, full_name=name, role=Role.doctor, phone=f"+91 98000 0000{i}")
        u.doctor = Doctor(
            department=deps[dep],
            specialty=spec,
            qualifications=qual,
            registration_number=f"MCI-DEMO-{1000 + i}",
            experience_years=exp,
            consultation_fee=Decimal(fee),
            bio=f"{spec} with {exp} years of clinical experience. (Synthetic demo profile.)",
            is_approved=True,
            availability=[
                DoctorAvailability(weekday=d, start_time=time(9), end_time=time(13), slot_minutes=30) for d in range(6)
            ]
            + [DoctorAvailability(weekday=d, start_time=time(14), end_time=time(17), slot_minutes=30) for d in range(5)],
        )
        db.add(u)
        doctors.append(u.doctor)

    pending = User(email="dr.pending@example.com", password_hash=pw, full_name="Dr. Neha Kapoor", role=Role.doctor)
    pending.doctor = Doctor(
        department=deps["Dermatology"],
        specialty="Dermatologist",
        qualifications="MBBS, DDVL",
        registration_number="MCI-DEMO-2001",
        experience_years=4,
        is_approved=False,
    )
    db.add(pending)

    patients = []
    for email, name, dob, gender, bg in PATIENTS:
        u = User(email=email, password_hash=pw, full_name=name, role=Role.patient, phone="+91 99000 12345")
        u.patient = Patient(
            date_of_birth=datetime.fromisoformat(dob).date(), gender=gender, blood_group=bg, address="Bengaluru, KA"
        )
        if email == "asha@example.com":  # synthetic insurance, already verified by billing
            u.patient.insurer, u.patient.policy_number = "Demo Health Insurance", "DHI-000123"
            u.patient.insurance_status = InsuranceStatus.verified
        db.add(u)
        patients.append(u.patient)
    db.flush()

    now = now_local()
    today = now.date()

    def at(days: int, hour: int, minute: int = 0) -> datetime:
        return datetime.combine(today + timedelta(days=days), time(hour, minute))

    def appt(p, d, start, status, reason):
        a = Appointment(patient=p, doctor=d, start_at=start, end_at=start + timedelta(minutes=30), status=status, reason=reason)
        db.add(a)
        return a

    asha, rahul, meera = patients
    mehta, rao, iyer, khan, singh = doctors

    # Past, completed visit with notes, prescription, lab and a paid invoice.
    past = appt(asha, mehta, at(-14, 10), S.completed, "Fever and sore throat for 3 days")
    db.flush()
    db.add(MedicalRecord(patient_id=asha.id, doctor_id=mehta.id, appointment_id=past.id, chief_complaint="Fever, sore throat",
                         assessment="Likely viral pharyngitis (demo note).",
                         notes="Advised rest and fluids. Review if fever persists beyond 3 days.",
                         created_at=past.start_at + timedelta(minutes=20)))
    db.add(Prescription(patient_id=asha.id, doctor_id=mehta.id, appointment_id=past.id, notes="Take after food.",
                        created_at=past.start_at + timedelta(minutes=25),
                        items=[PrescriptionItem(medication="Paracetamol 500 mg", dosage="1 tablet", frequency="Every 8 hours if fever", duration_days=3),
                               PrescriptionItem(medication="Warm saline gargle", dosage="—", frequency="3 times a day", duration_days=5)]))
    lab_tech = db.scalar(select(User).where(User.email == "lab@example.com"))
    db.add(LabReport(patient_id=asha.id, doctor_id=mehta.id, appointment_id=past.id, test_name="Complete Blood Count",
                     status=LabStatus.completed, assigned_to_id=lab_tech.id, resulted_by_id=lab_tech.id, verified_by_id=lab_tech.id, result_summary="All values within reference range (synthetic).",
                     requested_at=past.start_at, completed_at=past.start_at + timedelta(days=1)))
    db.add(Invoice(patient_id=asha.id, appointment_id=past.id, description=f"Consultation – {mehta.user.full_name}",
                   amount=mehta.consultation_fee, status=InvoiceStatus.paid, issued_at=past.start_at, paid_at=past.start_at))

    past2 = appt(rahul, rao, at(-7, 11), S.completed, "Routine cardiac check-up")
    db.flush()
    db.add(MedicalRecord(patient_id=rahul.id, doctor_id=rao.id, appointment_id=past2.id, chief_complaint="Routine check-up",
                         notes="BP 128/82. ECG requested. Continue regular exercise.", created_at=past2.start_at))
    db.add(LabReport(patient_id=rahul.id, doctor_id=rao.id, appointment_id=past2.id, test_name="Lipid Profile", requested_at=past2.start_at))
    db.add(LabReport(patient_id=rahul.id, doctor_id=rao.id, appointment_id=past2.id, test_name="ECG", requested_at=past2.start_at,
                     status=LabStatus.collected, assigned_to_id=lab_tech.id, collected_at=past2.start_at + timedelta(hours=1)))
    db.add(Invoice(patient_id=rahul.id, appointment_id=past2.id, description=f"Consultation – {rao.user.full_name}",
                   amount=rao.consultation_fee, issued_at=past2.start_at))

    appt(meera, iyer, at(-3, 15), S.no_show, "Skin rash")
    appt(rahul, singh, at(-2, 9, 30), S.cancelled, "Knee pain")

    # Today's schedule for Dr. Mehta (some earlier today so they can be completed).
    appt(rahul, mehta, at(0, 9), S.confirmed, "Persistent cough")
    appt(meera, mehta, at(0, 9, 30), S.scheduled, "Headaches")
    appt(asha, mehta, at(0, 16), S.scheduled, "Follow-up")

    # Upcoming.
    appt(asha, rao, at(2, 10), S.confirmed, "Palpitations")
    appt(meera, khan, at(3, 11), S.scheduled, "Vaccination advice")
    appt(rahul, mehta, at(5, 14, 30), S.scheduled, "Blood test review")

    db.commit()
    db.close()
    print("Seeded synthetic demo data. Demo password for all accounts is in app/seed.py (DEMO_PASSWORD).")


def _ensure_staff(db, pw: str) -> int:
    added = 0
    for email, name, role in STAFF:
        if not db.scalar(select(User.id).where(User.email == email)):
            db.add(User(email=email, password_hash=pw, full_name=name, role=role))
            added += 1
    db.commit()
    return added


if __name__ == "__main__":
    run(reset="--reset" in sys.argv)
