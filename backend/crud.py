from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import date, timedelta, datetime
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


# Holiday Request CRUD operations
def get_holiday_request(db: Session, request_id: int) -> Optional[models.HolidayRequest]:
    return db.query(models.HolidayRequest).filter(models.HolidayRequest.id == request_id).first()


def get_holiday_requests_for_staff(db: Session, staff_id: int) -> List[models.HolidayRequest]:
    """Get all holiday requests for a specific staff member"""
    return db.query(models.HolidayRequest).filter(
        models.HolidayRequest.staff_id == staff_id
    ).order_by(models.HolidayRequest.created_at.desc()).all()


def get_all_holiday_requests(db: Session, status: Optional[str] = None) -> List[models.HolidayRequest]:
    """Get all holiday requests, optionally filtered by status"""
    query = db.query(models.HolidayRequest)
    if status:
        query = query.filter(models.HolidayRequest.status == status)
    return query.order_by(models.HolidayRequest.created_at.desc()).all()


def get_pending_holiday_requests(db: Session) -> List[models.HolidayRequest]:
    """Get all pending holiday requests"""
    return get_all_holiday_requests(db, status="pending")


def create_holiday_request(db: Session, holiday_request: schemas.HolidayRequestCreate, staff_id: int) -> models.HolidayRequest:
    """Create a new holiday request"""
    db_request = models.HolidayRequest(
        staff_id=staff_id,
        **holiday_request.model_dump()
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request


def approve_holiday_request(db: Session, request_id: int, reviewer_id: int) -> Optional[models.HolidayRequest]:
    """Approve a holiday request and create holiday shifts"""
    db_request = get_holiday_request(db, request_id)
    if not db_request or db_request.status != "pending":
        return None

    # Update request status
    db_request.status = "approved"
    db_request.reviewed_by = reviewer_id
    db_request.reviewed_at = datetime.utcnow()

    # Create holiday shifts for each day in the range
    current_date = db_request.start_date
    while current_date <= db_request.end_date:
        # Check if shift already exists for this date
        existing_shift = db.query(models.Shift).filter(
            and_(
                models.Shift.staff_id == db_request.staff_id,
                models.Shift.date == current_date
            )
        ).first()

        if not existing_shift:
            # Create new holiday shift
            holiday_shift = models.Shift(
                staff_id=db_request.staff_id,
                date=current_date,
                start_time=None,
                end_time=None,
                shift_type=None,
                is_holiday=True,
                is_day_off=False,
                notes=f"Approved holiday request #{db_request.id}"
            )
            db.add(holiday_shift)

        current_date += timedelta(days=1)

    db.commit()
    db.refresh(db_request)
    return db_request


def deny_holiday_request(db: Session, request_id: int, reviewer_id: int) -> Optional[models.HolidayRequest]:
    """Deny a holiday request"""
    db_request = get_holiday_request(db, request_id)
    if not db_request or db_request.status != "pending":
        return None

    db_request.status = "denied"
    db_request.reviewed_by = reviewer_id
    db_request.reviewed_at = datetime.utcnow()

    db.commit()
    db.refresh(db_request)
    return db_request


def delete_holiday_request(db: Session, request_id: int, staff_id: int) -> bool:
    """Delete a holiday request (only if pending and belongs to staff)"""
    db_request = get_holiday_request(db, request_id)
    if db_request and db_request.staff_id == staff_id and db_request.status == "pending":
        db.delete(db_request)
        db.commit()
        return True
    return False
