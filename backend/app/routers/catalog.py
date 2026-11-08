from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.deps import get_current_user
from app.models import Department, Doctor, User
from app.schemas import DepartmentOut, DoctorDetail, DoctorOut, Page, Slot
from app.services import scheduling

router = APIRouter(tags=["catalog"])


@router.get("/departments", response_model=list[DepartmentOut])
def departments(db: Session = Depends(get_db)):
    # Public: used on the doctor registration form.
    return db.scalars(select(Department).order_by(Department.name)).all()


def _approved_doctor(db: Session, doctor_id: int) -> Doctor:
    d = db.scalar(
        select(Doctor)
        .options(selectinload(Doctor.user), selectinload(Doctor.department), selectinload(Doctor.availability))
        .join(User)
        .where(Doctor.id == doctor_id, Doctor.is_approved.is_(True), User.is_active.is_(True))
    )
    if not d:
        raise HTTPException(404, "Doctor not found")
    return d


@router.get("/doctors", response_model=Page[DoctorOut])
def search_doctors(
    q: str | None = Query(default=None, max_length=80),
    department_id: int | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(Doctor).join(User).where(Doctor.is_approved.is_(True), User.is_active.is_(True))
    if department_id:
        stmt = stmt.where(Doctor.department_id == department_id)
    if q:
        like = f"%{q.strip().lower()}%"
        stmt = stmt.where(or_(func.lower(User.full_name).like(like), func.lower(Doctor.specialty).like(like)))
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(
        stmt.options(selectinload(Doctor.user), selectinload(Doctor.department))
        .order_by(User.full_name)
        .offset((page - 1) * size)
        .limit(size)
    ).all()
    return Page(items=[DoctorOut.model_validate(d) for d in rows], total=total or 0, page=page, size=size)


@router.get("/doctors/{doctor_id}", response_model=DoctorDetail)
def doctor_detail(doctor_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return DoctorDetail.model_validate(_approved_doctor(db, doctor_id))


@router.get("/doctors/{doctor_id}/slots", response_model=list[Slot])
def doctor_slots(doctor_id: int, day: date, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    d = _approved_doctor(db, doctor_id)
    return [Slot(start_at=s, end_at=e) for s, e in scheduling.free_slots(db, d, day)]
