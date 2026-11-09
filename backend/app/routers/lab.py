from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import client_ip, require_lab
from app.models import LabReport, LabStatus as L, Patient, User
from app.schemas import LabOrderDetail, LabPatient, LabReportOut, LabStatusIn, LabSummary, Page
from app.services import audit, clinical, files, lab as svc
from app.utils import now_local

router = APIRouter(prefix="/lab", tags=["lab"])


@router.get("/summary", response_model=LabSummary)
def summary(db: Session = Depends(get_db), tech: User = Depends(require_lab)):
    today = datetime.combine(now_local().date(), datetime.min.time())

    def c(*where):
        return db.scalar(select(func.count(LabReport.id)).where(*where)) or 0

    return LabSummary(
        queue=c(LabReport.assigned_to_id.is_(None), LabReport.status != L.completed),
        mine_active=c(LabReport.assigned_to_id == tech.id, LabReport.status.notin_((L.completed, L.resulted))),
        awaiting_verification=c(LabReport.assigned_to_id == tech.id, LabReport.status == L.resulted),
        verified_today=c(LabReport.assigned_to_id == tech.id, LabReport.status == L.completed, LabReport.completed_at >= today),
    )


@router.get("/orders", response_model=Page[LabReportOut])
def orders(
    scope: Literal["queue", "mine", "done"] = "mine",
    q: str | None = Query(default=None, max_length=80),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    tech: User = Depends(require_lab),
):
    stmt = select(LabReport).options(*clinical.lab_opts())
    if scope == "queue":
        stmt = stmt.where(LabReport.assigned_to_id.is_(None), LabReport.status != L.completed)
        order = LabReport.requested_at.asc()
    elif scope == "mine":
        stmt = stmt.where(LabReport.assigned_to_id == tech.id, LabReport.status != L.completed)
        order = LabReport.requested_at.asc()
    else:
        stmt = stmt.where(LabReport.assigned_to_id == tech.id, LabReport.status == L.completed)
        order = LabReport.completed_at.desc()
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.join(Patient, Patient.id == LabReport.patient_id).join(User, User.id == Patient.user_id)
        stmt = stmt.where(or_(func.lower(LabReport.test_name).like(like), func.lower(User.full_name).like(like)))
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    rows = db.scalars(stmt.order_by(order, LabReport.id).offset((page - 1) * size).limit(size)).all()
    return Page(items=[LabReportOut.build(r, reveal=True) for r in rows], total=total, page=page, size=size)


@router.get("/orders/{lab_id}", response_model=LabOrderDetail)
def order_detail(lab_id: int, request: Request, db: Session = Depends(get_db), tech: User = Depends(require_lab)):
    lab = svc.get_order(db, tech, lab_id, assigned=False)
    p = lab.patient
    history = []
    if lab.assigned_to_id == tech.id:  # prior results only once the order is this technician's
        history = [LabReportOut.build(r) for r in clinical.labs_for(db, p.id) if r.id != lab.id and r.status == L.completed]
    audit.record(db, "lab.view", tech.id, "lab_report", lab.id, ip=client_ip(request))
    db.commit()
    return LabOrderDetail(
        order=LabReportOut.build(lab, reveal=True),
        patient=LabPatient(id=p.id, patient_code=p.code, full_name=p.user.full_name, date_of_birth=p.date_of_birth, gender=p.gender),
        history=history,
    )


@router.post("/orders/{lab_id}/claim", response_model=LabReportOut)
def claim(lab_id: int, request: Request, db: Session = Depends(get_db), tech: User = Depends(require_lab)):
    return LabReportOut.build(svc.claim(db, tech, lab_id, ip=client_ip(request)), reveal=True)


@router.post("/orders/{lab_id}/status", response_model=LabReportOut)
def set_status(lab_id: int, data: LabStatusIn, request: Request, db: Session = Depends(get_db), tech: User = Depends(require_lab)):
    lab = svc.get_order(db, tech, lab_id)
    return LabReportOut.build(svc.set_step(db, tech, lab, L(data.status), ip=client_ip(request)), reveal=True)


@router.post("/orders/{lab_id}/result", response_model=LabReportOut)
async def enter_result(
    lab_id: int,
    request: Request,
    summary: str = Form(min_length=1, max_length=5000),
    file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    tech: User = Depends(require_lab),
):
    lab = svc.get_order(db, tech, lab_id)
    svc.require_status(lab, svc.ENTERABLE, "Collect the sample before entering a result")  # before saving any file
    info = await files.save_upload(file) if file is not None and file.filename else None
    return LabReportOut.build(svc.enter_result(db, tech, lab, summary, info, ip=client_ip(request)), reveal=True)


@router.post("/orders/{lab_id}/verify", response_model=LabReportOut)
def verify(lab_id: int, request: Request, db: Session = Depends(get_db), tech: User = Depends(require_lab)):
    lab = svc.get_order(db, tech, lab_id)
    return LabReportOut.build(svc.verify(db, tech, lab, ip=client_ip(request)), reveal=True)


@router.post("/orders/{lab_id}/amend", response_model=LabReportOut)
async def amend(
    lab_id: int,
    request: Request,
    summary: str = Form(min_length=1, max_length=5000),
    reason: str = Form(min_length=5, max_length=300),
    file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    tech: User = Depends(require_lab),
):
    lab = svc.get_order(db, tech, lab_id)
    svc.require_status(lab, {L.completed}, "Only verified results are amended; edit the entry instead")
    info = await files.save_upload(file) if file is not None and file.filename else None
    return LabReportOut.build(svc.amend(db, tech, lab, summary, reason, info, ip=client_ip(request)), reveal=True)
