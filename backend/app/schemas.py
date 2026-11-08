from datetime import date, datetime, time
from decimal import Decimal
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.models import AppointmentStatus, InvoiceStatus, LabStatus, Role

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
    email: str
    full_name: str
    phone: str | None
    date_of_birth: date | None
    gender: str | None
    blood_group: str | None
    address: str | None
    emergency_contact: str | None
    allergies: str | None


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
    doctor_name: str
    chief_complaint: str | None
    assessment: str | None
    notes: str
    created_at: datetime

    @classmethod
    def build(cls, r) -> "MedicalRecordOut":
        return cls(
            id=r.id,
            appointment_id=r.appointment_id,
            doctor_name=r.doctor.user.full_name,
            chief_complaint=r.chief_complaint,
            assessment=r.assessment,
            notes=r.notes,
            created_at=r.created_at,
        )


class PrescriptionOut(BaseModel):
    id: int
    appointment_id: int | None
    doctor_name: str
    notes: str | None
    created_at: datetime
    items: list[RxItemOut]

    @classmethod
    def build(cls, p) -> "PrescriptionOut":
        return cls(
            id=p.id,
            appointment_id=p.appointment_id,
            doctor_name=p.doctor.user.full_name,
            notes=p.notes,
            created_at=p.created_at,
            items=[RxItemOut.model_validate(i) for i in p.items],
        )


class LabReportOut(BaseModel):
    id: int
    appointment_id: int | None
    doctor_name: str
    patient_name: str
    test_name: str
    status: LabStatus
    result_summary: str | None
    has_file: bool
    file_name: str | None
    requested_at: datetime
    completed_at: datetime | None

    @classmethod
    def build(cls, r) -> "LabReportOut":
        return cls(
            id=r.id,
            appointment_id=r.appointment_id,
            doctor_name=r.doctor.user.full_name,
            patient_name=r.patient.user.full_name,
            test_name=r.test_name,
            status=r.status,
            result_summary=r.result_summary,
            has_file=bool(r.file_key),
            file_name=r.file_name,
            requested_at=r.requested_at,
            completed_at=r.completed_at,
        )


class PatientHistory(BaseModel):
    patient: PatientProfileOut
    records: list[MedicalRecordOut]
    prescriptions: list[PrescriptionOut]
    labs: list[LabReportOut]


# ---------- billing / notifications ----------
class InvoiceOut(BaseModel):
    id: int
    appointment_id: int | None
    patient_name: str
    description: str
    amount: Decimal
    status: InvoiceStatus
    issued_at: datetime
    paid_at: datetime | None

    @classmethod
    def build(cls, i) -> "InvoiceOut":
        return cls(
            id=i.id,
            appointment_id=i.appointment_id,
            patient_name=i.patient.user.full_name,
            description=i.description,
            amount=i.amount,
            status=i.status,
            issued_at=i.issued_at,
            paid_at=i.paid_at,
        )


class InvoiceStatusIn(BaseModel):
    status: InvoiceStatus


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
