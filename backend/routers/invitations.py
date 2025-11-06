"""
API endpoints for staff invitations
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, crud
from ..database import get_db
from ..auth import get_current_active_manager, get_password_hash
from ..email_service import send_invitation_email, send_invitation_resend_email

router = APIRouter(prefix="/api/invitations", tags=["invitations"])


@router.get("/verify/{token}", response_model=schemas.InvitationVerify)
def verify_invitation(token: str, db: Session = Depends(get_db)):
    """Verify if invitation token is valid (public endpoint)"""
    is_valid, invitation, error = crud.verify_invitation_token(db, token)

    if not is_valid:
        return schemas.InvitationVerify(
            valid=False,
            error=error
        )

    # Get staff details
    staff = crud.get_staff(db, invitation.staff_id)
    if not staff:
        return schemas.InvitationVerify(
            valid=False,
            error="Staff record not found"
        )

    return schemas.InvitationVerify(
        valid=True,
        staff_name=staff.name,
        email=invitation.email
    )


@router.post("/accept", status_code=status.HTTP_201_CREATED)
def accept_invitation(
    invitation_data: schemas.InvitationAccept,
    db: Session = Depends(get_db)
):
    """Accept invitation and create user account (public endpoint)"""

    # Validate password length
    if len(invitation_data.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )

    # Verify token is valid
    is_valid, invitation, error = crud.verify_invitation_token(db, invitation_data.token)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )

    # Get staff details
    staff = crud.get_staff(db, invitation.staff_id)
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff record not found"
        )

    # Generate username from email (part before @)
    username = invitation.email.split('@')[0]

    # Check if username exists, append number if needed
    base_username = username
    counter = 1
    while db.query(models.User).filter(models.User.username == username).first():
        username = f"{base_username}{counter}"
        counter += 1

    # Hash password
    hashed_password = get_password_hash(invitation_data.password)

    # Create user account
    user = crud.accept_invitation(db, invitation_data.token, username, hashed_password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create account. Invitation may have already been used or email is already registered."
        )

    return {
        "message": "Account created successfully",
        "username": user.username,
        "email": user.email
    }


@router.post("/resend/{staff_id}", status_code=status.HTTP_200_OK)
def resend_invitation(
    staff_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_manager)
):
    """Resend invitation to staff member (manager only)"""

    # Get staff details
    staff = crud.get_staff(db, staff_id)
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )

    if not staff.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Staff member has no email address"
        )

    # Check if staff already has account
    if staff.user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Staff member already has an active account"
        )

    # Invalidate previous invitations
    crud.invalidate_previous_invitations(db, staff_id)

    # Create new invitation
    invitation = crud.create_staff_invitation(db, staff_id, staff.email)

    # Send email
    email_sent = send_invitation_resend_email(staff.name, staff.email, invitation.token)

    if not email_sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send invitation email"
        )

    return {
        "message": f"Invitation resent to {staff.email}",
        "token": invitation.token  # For testing purposes
    }


@router.get("/test/{staff_id}")
def get_test_invitation_link(
    staff_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_manager)
):
    """
    TEST ENDPOINT: Get the invitation link for a staff member
    This is for development/testing only when email is in console mode
    """

    # Get the latest invitation for this staff
    invitation = db.query(models.StaffInvitation).filter(
        models.StaffInvitation.staff_id == staff_id,
        models.StaffInvitation.used_at.is_(None)
    ).order_by(models.StaffInvitation.created_at.desc()).first()

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pending invitation found for this staff member"
        )

    import os
    app_url = os.getenv("APP_URL", "http://localhost:8000")
    invitation_url = f"{app_url}/static/accept-invitation.html?token={invitation.token}"

    return {
        "staff_id": staff_id,
        "email": invitation.email,
        "token": invitation.token,
        "invitation_url": invitation_url,
        "expires_at": invitation.expires_at,
        "created_at": invitation.created_at
    }
