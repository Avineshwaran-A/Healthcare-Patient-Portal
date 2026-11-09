from datetime import date, datetime, time
from decimal import Decimal
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.models import AppointmentStatus, ClaimStatus, FulfilmentStatus, InsuranceStatus, InvoiceStatus, LabStatus, Role

T = TypeVar("T")


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    size: int


class Message(BaseModel):
    detail: str


# ---------- auth ----------
Password = Field(min_length=10, max_length=128)
Name = Field(min_length=2, max_length=120)
Phone = Field(default=None, pattern=r"^\+?[0-9 \-]{7,20}$")


class _PasswordRule(BaseModel):
    password: str = Password

    @field_validator("password")
    @classmethod
    def _strength(cls, v: str) -> str:
        if not any(c.isalpha() for c in v) or not any(c.isdigit() for c in v):
            raise ValueError("Password must contain letters and numbers")
        return v


class PatientRegister(_PasswordRule):
    email: EmailStr
    full_name: str = Name
    phone: str | None = Phone
    date_of_birth: date | None = None
    gender: str | None = Field(default=None, max_length=20)


class DoctorRegister(_PasswordRule):
    email: EmailStr
    full_name: str = Name
    phone: str | None = Phone
    department_id: int | None = None
    specialty: str = Field(min_length=2, max_length=120)
    qualifications: str = Field(min_length=2, max_length=300)
    registration_number: str = Field(min_length=3, max_length=50)
    experience_years: int = Field(default=0, ge=0, le=70)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserOut(ORM):
    id: int
    email: str
    full_name: str
    phone: str | None
    role: Role
    is_active: bool
    created_at: datetime


class MeOut(UserOut):
    patient_id: int | None = None
    doctor_id: int | None = None
    permissions: list[str] = []


# ---------- catalog ----------
class DepartmentIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    description: str | None = Field(default=None, max_length=500)


class DepartmentOut(ORM):
    id: int
    name: str
    description: str | None


class DoctorOut(ORM):
    id: int
    full_name: str
    specialty: str
    qualifications: str
    experience_years: int
    consultation_fee: Decimal
    bio: str | None
    department: DepartmentOut | None
    is_approved: bool

    @model_validator(mode="before")
    @classmethod
    def _flatten(cls, obj):
        if hasattr(obj, "user"):
            return {
                "id": obj.id,
                "full_name": obj.user.full_name,
                "specialty": obj.specialty,
                "qualifications": obj.qualifications,
                "experience_years": obj.experience_years,
                "consultation_fee": obj.consultation_fee,
                "bio": obj.bio,
                "department": obj.department,
                "is_approved": obj.is_approved,
            }
        return obj


class AvailabilityIn(BaseModel):
    weekday: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    slot_minutes: int = Field(default=30, ge=10, le=120)

    @model_validator(mode="after")
    def _range(self):
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class AvailabilityOut(ORM, AvailabilityIn):
    id: int


class AvailabilityReplace(BaseModel):
    windows: list[AvailabilityIn] = Field(max_length=21)


class DoctorDetail(DoctorOut):
    availability: list[AvailabilityOut] = []

    @model_validator(mode="before")
    @classmethod
    def _flatten(cls, obj):
        if hasattr(obj, "user"):
            data = DoctorOut._flatten(obj)
            data["availability"] = obj.availability
            return data
        return obj


class Slot(BaseModel):
    start_at: datetime
    end_at: datetime


# ---------- patient ----------
class PatientProfileIn(BaseModel):
    full_name: str = Name
    phone: str | None = Phone
    date_of_birth: date | None = None
    gender: str | None = Field(default=None, max_length=20)
    blood_group: str | None = Field(default=None, pattern=r"^(A|B|AB|O)[+-]$")
    address: str | None = Field(default=None, max_length=300)
    emergency_contact: str | None = Field(default=None, max_length=120)
    allergies: str | None = Field(default=None, max_length=500)


class PatientProfileOut(BaseModel):
    id: int
    patient_code: str
    email: str
    full_name: str
    phone: str | None
    date_of_birth: date | None
    gender: str | None
    blood_group: str | None
    address: str | None
    emergency_contact: str | None
    allergies: str | None
    insurer: str | None = None
    policy_number: str | None = None
    insurance_status: InsuranceStatus = InsuranceStatus.unverified


# ---------- appointments ----------
class AppointmentCreate(BaseModel):
    doctor_id: int
    start_at: datetime
    reason: str | None = Field(default=None, max_length=500)


class AppointmentReschedule(BaseModel):
    start_at: datetime


class AppointmentStatusIn(BaseModel):
    status: AppointmentStatus


class PersonBrief(BaseModel):
    id: int
    full_name: str


class AppointmentOut(BaseModel):
    id: int
    start_at: datetime
    end_at: datetime
    status: AppointmentStatus
    reason: str | None
    patient: PersonBrief
    doctor: PersonBrief
    specialty: str
    has_record: bool = False

    @classmethod
    def build(cls, a, has_record: bool = False) -> "AppointmentOut":
        return cls(
            id=a.id,
            start_at=a.start_at,
            end_at=a.end_at,
            status=a.status,
            reason=a.reason,
            patient=PersonBrief(id=a.patient.id, full_name=a.patient.user.full_name),
            doctor=PersonBrief(id=a.doctor.id, full_name=a.doctor.user.full_name),
            specialty=a.doctor.specialty,
            has_record=has_record,
        )


# ---------- clinical ----------
class RxItemIn(BaseModel):
    medication: str = Field(min_length=1, max_length=150)
    dosage: str = Field(min_length=1, max_length=80)
    frequency: str = Field(min_length=1, max_length=80)
    duration_days: int = Field(ge=1, le=365)
    instructions: str | None = Field(default=None, max_length=300)


class RxItemOut(ORM, RxItemIn):
    id: int


class ConsultationIn(BaseModel):
    chief_complaint: str | None = Field(default=None, max_length=500)
    assessment: str | None = Field(default=None, max_length=5000)
    notes: str = Field(min_length=1, max_length=10000)
    prescription_items: list[RxItemIn] = Field(default=[], max_length=20)
    prescription_notes: str | None = Field(default=None, max_length=1000)
    lab_tests: list[str] = Field(default=[], max_length=10)
    follow_up_in_days: int | None = Field(default=None, ge=1, le=365)
    mark_completed: bool = True

    @field_validator("lab_tests")
    @classmethod
    def _labs(cls, v: list[str]) -> list[str]:
        out = [t.strip() for t in v if t.strip()]
        if any(len(t) > 150 for t in out):
            raise ValueError("Lab test name too long")
        return out


class MedicalRecordOut(BaseModel):
    id: int
    appointment_id: int | None
    doctor_id: int
    doctor_name: str
    chief_complaint: str | None
    assessment: str | None
    notes: str
    follow_up_date: date | None
    created_at: datetime
    amended_at: datetime | None
    amendment_reason: str | None

    @classmethod
    def build(cls, r) -> "MedicalRecordOut":
        return cls(
            id=r.id,
            appointment_id=r.appointment_id,
            doctor_id=r.doctor_id,
            doctor_name=r.doctor.user.full_name,
            chief_complaint=r.chief_complaint,
            assessment=r.assessment,
            notes=r.notes,
            follow_up_date=r.follow_up_date,
            created_at=r.created_at,
            amended_at=r.amended_at,
            amendment_reason=r.amendment_reason,
        )


class RecordAmendIn(BaseModel):
    chief_complaint: str | None = Field(default=None, max_length=500)
    assessment: str | None = Field(default=None, max_length=5000)
    notes: str = Field(min_length=1, max_length=10000)
    follow_up_date: date | None = None
    reason: str = Field(min_length=5, max_length=300)


class EmergencyAccessIn(BaseModel):
    reason: str = Field(min_length=15, max_length=300)


class PrescriptionOut(BaseModel):
    id: int
    appointment_id: int | None
    doctor_name: str
    notes: str | None
    created_at: datetime
    items: list[RxItemOut]
    fulfilment_status: FulfilmentStatus
    fulfilment_note: str | None
    fulfilment_updated_at: datetime | None

    @classmethod
    def build(cls, p) -> "PrescriptionOut":
        return cls(
            id=p.id,
            appointment_id=p.appointment_id,
            doctor_name=p.doctor.user.full_name,
            notes=p.notes,
            created_at=p.created_at,
            items=[RxItemOut.model_validate(i) for i in p.items],
            fulfilment_status=p.fulfilment_status,
            fulfilment_note=p.fulfilment_note,
            fulfilment_updated_at=p.fulfilment_updated_at,
        )


class FulfilmentRow(PrescriptionOut):
    """Billing desk view: dispensing details only, no diagnoses or consultation notes."""

    patient_name: str
    patient_code: str

    @classmethod
    def build(cls, p) -> "FulfilmentRow":
        base = PrescriptionOut.build(p).model_dump()
        return cls(**base, patient_name=p.patient.user.full_name, patient_code=p.patient.code)


class FulfilmentIn(BaseModel):
    status: FulfilmentStatus
    note: str | None = Field(default=None, max_length=300)


class LabReportOut(BaseModel):
    id: int
    appointment_id: int | None
    doctor_name: str
    patient_id: int
    patient_code: str
    patient_name: str
    test_name: str
    status: LabStatus
    assigned_to: str | None = None
    assigned_to_id: int | None = None
    result_summary: str | None
    has_file: bool
    file_name: str | None
    requested_at: datetime
    collected_at: datetime | None = None
    completed_at: datetime | None
    amended_at: datetime | None = None
    amendment_reason: str | None = None

    @classmethod
    def build(cls, r, reveal: bool = False) -> "LabReportOut":
        """Results are hidden until verified, except for the lab (reveal=True)."""
        show = reveal or r.status == LabStatus.completed
        return cls(
            id=r.id,
            appointment_id=r.appointment_id,
            doctor_name=r.doctor.user.full_name,
            patient_id=r.patient_id,
            patient_code=r.patient.code,
            patient_name=r.patient.user.full_name,
            test_name=r.test_name,
            status=r.status,
            assigned_to=r.assigned_to.full_name if r.assigned_to else None,
            assigned_to_id=r.assigned_to_id,
            result_summary=r.result_summary if show else None,
            has_file=bool(r.file_key) and show,
            file_name=r.file_name if show else None,
            requested_at=r.requested_at,
            collected_at=r.collected_at,
            completed_at=r.completed_at,
            amended_at=r.amended_at,
            amendment_reason=r.amendment_reason if show else None,
        )


class LabPatient(BaseModel):
    """Minimum identification the lab needs: no notes, prescriptions or contact details."""

    id: int
    patient_code: str
    full_name: str
    date_of_birth: date | None
    gender: str | None


class LabOrderDetail(BaseModel):
    order: LabReportOut
    patient: LabPatient
    history: list[LabReportOut]  # this patient's earlier verified lab results


class LabStatusIn(BaseModel):
    status: Literal["collected", "processing"]


class LabSummary(BaseModel):
    queue: int
    mine_active: int
    awaiting_verification: int
    verified_today: int


class PatientHistory(BaseModel):
    patient: PatientProfileOut
    records: list[MedicalRecordOut]
    prescriptions: list[PrescriptionOut]
    labs: list[LabReportOut]


# ---------- billing / notifications ----------
class InvoiceOut(BaseModel):
    id: int
    appointment_id: int | None
    patient_id: int
    patient_code: str
    patient_name: str
    description: str
    amount: Decimal
    status: InvoiceStatus
    issued_at: datetime
    paid_at: datetime | None
    payment_method: str | None
    payment_reference: str | None
    note: str | None

    @classmethod
    def build(cls, i) -> "InvoiceOut":
        return cls(
            id=i.id,
            appointment_id=i.appointment_id,
            patient_id=i.patient_id,
            patient_code=i.patient.code,
            patient_name=i.patient.user.full_name,
            description=i.description,
            amount=i.amount,
            status=i.status,
            issued_at=i.issued_at,
            paid_at=i.paid_at,
            payment_method=i.payment_method,
            payment_reference=i.payment_reference,
            note=i.note,
        )


Money = Field(gt=0, le=10_000_000, max_digits=10, decimal_places=2)


class InvoiceCreate(BaseModel):
    patient_id: int
    description: str = Field(min_length=3, max_length=300)
    amount: Decimal = Money


class PaymentIn(BaseModel):
    method: Literal["cash", "card", "upi", "bank_transfer", "insurance"]
    reference: str | None = Field(default=None, max_length=80)


class VoidIn(BaseModel):
    reason: str = Field(min_length=5, max_length=300)


class BillingPatient(BaseModel):
    """Minimum information billing needs: identity, contact and insurance. No clinical data."""

    id: int
    patient_code: str
    full_name: str
    email: str
    phone: str | None
    insurer: str | None
    policy_number: str | None
    insurance_status: InsuranceStatus

    @classmethod
    def build(cls, p) -> "BillingPatient":
        return cls(
            id=p.id,
            patient_code=p.code,
            full_name=p.user.full_name,
            email=p.user.email,
            phone=p.user.phone,
            insurer=p.insurer,
            policy_number=p.policy_number,
            insurance_status=p.insurance_status,
        )


class InsuranceIn(BaseModel):
    insurer: str | None = Field(default=None, max_length=120)
    policy_number: str | None = Field(default=None, max_length=60)
    status: InsuranceStatus


class ClaimOut(BaseModel):
    id: int
    invoice_id: int
    patient_id: int
    patient_code: str
    patient_name: str
    insurer: str
    policy_number: str
    amount_claimed: Decimal
    amount_approved: Decimal | None
    status: ClaimStatus
    note: str | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def build(cls, c) -> "ClaimOut":
        return cls(
            id=c.id,
            invoice_id=c.invoice_id,
            patient_id=c.patient_id,
            patient_code=c.patient.code,
            patient_name=c.patient.user.full_name,
            insurer=c.insurer,
            policy_number=c.policy_number,
            amount_claimed=c.amount_claimed,
            amount_approved=c.amount_approved,
            status=c.status,
            note=c.note,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )


class ClaimCreate(BaseModel):
    invoice_id: int
    amount_claimed: Decimal = Money


class ClaimUpdate(BaseModel):
    status: ClaimStatus
    amount_approved: Decimal | None = Field(default=None, ge=0, le=10_000_000, max_digits=10, decimal_places=2)
    note: str | None = Field(default=None, max_length=300)


class BillingSummary(BaseModel):
    unpaid_count: int
    unpaid_total: Decimal
    collected_today: Decimal
    open_claims: int
    pending_fulfilment: int


class NotificationOut(ORM):
    id: int
    title: str
    message: str
    link: str | None
    is_read: bool
    created_at: datetime


class NotificationList(BaseModel):
    items: list[NotificationOut]
    unread: int


# ---------- admin ----------
class UserStatusIn(BaseModel):
    is_active: bool


StaffRole = Literal["lab", "billing", "admin"]


class StaffCreate(_PasswordRule):
    email: EmailStr
    full_name: str = Name
    phone: str | None = Phone
    role: StaffRole


class RoleIn(BaseModel):
    role: StaffRole


class AdminDoctorRow(BaseModel):
    id: int
    user_id: int
    full_name: str
    email: str
    specialty: str
    registration_number: str
    department: str | None
    is_approved: bool
    is_active: bool


class DoctorAdminUpdate(BaseModel):
    department_id: int | None = None
    consultation_fee: Decimal | None = Field(default=None, ge=0, le=100000)
    specialty: str | None = Field(default=None, min_length=2, max_length=120)


class AuditOut(BaseModel):
    id: int
    actor: str | None
    action: str
    entity_type: str | None
    entity_id: int | None
    detail: str | None
    ip_address: str | None
    created_at: datetime


class Stats(BaseModel):
    patients: int
    doctors: int
    pending_doctors: int
    departments: int
    appointments_today: int
    appointments_upcoming: int
    appointments_by_status: dict[str, int]
    revenue_paid: Decimal
    revenue_outstanding: Decimal
    appointments_last_7_days: list[dict]


class DoctorDashboard(BaseModel):
    today: list[AppointmentOut]
    upcoming_count: int
    completed_this_week: int
    pending_labs: int
