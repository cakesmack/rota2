from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, crud
from ..database import get_db
from ..auth import get_current_user, get_current_active_manager

router = APIRouter(prefix="/api/holiday-requests", tags=["holiday_requests"])


@router.post("", response_model=schemas.HolidayRequest, status_code=status.HTTP_201_CREATED)
def create_holiday_request(
    request: schemas.HolidayRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new holiday request (staff only for their own account)"""
    if not current_user.staff_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No staff record linked to your account"
        )

    # Validate date range
    if request.end_date < request.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after or equal to start date"
        )

    return crud.create_holiday_request(db, request, current_user.staff_id)


@router.get("/my-requests", response_model=List[schemas.HolidayRequest])
def get_my_holiday_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all holiday requests for the current user"""
    if not current_user.staff_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No staff record linked to your account"
        )

    return crud.get_holiday_requests_for_staff(db, current_user.staff_id)


@router.get("", response_model=List[schemas.HolidayRequest])
def get_all_holiday_requests(
    status_filter: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_manager)
):
    """Get all holiday requests (managers only)"""
    return crud.get_all_holiday_requests(db, status_filter)


@router.get("/pending", response_model=List[schemas.HolidayRequest])
def get_pending_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_manager)
):
    """Get all pending holiday requests (managers only)"""
    return crud.get_pending_holiday_requests(db)


@router.put("/{request_id}/approve", response_model=schemas.HolidayRequest)
def approve_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_manager)
):
    """Approve a holiday request (managers only)"""
    approved_request = crud.approve_holiday_request(db, request_id, current_user.id)
    if not approved_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found or already processed"
        )
    return approved_request


@router.put("/{request_id}/deny", response_model=schemas.HolidayRequest)
def deny_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_manager)
):
    """Deny a holiday request (managers only)"""
    denied_request = crud.deny_holiday_request(db, request_id, current_user.id)
    if not denied_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found or already processed"
        )
    return denied_request


@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete a holiday request (staff can only delete their own pending requests)"""
    if not current_user.staff_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No staff record linked to your account"
        )

    success = crud.delete_holiday_request(db, request_id, current_user.staff_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found, already processed, or not yours"
        )
