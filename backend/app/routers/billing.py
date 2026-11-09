"""Billing / insurance / prescription-fulfilment desk.

Billing staff see identity, contact, insurance and money, plus the dispensing
details of prescriptions. They never see consultation notes, diagnoses or lab
results, and cannot change any clinical content.
"""

from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.permissions import Perm
from app.db import get_db
from app.deps import client_ip, require_perm
from app.models import (
    ClaimStatus as C,
    Doctor,
    FulfilmentStatus,
    InsuranceClaim,
    InsuranceStatus,
    Invoice,
    InvoiceStatus as I,
    Patient,
    Prescription,
    User,
)
from app.schemas import (
    BillingPatient,
    BillingSummary,
    ClaimCreate,
    ClaimOut,
    ClaimUpdate,
    FulfilmentIn,
    FulfilmentRow,
    InsuranceIn,
    InvoiceCreate,
    InvoiceOut,
    Page,
    PaymentIn,
    VoidIn,
)
from app.services import audit
from app.services.notifications import notify
from app.utils import now_local

router = APIRouter(prefix="/billing", tags=["billing"])
invoices_perm = require_perm(Perm.billing_invoices)
insurance_perm = require_perm(Perm.billing_insurance)
fulfilment_perm = require_perm(Perm.billing_fulfilment)

# Claim lifecycle: submitted -> approved|rejected, approved -> settled. Rejected and settled are final.
CLAIM_STEPS = {C.submitted: {C.approved, C.rejected}, C.approved: {C.settled}}
RX_STEPS = {
    FulfilmentStatus.pending: {FulfilmentStatus.ready, FulfilmentStatus.unavailable, FulfilmentStatus.dispensed},
    FulfilmentStatus.unavailable: {FulfilmentStatus.ready, FulfilmentStatus.pending},
    FulfilmentStatus.ready: {FulfilmentStatus.dispensed, FulfilmentStatus.unavailable},
}


def _page(db: Session, stmt, page: int, size: int):
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    return db.scalars(stmt.offset((page - 1) * size).limit(size)).all(), total


def _patient_filter(stmt, patient_col, q: str | None):
    if not q:
        return stmt
    stmt = stmt.join(Patient, Patient.id == patient_col).join(User, User.id == Patient.user_id)
    q = q.strip()
    if q.upper().startswith("PT-") and q[3:].isdigit():
        return stmt.where(Patient.id == int(q[3:]))
    like = f"%{q.lower()}%"
    return stmt.where(or_(func.lower(User.full_name).like(like), func.lower(User.email).like(like)))


def _inv_query():
    return select(Invoice).options(selectinload(Invoice.patient).selectinload(Patient.user))


def _get_invoice(db: Session, invoice_id: int) -> Invoice:
    inv = db.scalar(_inv_query().where(Invoice.id == invoice_id))
    if not inv:
        raise HTTPException(404, "Invoice not found")
    return inv


# ---------- summary ----------
@router.get("/summary", response_model=BillingSummary)
def summary(db: Session = Depends(get_db), _: User = Depends(invoices_perm)):
    today = datetime.combine(now_local().date(), datetime.min.time())
    unpaid_count, unpaid_total = db.execute(
        select(func.count(Invoice.id), func.coalesce(func.sum(Invoice.amount), 0)).where(Invoice.status == I.unpaid)
    ).one()
    return BillingSummary(
        unpaid_count=unpaid_count,
        unpaid_total=Decimal(unpaid_total),
        collected_today=Decimal(
            db.scalar(select(func.coalesce(func.sum(Invoice.amount), 0)).where(Invoice.status == I.paid, Invoice.paid_at >= today)) or 0
        ),
        open_claims=db.scalar(select(func.count(InsuranceClaim.id)).where(InsuranceClaim.status.in_((C.submitted, C.approved)))) or 0,
        pending_fulfilment=db.scalar(
            select(func.count(Prescription.id)).where(Prescription.fulfilment_status.in_((FulfilmentStatus.pending, FulfilmentStatus.ready)))
        )
        or 0,
    )


# ---------- patients (minimum info) ----------
@router.get("/patients", response_model=Page[BillingPatient])
def patients(
    q: str | None = Query(default=None, max_length=80),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(invoices_perm),
):
    stmt = _patient_filter(select(Patient).options(selectinload(Patient.user)), Patient.id, q)
    rows, total = _page(db, stmt.order_by(Patient.id.desc()), page, size)
    return Page(items=[BillingPatient.build(p) for p in rows], total=total, page=page, size=size)


@router.put("/patients/{patient_id}/insurance", response_model=BillingPatient)
def set_insurance(
    patient_id: int, data: InsuranceIn, request: Request, db: Session = Depends(get_db), staff: User = Depends(insurance_perm)
):
    p = db.get(Patient, patient_id)
    if not p:
        raise HTTPException(404, "Patient not found")
    if data.status == InsuranceStatus.verified and not (data.insurer and data.policy_number):
        raise HTTPException(422, "Insurer and policy number are required to verify insurance")
    before = p.insurance_status
    p.insurer, p.policy_number, p.insurance_status = data.insurer, data.policy_number, data.status
    if before != data.status:
        notify(db, p.user_id, "Insurance status updated", f"Your insurance details are now {data.status.value}.", "/patient/billing")
    audit.record(db, "insurance.update", staff.id, "patient", p.id, detail=f"{before.value}->{data.status.value}", ip=client_ip(request))
    db.commit()
    return BillingPatient.build(p)


# ---------- invoices ----------
@router.get("/invoices", response_model=Page[InvoiceOut])
def invoices(
    status: I | None = None,
    q: str | None = Query(default=None, max_length=80),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(invoices_perm),
):
    stmt = _patient_filter(_inv_query(), Invoice.patient_id, q)
    if status:
        stmt = stmt.where(Invoice.status == status)
    rows, total = _page(db, stmt.order_by(Invoice.issued_at.desc(), Invoice.id.desc()), page, size)
    return Page(items=[InvoiceOut.build(i) for i in rows], total=total, page=page, size=size)


@router.post("/invoices", response_model=InvoiceOut, status_code=201)
def create_invoice(data: InvoiceCreate, request: Request, db: Session = Depends(get_db), staff: User = Depends(invoices_perm)):
    p = db.get(Patient, data.patient_id)
    if not p:
        raise HTTPException(404, "Patient not found")
    inv = Invoice(patient_id=p.id, description=data.description.strip(), amount=data.amount)
    db.add(inv)
    db.flush()
    notify(db, p.user_id, "New invoice", f"Invoice #{inv.id} was issued.", "/patient/billing")
    audit.record(db, "invoice.create", staff.id, "invoice", inv.id, detail=f"amount={data.amount}", ip=client_ip(request))
    db.commit()
    return InvoiceOut.build(_get_invoice(db, inv.id))


@router.post("/invoices/{invoice_id}/pay", response_model=InvoiceOut)
def record_payment(
    invoice_id: int, data: PaymentIn, request: Request, db: Session = Depends(get_db), staff: User = Depends(invoices_perm)
):
    inv = _get_invoice(db, invoice_id)
    if inv.status != I.unpaid:
        raise HTTPException(409, "This invoice is final and can't be changed")
    inv.status, inv.paid_at = I.paid, now_local()
    inv.payment_method, inv.payment_reference, inv.finalized_by_id = data.method, data.reference, staff.id
    notify(db, inv.patient.user_id, "Payment recorded", f"Invoice #{inv.id} (₹{inv.amount}) is marked as paid.", "/patient/billing")
    audit.record(db, "invoice.paid", staff.id, "invoice", inv.id, detail=f"method={data.method} amount={inv.amount}", ip=client_ip(request))
    db.commit()
    return InvoiceOut.build(inv)


@router.post("/invoices/{invoice_id}/void", response_model=InvoiceOut)
def void_invoice(invoice_id: int, data: VoidIn, request: Request, db: Session = Depends(get_db), staff: User = Depends(invoices_perm)):
    inv = _get_invoice(db, invoice_id)
    if inv.status != I.unpaid:
        raise HTTPException(409, "This invoice is final and can't be changed")
    inv.status, inv.note, inv.finalized_by_id = I.void, data.reason, staff.id
    notify(db, inv.patient.user_id, "Invoice voided", f"Invoice #{inv.id} was voided.", "/patient/billing")
    audit.record(db, "invoice.void", staff.id, "invoice", inv.id, detail=data.reason, ip=client_ip(request))
    db.commit()
    return InvoiceOut.build(inv)


# ---------- insurance claims ----------
def _claim_query():
    return select(InsuranceClaim).options(selectinload(InsuranceClaim.patient).selectinload(Patient.user))


@router.get("/claims", response_model=Page[ClaimOut])
def claims(
    status: C | None = None,
    q: str | None = Query(default=None, max_length=80),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(insurance_perm),
):
    stmt = _patient_filter(_claim_query(), InsuranceClaim.patient_id, q)
    if status:
        stmt = stmt.where(InsuranceClaim.status == status)
    rows, total = _page(db, stmt.order_by(InsuranceClaim.updated_at.desc(), InsuranceClaim.id.desc()), page, size)
    return Page(items=[ClaimOut.build(c) for c in rows], total=total, page=page, size=size)


@router.post("/claims", response_model=ClaimOut, status_code=201)
def create_claim(data: ClaimCreate, request: Request, db: Session = Depends(get_db), staff: User = Depends(insurance_perm)):
    inv = _get_invoice(db, data.invoice_id)
    p = inv.patient
    if inv.status == I.void:
        raise HTTPException(409, "Void invoices can't be claimed")
    if p.insurance_status != InsuranceStatus.verified:
        raise HTTPException(409, "Verify the patient's insurance before filing a claim")
    if data.amount_claimed > inv.amount:
        raise HTTPException(422, "Claim exceeds the invoice amount")
    open_claim = db.scalar(
        select(InsuranceClaim.id).where(InsuranceClaim.invoice_id == inv.id, InsuranceClaim.status != C.rejected)
    )
    if open_claim:
        raise HTTPException(409, "This invoice already has a claim")
    claim = InsuranceClaim(
        invoice_id=inv.id, patient_id=p.id, insurer=p.insurer, policy_number=p.policy_number,
        amount_claimed=data.amount_claimed, created_by_id=staff.id,
    )
    db.add(claim)
    db.flush()
    notify(db, p.user_id, "Insurance claim filed", f"A claim was filed with {p.insurer} for invoice #{inv.id}.", "/patient/billing")
    audit.record(db, "claim.create", staff.id, "insurance_claim", claim.id, detail=f"invoice={inv.id} amount={data.amount_claimed}", ip=client_ip(request))
    db.commit()
    return ClaimOut.build(db.scalar(_claim_query().where(InsuranceClaim.id == claim.id)))


@router.patch("/claims/{claim_id}", response_model=ClaimOut)
def update_claim(claim_id: int, data: ClaimUpdate, request: Request, db: Session = Depends(get_db), staff: User = Depends(insurance_perm)):
    claim = db.scalar(_claim_query().where(InsuranceClaim.id == claim_id))
    if not claim:
        raise HTTPException(404, "Claim not found")
    if data.status not in CLAIM_STEPS.get(claim.status, set()):
        raise HTTPException(409, f"Cannot move a {claim.status.value} claim to {data.status.value}")
    if data.status == C.approved:
        if data.amount_approved is None:
            raise HTTPException(422, "Enter the approved amount")
        if data.amount_approved > claim.amount_claimed:
            raise HTTPException(422, "Approved amount exceeds the claimed amount")
        claim.amount_approved = data.amount_approved
    before = claim.status
    claim.status = data.status
    if data.note:
        claim.note = data.note
    notify(db, claim.patient.user_id, "Insurance claim updated", f"Your claim #{claim.id} is now {data.status.value}.", "/patient/billing")
    audit.record(db, "claim.status", staff.id, "insurance_claim", claim.id, detail=f"{before.value}->{data.status.value}", ip=client_ip(request))
    db.commit()
    return ClaimOut.build(claim)


# ---------- prescription fulfilment ----------
def _rx_query():
    return select(Prescription).options(
        selectinload(Prescription.items),
        selectinload(Prescription.patient).selectinload(Patient.user),
        selectinload(Prescription.doctor).selectinload(Doctor.user),
    )


@router.get("/prescriptions", response_model=Page[FulfilmentRow])
def prescriptions(
    status: FulfilmentStatus | None = None,
    q: str | None = Query(default=None, max_length=80),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(fulfilment_perm),
):
    stmt = _patient_filter(_rx_query(), Prescription.patient_id, q)
    if status:
        stmt = stmt.where(Prescription.fulfilment_status == status)
    rows, total = _page(db, stmt.order_by(Prescription.created_at.desc(), Prescription.id.desc()), page, size)
    return Page(items=[FulfilmentRow.build(p) for p in rows], total=total, page=page, size=size)


@router.patch("/prescriptions/{rx_id}/fulfilment", response_model=FulfilmentRow)
def set_fulfilment(rx_id: int, data: FulfilmentIn, request: Request, db: Session = Depends(get_db), staff: User = Depends(fulfilment_perm)):
    rx = db.scalar(_rx_query().where(Prescription.id == rx_id))
    if not rx:
        raise HTTPException(404, "Prescription not found")
    if data.status not in RX_STEPS.get(rx.fulfilment_status, set()):
        raise HTTPException(409, f"Cannot move from {rx.fulfilment_status.value} to {data.status.value}")
    before = rx.fulfilment_status
    rx.fulfilment_status, rx.fulfilment_note = data.status, data.note
    rx.fulfilment_updated_at, rx.fulfilment_by_id = now_local(), staff.id
    labels = {"ready": "is ready for collection", "dispensed": "was dispensed", "unavailable": "is waiting on stock", "pending": "is being prepared"}
    notify(db, rx.patient.user_id, "Prescription update", f"Prescription #{rx.id} {labels[data.status.value]}.", "/patient/records?tab=prescriptions")
    audit.record(db, "prescription.fulfilment", staff.id, "prescription", rx.id, detail=f"{before.value}->{data.status.value}", ip=client_ip(request))
    db.commit()
    return FulfilmentRow.build(rx)
