from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, crud
from ..database import get_db
from ..auth import get_current_user, get_current_active_manager

router = APIRouter(prefix="/api/shift-swaps", tags=["shift_swaps"])


@router.post("", response_model=schemas.ShiftSwap, status_code=status.HTTP_201_CREATED)
def create_shift_swap(
    swap: schemas.ShiftSwapCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new shift swap proposal"""
    if not current_user.staff_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No staff record linked to your account"
        )

    # Prevent swapping with yourself
    if swap.recipient_staff_id == current_user.staff_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot swap shifts with yourself"
        )

    created_swap = crud.create_shift_swap(db, swap, current_user.staff_id)
    if not created_swap:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid shift swap request. Ensure you own the shift you're offering."
        )

    return created_swap


@router.get("/my-swaps", response_model=List[schemas.ShiftSwap])
def get_my_shift_swaps(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all shift swaps involving the current user"""
    if not current_user.staff_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No staff record linked to your account"
        )

    return crud.get_shift_swaps_for_staff(db, current_user.staff_id)


@router.get("/pending", response_model=List[schemas.ShiftSwap])
def get_pending_swaps(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_manager)
):
    """Get all shift swaps awaiting manager approval (managers only)"""
    return crud.get_pending_shift_swaps_for_manager(db)


@router.put("/{swap_id}/accept", response_model=schemas.ShiftSwap)
def accept_swap(
    swap_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Accept a shift swap proposal (recipient only)"""
    if not current_user.staff_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No staff record linked to your account"
        )

    accepted_swap = crud.accept_shift_swap(db, swap_id, current_user.staff_id)
    if not accepted_swap:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Swap not found, already processed, or not for you"
        )

    return accepted_swap


@router.put("/{swap_id}/decline", response_model=schemas.ShiftSwap)
def decline_swap(
    swap_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Decline a shift swap proposal (recipient only)"""
    if not current_user.staff_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No staff record linked to your account"
        )

    declined_swap = crud.decline_shift_swap(db, swap_id, current_user.staff_id)
    if not declined_swap:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Swap not found, already processed, or not for you"
        )

    return declined_swap


@router.delete("/{swap_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_swap(
    swap_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Cancel a shift swap proposal (initiator only)"""
    if not current_user.staff_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No staff record linked to your account"
        )

    success = crud.cancel_shift_swap(db, swap_id, current_user.staff_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Swap not found, already processed, or not yours"
        )


@router.put("/{swap_id}/approve", response_model=schemas.ShiftSwap)
def approve_swap(
    swap_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_manager)
):
    """Approve a shift swap and execute the swap (managers only)"""
    approved_swap = crud.approve_shift_swap(db, swap_id, current_user.id)
    if not approved_swap:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Swap not found or not ready for approval"
        )

    return approved_swap


@router.put("/{swap_id}/deny", response_model=schemas.ShiftSwap)
def deny_swap(
    swap_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_manager)
):
    """Deny a shift swap (managers only)"""
    denied_swap = crud.deny_shift_swap(db, swap_id, current_user.id)
    if not denied_swap:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Swap not found or not ready for review"
        )

    return denied_swap
