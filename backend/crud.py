from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import date, timedelta, datetime
from typing import List, Optional
import uuid
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


# Shift Swap CRUD operations
def get_shift_swap(db: Session, swap_id: int) -> Optional[models.ShiftSwap]:
    return db.query(models.ShiftSwap).filter(models.ShiftSwap.id == swap_id).first()


def get_shift_swaps_for_staff(db: Session, staff_id: int) -> List[models.ShiftSwap]:
    """Get all shift swaps involving a specific staff member"""
    return db.query(models.ShiftSwap).filter(
        (models.ShiftSwap.initiator_staff_id == staff_id) |
        (models.ShiftSwap.recipient_staff_id == staff_id)
    ).order_by(models.ShiftSwap.created_at.desc()).all()


def get_pending_shift_swaps_for_manager(db: Session) -> List[models.ShiftSwap]:
    """Get all shift swaps awaiting manager approval (accepted by both parties)"""
    return db.query(models.ShiftSwap).filter(
        models.ShiftSwap.status == "accepted"
    ).order_by(models.ShiftSwap.created_at.desc()).all()


def create_shift_swap(db: Session, shift_swap: schemas.ShiftSwapCreate, initiator_staff_id: int) -> models.ShiftSwap:
    """Create a new shift swap proposal"""
    # Verify initiator owns the shift
    initiator_shift = get_shift(db, shift_swap.initiator_shift_id)
    if not initiator_shift or initiator_shift.staff_id != initiator_staff_id:
        return None

    # Verify recipient shift belongs to recipient (if specified)
    if shift_swap.recipient_shift_id:
        recipient_shift = get_shift(db, shift_swap.recipient_shift_id)
        if not recipient_shift or recipient_shift.staff_id != shift_swap.recipient_staff_id:
            return None

    db_swap = models.ShiftSwap(
        initiator_staff_id=initiator_staff_id,
        **shift_swap.model_dump()
    )
    db.add(db_swap)
    db.commit()
    db.refresh(db_swap)
    return db_swap


def accept_shift_swap(db: Session, swap_id: int, staff_id: int) -> Optional[models.ShiftSwap]:
    """Recipient accepts the swap proposal"""
    db_swap = get_shift_swap(db, swap_id)
    if not db_swap or db_swap.recipient_staff_id != staff_id or db_swap.status != "proposed":
        return None

    db_swap.status = "accepted"
    db_swap.accepted_at = datetime.utcnow()
    db.commit()
    db.refresh(db_swap)
    return db_swap


def decline_shift_swap(db: Session, swap_id: int, staff_id: int) -> Optional[models.ShiftSwap]:
    """Recipient declines the swap proposal"""
    db_swap = get_shift_swap(db, swap_id)
    if not db_swap or db_swap.recipient_staff_id != staff_id or db_swap.status != "proposed":
        return None

    db_swap.status = "denied"
    db.commit()
    db.refresh(db_swap)
    return db_swap


def cancel_shift_swap(db: Session, swap_id: int, staff_id: int) -> bool:
    """Initiator cancels their own swap proposal"""
    db_swap = get_shift_swap(db, swap_id)
    if db_swap and db_swap.initiator_staff_id == staff_id and db_swap.status in ["proposed", "accepted"]:
        db.delete(db_swap)
        db.commit()
        return True
    return False


def approve_shift_swap(db: Session, swap_id: int, reviewer_id: int) -> Optional[models.ShiftSwap]:
    """Manager approves the shift swap and swaps the staff assignments"""
    db_swap = get_shift_swap(db, swap_id)
    if not db_swap or db_swap.status != "accepted":
        return None

    # Get the shifts
    initiator_shift = get_shift(db, db_swap.initiator_shift_id)
    recipient_shift = None
    if db_swap.recipient_shift_id:
        recipient_shift = get_shift(db, db_swap.recipient_shift_id)

    if not initiator_shift:
        return None

    # Swap the staff assignments
    if recipient_shift:
        # True swap: exchange staff_id between two shifts
        temp_staff_id = initiator_shift.staff_id
        initiator_shift.staff_id = recipient_shift.staff_id
        recipient_shift.staff_id = temp_staff_id
    else:
        # Give-away: assign initiator's shift to recipient
        initiator_shift.staff_id = db_swap.recipient_staff_id

    # Update swap status
    db_swap.status = "approved"
    db_swap.reviewed_by = reviewer_id
    db_swap.reviewed_at = datetime.utcnow()

    db.commit()
    db.refresh(db_swap)
    return db_swap


def deny_shift_swap(db: Session, swap_id: int, reviewer_id: int) -> Optional[models.ShiftSwap]:
    """Manager denies the shift swap"""
    db_swap = get_shift_swap(db, swap_id)
    if not db_swap or db_swap.status != "accepted":
        return None

    db_swap.status = "denied"
    db_swap.reviewed_by = reviewer_id
    db_swap.reviewed_at = datetime.utcnow()

    db.commit()
    db.refresh(db_swap)
    return db_swap


# Staff Invitation CRUD operations
def create_staff_invitation(db: Session, staff_id: int, email: str) -> models.StaffInvitation:
    """Create a new staff invitation with unique token"""
    # Generate unique token
    token = str(uuid.uuid4())

    # Set expiry to 7 days from now
    expires_at = datetime.utcnow() + timedelta(days=7)

    db_invitation = models.StaffInvitation(
        staff_id=staff_id,
        token=token,
        email=email,
        expires_at=expires_at
    )

    db.add(db_invitation)

    # Update staff record
    staff = get_staff(db, staff_id)
    if staff:
        staff.invitation_sent_at = datetime.utcnow()

    db.commit()
    db.refresh(db_invitation)
    return db_invitation


def get_invitation_by_token(db: Session, token: str) -> Optional[models.StaffInvitation]:
    """Get invitation by token"""
    return db.query(models.StaffInvitation).filter(
        models.StaffInvitation.token == token
    ).first()


def verify_invitation_token(db: Session, token: str) -> tuple[bool, Optional[models.StaffInvitation], Optional[str]]:
    """
    Verify if invitation token is valid
    Returns: (is_valid, invitation, error_message)
    """
    invitation = get_invitation_by_token(db, token)

    if not invitation:
        return False, None, "Invalid invitation token"

    if invitation.used_at:
        return False, invitation, "This invitation has already been used"

    if datetime.utcnow() > invitation.expires_at:
        return False, invitation, "This invitation has expired"

    return True, invitation, None


def accept_invitation(db: Session, token: str, username: str, hashed_password: str) -> Optional[models.User]:
    """
    Accept invitation and create user account
    Returns created User or None if invitation invalid
    """
    is_valid, invitation, error = verify_invitation_token(db, token)

    if not is_valid:
        return None

    # Get staff record
    staff = get_staff(db, invitation.staff_id)
    if not staff:
        return None

    # Check if user with this email already exists
    existing_user = db.query(models.User).filter(models.User.email == invitation.email).first()
    if existing_user:
        return None

    # Create user account
    db_user = models.User(
        username=username,
        email=invitation.email,
        hashed_password=hashed_password,
        role="staff",
        staff_id=staff.id,
        is_active=True
    )

    db.add(db_user)

    # Mark invitation as used
    invitation.used_at = datetime.utcnow()

    # Update staff record
    staff.invitation_accepted_at = datetime.utcnow()

    db.commit()
    db.refresh(db_user)
    return db_user


def invalidate_previous_invitations(db: Session, staff_id: int):
    """Mark all previous invitations for this staff as used (when resending)"""
    invitations = db.query(models.StaffInvitation).filter(
        models.StaffInvitation.staff_id == staff_id,
        models.StaffInvitation.used_at.is_(None)
    ).all()

    for invitation in invitations:
        invitation.used_at = datetime.utcnow()

    db.commit()


def get_staff_with_invitation_status(db: Session) -> List[dict]:
    """Get all staff with their invitation and account status"""
    staff_list = get_staff_list(db)
    result = []

    for staff in staff_list:
        # Check if staff has a user account
        has_account = staff.user is not None

        # Determine invitation status
        invitation_status = None
        if has_account:
            invitation_status = "active"
        elif staff.invitation_sent_at and not staff.invitation_accepted_at:
            # Check if invitation expired
            latest_invitation = db.query(models.StaffInvitation).filter(
                models.StaffInvitation.staff_id == staff.id,
                models.StaffInvitation.used_at.is_(None)
            ).order_by(models.StaffInvitation.created_at.desc()).first()

            if latest_invitation and datetime.utcnow() > latest_invitation.expires_at:
                invitation_status = "expired"
            else:
                invitation_status = "pending"

        result.append({
            "id": staff.id,
            "name": staff.name,
            "email": staff.email,
            "phone": staff.phone,
            "role": staff.role,
            "invitation_sent_at": staff.invitation_sent_at,
            "invitation_accepted_at": staff.invitation_accepted_at,
            "has_account": has_account,
            "invitation_status": invitation_status
        })

    return result
