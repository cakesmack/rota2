from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from datetime import date, datetime, timedelta
import os

from . import models, schemas, crud
from .database import engine, get_db
from .routers import auth, holiday_requests, shift_swaps, invitations
from .auth import get_current_user, get_current_active_manager
from .email_service import send_invitation_email

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Rota Management API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(holiday_requests.router)
app.include_router(shift_swaps.router)
app.include_router(invitations.router)

# Serve frontend files
frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
app.mount("/static", StaticFiles(directory=frontend_path), name="static")


@app.get("/")
async def read_root():
    """Serve the main frontend page"""
    return FileResponse(os.path.join(frontend_path, "index.html"))


# Staff endpoints
@app.post("/api/staff", response_model=schemas.Staff, status_code=status.HTTP_201_CREATED)
def create_staff(
    staff: schemas.StaffCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_manager)
):
    """Create a new staff member and send invitation if email provided (Manager only)"""
    # Create staff record
    new_staff = crud.create_staff(db=db, staff=staff)

    # If email provided, send invitation
    if new_staff.email:
        try:
            invitation = crud.create_staff_invitation(db, new_staff.id, new_staff.email)
            send_invitation_email(new_staff.name, new_staff.email, invitation.token)
        except Exception as e:
            print(f"Failed to send invitation email: {e}")
            # Don't fail the staff creation if email fails

    return new_staff


@app.get("/api/staff", response_model=List[schemas.Staff])
def read_staff_list(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get list of all staff members (Authenticated users)"""
    return crud.get_staff_list(db, skip=skip, limit=limit)


@app.get("/api/staff-with-status")
def read_staff_with_invitation_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_manager)
):
    """Get list of all staff members with invitation status (Manager only)"""
    return crud.get_staff_with_invitation_status(db)


@app.get("/api/staff/{staff_id}", response_model=schemas.Staff)
def read_staff(
    staff_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific staff member (Authenticated users)"""
    staff = crud.get_staff(db, staff_id=staff_id)
    if staff is None:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return staff


@app.put("/api/staff/{staff_id}", response_model=schemas.Staff)
def update_staff(
    staff_id: int,
    staff: schemas.StaffUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_manager)
):
    """Update a staff member (Manager only)"""
    updated_staff = crud.update_staff(db, staff_id=staff_id, staff=staff)
    if updated_staff is None:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return updated_staff


@app.delete("/api/staff/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_staff(
    staff_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_manager)
):
    """Delete a staff member (Manager only)"""
    success = crud.delete_staff(db, staff_id=staff_id)
    if not success:
        raise HTTPException(status_code=404, detail="Staff member not found")


# Shift endpoints
@app.post("/api/shifts", response_model=schemas.Shift, status_code=status.HTTP_201_CREATED)
def create_shift(
    shift: schemas.ShiftCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_manager)
):
    """Create a new shift (Manager only)"""
    return crud.create_shift(db=db, shift=shift)


@app.get("/api/shifts/{shift_id}", response_model=schemas.Shift)
def read_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific shift (Authenticated users)"""
    shift = crud.get_shift(db, shift_id=shift_id)
    if shift is None:
        raise HTTPException(status_code=404, detail="Shift not found")
    return shift


@app.put("/api/shifts/{shift_id}", response_model=schemas.Shift)
def update_shift(
    shift_id: int,
    shift: schemas.ShiftUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_manager)
):
    """Update a shift (Manager only)"""
    updated_shift = crud.update_shift(db, shift_id=shift_id, shift=shift)
    if updated_shift is None:
        raise HTTPException(status_code=404, detail="Shift not found")
    return updated_shift


@app.delete("/api/shifts/{shift_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_manager)
):
    """Delete a shift (Manager only)"""
    success = crud.delete_shift(db, shift_id=shift_id)
    if not success:
        raise HTTPException(status_code=404, detail="Shift not found")


@app.get("/api/shifts", response_model=List[schemas.Shift])
def read_shifts_by_date_range(
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all shifts within a date range (Authenticated users)"""
    return crud.get_shifts_by_date_range(db, start_date=start_date, end_date=end_date)


@app.get("/api/staff/{staff_id}/shifts", response_model=List[schemas.Shift])
def read_staff_shifts(
    staff_id: int,
    start_date: date = None,
    end_date: date = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all shifts for a specific staff member (Authenticated users)"""
    return crud.get_shifts_for_staff(db, staff_id=staff_id, start_date=start_date, end_date=end_date)


# Week rota endpoint
@app.get("/api/rota/week", response_model=schemas.WeekRota)
def read_week_rota(
    week_start: date = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get rota for a specific week. If week_start is not provided, returns current week. (Authenticated users)"""
    if week_start is None:
        # Get the Monday of the current week
        today = datetime.now().date()
        week_start = today - timedelta(days=today.weekday())

    return crud.get_week_rota(db, week_start=week_start)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
