"""Laboratory workflow. Lab technicians own results; doctors and patients only read verified ones.

requested --claim--> (assigned) --collected--> --processing--> --result--> resulted --verify--> completed
A completed (verified) result can only change through `amend`, which needs a reason and is audited.
"""

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models import LabReport, LabStatus as L, User
from app.services import audit, clinical, files
from app.services.notifications import notify
from app.utils import now_local

# Allowed manual status steps before a result is entered.
STEPS = {L.collected: {L.requested}, L.processing: {L.collected}}
ENTERABLE = {L.collected, L.processing, L.resulted}


def require_status(lab: LabReport, allowed: set[L], msg: str) -> None:
    if lab.status not in allowed:
        raise HTTPException(status.HTTP_409_CONFLICT, msg)


def get_order(db: Session, tech: User, lab_id: int, *, assigned: bool = True) -> LabReport:
    """404 unless the order is assigned to this technician (or, with assigned=False, still unclaimed)."""
    lab = db.scalar(select(LabReport).options(*clinical.lab_opts()).where(LabReport.id == lab_id))
    ok = lab and (lab.assigned_to_id == tech.id or (not assigned and lab.assigned_to_id is None))
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lab order not found")
    return lab


def claim(db: Session, tech: User, lab_id: int, ip=None) -> LabReport:
    # Conditional UPDATE so two technicians cannot claim the same order.
    res = db.execute(
        update(LabReport)
        .where(LabReport.id == lab_id, LabReport.assigned_to_id.is_(None), LabReport.status != L.completed)
        .values(assigned_to_id=tech.id)
    )
    if res.rowcount != 1:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "This order was already taken")
    audit.record(db, "lab.claim", tech.id, "lab_report", lab_id, ip=ip)
    db.commit()
    return get_order(db, tech, lab_id)


def set_step(db: Session, tech: User, lab: LabReport, new: L, ip=None) -> LabReport:
    if lab.status not in STEPS.get(new, set()):
        raise HTTPException(status.HTTP_409_CONFLICT, f"Cannot move from {lab.status.value} to {new.value}")
    lab.status = new
    if new == L.collected:
        lab.collected_at = now_local()
    audit.record(db, f"lab.{new.value}", tech.id, "lab_report", lab.id, ip=ip)
    db.commit()
    return lab


def enter_result(db: Session, tech: User, lab: LabReport, summary: str, file_info, ip=None) -> LabReport:
    require_status(lab, ENTERABLE, "Collect the sample before entering a result")
    if file_info:
        files.delete(lab.file_key)
        lab.file_key, lab.file_name, lab.file_mime = file_info
    lab.result_summary = summary
    lab.status = L.resulted
    lab.resulted_by_id = tech.id
    audit.record(db, "lab.result_entered", tech.id, "lab_report", lab.id, detail="with file" if file_info else None, ip=ip)
    db.commit()
    return lab


def _announce(db: Session, lab: LabReport, title: str) -> None:
    # Generic wording: notifications never carry test names or values.
    notify(db, lab.patient.user_id, title, "A lab result in your records was updated.", "/patient/records")
    notify(db, lab.doctor.user_id, title, f"Lab order #{lab.id} for patient {lab.patient.code} has a verified result.", "/doctor/labs?tab=completed")


def verify(db: Session, tech: User, lab: LabReport, ip=None) -> LabReport:
    if lab.status != L.resulted or not lab.result_summary:
        raise HTTPException(status.HTTP_409_CONFLICT, "Only an entered result can be verified")
    lab.status = L.completed
    lab.verified_by_id = tech.id
    lab.completed_at = now_local()
    _announce(db, lab, "Lab result available")
    audit.record(db, "lab.verify", tech.id, "lab_report", lab.id, ip=ip)
    db.commit()
    return lab


def amend(db: Session, tech: User, lab: LabReport, summary: str, reason: str, file_info, ip=None) -> LabReport:
    """Authorised correction of a verified result: reason required, audited, doctor and patient notified."""
    require_status(lab, {L.completed}, "Only verified results are amended; edit the entry instead")
    changed = []
    if summary != lab.result_summary:
        lab.result_summary = summary
        changed.append("summary")
    if file_info:
        files.delete(lab.file_key)
        lab.file_key, lab.file_name, lab.file_mime = file_info
        changed.append("file")
    if not changed:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Nothing changed")
    lab.amended_at = now_local()
    lab.amendment_reason = reason
    lab.verified_by_id = tech.id
    _announce(db, lab, "Lab result amended")
    audit.record(db, "lab.amend", tech.id, "lab_report", lab.id, detail="fields: " + ",".join(changed), ip=ip)
    db.commit()
    return lab
