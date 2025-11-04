from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import date, timedelta
from typing import List, Optional
from . import models, schemas


# Staff CRUD operations
def get_staff(db: Session, staff_id: int) -> Optional[models.Staff]:
    return db.query(models.Staff).filter(models.Staff.id == staff_id).first()


def get_staff_list(db: Session, skip: int = 0, limit: int = 100) -> List[models.Staff]:
    return db.query(models.Staff).offset(skip).limit(limit).all()


def create_staff(db: Session, staff: schemas.StaffCreate) -> models.Staff:
    db_staff = models.Staff(**staff.model_dump())
    db.add(db_staff)
    db.commit()
    db.refresh(db_staff)
    return db_staff


def update_staff(db: Session, staff_id: int, staff: schemas.StaffUpdate) -> Optional[models.Staff]:
    db_staff = get_staff(db, staff_id)
    if db_staff:
        update_data = staff.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_staff, key, value)
        db.commit()
        db.refresh(db_staff)
    return db_staff


def delete_staff(db: Session, staff_id: int) -> bool:
    db_staff = get_staff(db, staff_id)
    if db_staff:
        db.delete(db_staff)
        db.commit()
        return True
    return False


# Shift CRUD operations
def get_shift(db: Session, shift_id: int) -> Optional[models.Shift]:
    return db.query(models.Shift).filter(models.Shift.id == shift_id).first()


def get_shifts_by_date_range(db: Session, start_date: date, end_date: date) -> List[models.Shift]:
    return db.query(models.Shift).filter(
        and_(
            models.Shift.date >= start_date,
            models.Shift.date <= end_date
        )
    ).all()


def get_shifts_for_staff(db: Session, staff_id: int, start_date: date = None, end_date: date = None) -> List[models.Shift]:
    query = db.query(models.Shift).filter(models.Shift.staff_id == staff_id)
    if start_date:
        query = query.filter(models.Shift.date >= start_date)
    if end_date:
        query = query.filter(models.Shift.date <= end_date)
    return query.all()


def create_shift(db: Session, shift: schemas.ShiftCreate) -> models.Shift:
    db_shift = models.Shift(**shift.model_dump())
    db.add(db_shift)
    db.commit()
    db.refresh(db_shift)
    return db_shift


def update_shift(db: Session, shift_id: int, shift: schemas.ShiftUpdate) -> Optional[models.Shift]:
    db_shift = get_shift(db, shift_id)
    if db_shift:
        update_data = shift.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_shift, key, value)
        db.commit()
        db.refresh(db_shift)
    return db_shift


def delete_shift(db: Session, shift_id: int) -> bool:
    db_shift = get_shift(db, shift_id)
    if db_shift:
        db.delete(db_shift)
        db.commit()
        return True
    return False


def get_week_rota(db: Session, week_start: date) -> schemas.WeekRota:
    """Get rota for a specific week"""
    week_end = week_start + timedelta(days=6)

    staff_list = get_staff_list(db)
    shifts = get_shifts_by_date_range(db, week_start, week_end)

    return schemas.WeekRota(
        week_start=week_start,
        week_end=week_end,
        staff_list=staff_list,
        shifts=shifts
    )
