"""Relational schema for the portal.

All appointment/schedule datetimes are naive *hospital wall-clock* times
(settings.timezone). Audit/creation timestamps use the same clock for
consistency in the UI.
"""

import enum
from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.utils import now_local


def _enum(cls):
    return Enum(cls, native_enum=False, length=20, values_callable=lambda e: [m.value for m in e])


class Role(str, enum.Enum):
    patient = "patient"
    doctor = "doctor"
    lab = "lab"  # lab technician
    billing = "billing"  # billing / insurance staff
    admin = "admin"


class AppointmentStatus(str, enum.Enum):
    scheduled = "scheduled"
    confirmed = "confirmed"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"


class LabStatus(str, enum.Enum):
    """requested -> collected -> processing -> resulted (entered, unverified) -> completed (verified, released).

    Only `completed` results are visible to doctors and patients.
    """

    requested = "requested"
    collected = "collected"
    processing = "processing"
    resulted = "resulted"
    completed = "completed"


class FulfilmentStatus(str, enum.Enum):
    pending = "pending"
    ready = "ready"
    dispensed = "dispensed"
    unavailable = "unavailable"


class InsuranceStatus(str, enum.Enum):
    unverified = "unverified"
    verified = "verified"
    rejected = "rejected"


class ClaimStatus(str, enum.Enum):
    submitted = "submitted"
    approved = "approved"
    rejected = "rejected"
    settled = "settled"


class InvoiceStatus(str, enum.Enum):
    unpaid = "unpaid"
    paid = "paid"
    void = "void"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(20))
    role: Mapped[Role] = mapped_column(_enum(Role), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_local)

    patient: Mapped["Patient | None"] = relationship(back_populates="user", uselist=False)
    doctor: Mapped["Doctor | None"] = relationship(back_populates="user", uselist=False)


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    description: Mapped[str | None] = mapped_column(String(500))

    doctors: Mapped[list["Doctor"]] = relationship(back_populates="department")


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    gender: Mapped[str | None] = mapped_column(String(20))
    blood_group: Mapped[str | None] = mapped_column(String(5))
    address: Mapped[str | None] = mapped_column(String(300))
    emergency_contact: Mapped[str | None] = mapped_column(String(120))
    allergies: Mapped[str | None] = mapped_column(String(500))
    # Insurance details are owned by billing staff; patients can only read them.
    insurer: Mapped[str | None] = mapped_column(String(120))
    policy_number: Mapped[str | None] = mapped_column(String(60))
    insurance_status: Mapped[InsuranceStatus] = mapped_column(
        _enum(InsuranceStatus), default=InsuranceStatus.unverified, server_default="unverified"
    )

    user: Mapped[User] = relationship(back_populates="patient")

    @property
    def code(self) -> str:
        """Human-facing Patient ID, derived from the unique primary key (one profile per patient)."""
        return f"PT-{self.id:06d}"


class Doctor(Base):
    __tablename__ = "doctors"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    department_id: Mapped[int | None] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"), index=True
    )
    specialty: Mapped[str] = mapped_column(String(120))
    qualifications: Mapped[str] = mapped_column(String(300))
    registration_number: Mapped[str] = mapped_column(String(50), unique=True)
    experience_years: Mapped[int] = mapped_column(Integer, default=0)
    consultation_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("500.00"))
    bio: Mapped[str | None] = mapped_column(String(1000))
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    user: Mapped[User] = relationship(back_populates="doctor")
    department: Mapped[Department | None] = relationship(back_populates="doctors")
    availability: Mapped[list["DoctorAvailability"]] = relationship(
        back_populates="doctor", cascade="all, delete-orphan", order_by="DoctorAvailability.weekday"
    )

    __table_args__ = (CheckConstraint("consultation_fee >= 0", name="ck_doctor_fee_nonneg"),)


class DoctorAvailability(Base):
    """Recurring weekly working window. weekday: 0=Monday … 6=Sunday."""

    __tablename__ = "doctor_availability"

    id: Mapped[int] = mapped_column(primary_key=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id", ondelete="CASCADE"), index=True)
    weekday: Mapped[int] = mapped_column(Integer)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    slot_minutes: Mapped[int] = mapped_column(Integer, default=30)

    doctor: Mapped[Doctor] = relationship(back_populates="availability")

    __table_args__ = (
        CheckConstraint("weekday BETWEEN 0 AND 6", name="ck_avail_weekday"),
        CheckConstraint("end_time > start_time", name="ck_avail_range"),
        CheckConstraint("slot_minutes BETWEEN 10 AND 120", name="ck_avail_slot"),
    )


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"))
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id", ondelete="CASCADE"))
    start_at: Mapped[datetime] = mapped_column(DateTime)
    end_at: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[AppointmentStatus] = mapped_column(
        _enum(AppointmentStatus), default=AppointmentStatus.scheduled
    )
    reason: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_local)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_local, onupdate=now_local)

    patient: Mapped[Patient] = relationship()
    doctor: Mapped[Doctor] = relationship()

    __table_args__ = (
        # Database-level guarantee against double booking: only one active
        # (non-cancelled) appointment per doctor per start time.
        Index(
            "uq_appointment_active_slot",
            "doctor_id",
            "start_at",
            unique=True,
            postgresql_where=text("status <> 'cancelled'"),
            sqlite_where=text("status <> 'cancelled'"),
        ),
        Index("ix_appointments_doctor_start", "doctor_id", "start_at"),
        Index("ix_appointments_patient_start", "patient_id", "start_at"),
        Index("ix_appointments_status", "status"),
        CheckConstraint("end_at > start_at", name="ck_appt_range"),
    )


class MedicalRecord(Base):
    """Consultation note written by a doctor. Not a diagnostic system."""

    __tablename__ = "medical_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id", ondelete="RESTRICT"))
    appointment_id: Mapped[int | None] = mapped_column(
        ForeignKey("appointments.id", ondelete="SET NULL"), unique=True
    )
    chief_complaint: Mapped[str | None] = mapped_column(String(500))
    assessment: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str] = mapped_column(Text)
    follow_up_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_local)
    # Author-only amendments; every change is audited with its reason.
    amended_at: Mapped[datetime | None] = mapped_column(DateTime)
    amendment_reason: Mapped[str | None] = mapped_column(String(300))

    doctor: Mapped[Doctor] = relationship()


class Prescription(Base):
    __tablename__ = "prescriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id", ondelete="RESTRICT"))
    appointment_id: Mapped[int | None] = mapped_column(
        ForeignKey("appointments.id", ondelete="SET NULL"), index=True
    )
    notes: Mapped[str | None] = mapped_column(String(1000))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_local)
    # Fulfilment is tracked by billing/pharmacy desk; it never changes the clinical content above.
    fulfilment_status: Mapped[FulfilmentStatus] = mapped_column(
        _enum(FulfilmentStatus), default=FulfilmentStatus.pending, server_default="pending", index=True
    )
    fulfilment_note: Mapped[str | None] = mapped_column(String(300))
    fulfilment_updated_at: Mapped[datetime | None] = mapped_column(DateTime)
    fulfilment_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    doctor: Mapped[Doctor] = relationship()
    patient: Mapped["Patient"] = relationship()
    items: Mapped[list["PrescriptionItem"]] = relationship(
        back_populates="prescription", cascade="all, delete-orphan"
    )


class PrescriptionItem(Base):
    __tablename__ = "prescription_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    prescription_id: Mapped[int] = mapped_column(
        ForeignKey("prescriptions.id", ondelete="CASCADE"), index=True
    )
    medication: Mapped[str] = mapped_column(String(150))
    dosage: Mapped[str] = mapped_column(String(80))
    frequency: Mapped[str] = mapped_column(String(80))
    duration_days: Mapped[int] = mapped_column(Integer)
    instructions: Mapped[str | None] = mapped_column(String(300))

    prescription: Mapped[Prescription] = relationship(back_populates="items")

    __table_args__ = (CheckConstraint("duration_days BETWEEN 1 AND 365", name="ck_rx_duration"),)


class LabReport(Base):
    __tablename__ = "lab_reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id", ondelete="RESTRICT"))
    appointment_id: Mapped[int | None] = mapped_column(ForeignKey("appointments.id", ondelete="SET NULL"))
    test_name: Mapped[str] = mapped_column(String(150))
    status: Mapped[LabStatus] = mapped_column(_enum(LabStatus), default=LabStatus.requested, index=True)
    assigned_to_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    resulted_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    verified_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    collected_at: Mapped[datetime | None] = mapped_column(DateTime)
    amended_at: Mapped[datetime | None] = mapped_column(DateTime)
    amendment_reason: Mapped[str | None] = mapped_column(String(300))
    result_summary: Mapped[str | None] = mapped_column(Text)
    file_key: Mapped[str | None] = mapped_column(String(100))  # random name on disk, never user-supplied
    file_name: Mapped[str | None] = mapped_column(String(200))
    file_mime: Mapped[str | None] = mapped_column(String(50))
    requested_at: Mapped[datetime] = mapped_column(DateTime, default=now_local)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)  # verified and released

    doctor: Mapped[Doctor] = relationship()
    patient: Mapped[Patient] = relationship()
    assigned_to: Mapped[User | None] = relationship(foreign_keys=[assigned_to_id])


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), index=True)
    appointment_id: Mapped[int | None] = mapped_column(
        ForeignKey("appointments.id", ondelete="SET NULL"), unique=True
    )
    description: Mapped[str] = mapped_column(String(300))
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    status: Mapped[InvoiceStatus] = mapped_column(
        _enum(InvoiceStatus), default=InvoiceStatus.unpaid, index=True
    )
    issued_at: Mapped[datetime] = mapped_column(DateTime, default=now_local)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime)
    # Paid and void invoices are final. These record who finalised them and how.
    payment_method: Mapped[str | None] = mapped_column(String(20))
    payment_reference: Mapped[str | None] = mapped_column(String(80))
    finalized_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    note: Mapped[str | None] = mapped_column(String(300))

    patient: Mapped[Patient] = relationship()

    __table_args__ = (CheckConstraint("amount >= 0", name="ck_invoice_amount_nonneg"),)


class InsuranceClaim(Base):
    __tablename__ = "insurance_claims"

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"), index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), index=True)
    insurer: Mapped[str] = mapped_column(String(120))
    policy_number: Mapped[str] = mapped_column(String(60))
    amount_claimed: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    amount_approved: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    status: Mapped[ClaimStatus] = mapped_column(_enum(ClaimStatus), default=ClaimStatus.submitted, index=True)
    note: Mapped[str | None] = mapped_column(String(300))
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_local)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_local, onupdate=now_local)

    invoice: Mapped[Invoice] = relationship()
    patient: Mapped[Patient] = relationship()

    __table_args__ = (
        CheckConstraint("amount_claimed > 0", name="ck_claim_amount_pos"),
        CheckConstraint("amount_approved IS NULL OR amount_approved >= 0", name="ck_claim_approved_nonneg"),
    )


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(150))
    message: Mapped[str] = mapped_column(String(500))
    link: Mapped[str | None] = mapped_column(String(200))
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_local)

    __table_args__ = (Index("ix_notifications_user_read", "user_id", "is_read", "created_at"),)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    actor_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    action: Mapped[str] = mapped_column(String(60), index=True)
    entity_type: Mapped[str | None] = mapped_column(String(40))
    entity_id: Mapped[int | None] = mapped_column(Integer)
    detail: Mapped[str | None] = mapped_column(String(500))  # never contains clinical content
    ip_address: Mapped[str | None] = mapped_column(String(45))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_local, index=True)

    actor: Mapped[User | None] = relationship()


__all__ = [
    "Role",
    "AppointmentStatus",
    "LabStatus",
    "InvoiceStatus",
    "FulfilmentStatus",
    "InsuranceStatus",
    "ClaimStatus",
    "InsuranceClaim",
    "User",
    "Department",
    "Patient",
    "Doctor",
    "DoctorAvailability",
    "Appointment",
    "MedicalRecord",
    "Prescription",
    "PrescriptionItem",
    "LabReport",
    "Invoice",
    "Notification",
    "AuditLog",
]
