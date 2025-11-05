from pydantic import BaseModel, EmailStr
from datetime import date, time, datetime
from typing import Optional, List


# Authentication Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str


class TokenData(BaseModel):
    username: Optional[str] = None


class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: str = "staff"


class UserCreate(UserBase):
    password: str
    staff_id: Optional[int] = None


class UserLogin(BaseModel):
    username: str
    password: str


class User(UserBase):
    id: int
    is_active: bool
    staff_id: Optional[int] = None

    class Config:
        from_attributes = True


# Staff Schemas
class StaffBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[str] = None


class StaffCreate(StaffBase):
    pass


class StaffUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[str] = None


class Staff(StaffBase):
    id: int

    class Config:
        from_attributes = True


# Shift Schemas
class ShiftBase(BaseModel):
    staff_id: int
    date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    shift_type: Optional[str] = None
    is_holiday: Optional[bool] = False
    is_day_off: Optional[bool] = False
    notes: Optional[str] = None


class ShiftCreate(ShiftBase):
    pass


class ShiftUpdate(BaseModel):
    # staff_id and date should not be updatable - create a new shift instead
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    shift_type: Optional[str] = None
    is_holiday: Optional[bool] = None
    is_day_off: Optional[bool] = None
    notes: Optional[str] = None


class Shift(ShiftBase):
    id: int
    staff: Staff

    class Config:
        from_attributes = True


# Week Rota Schema
class WeekRota(BaseModel):
    week_start: date
    week_end: date
    staff_list: List[Staff]
    shifts: List[Shift]


# Holiday Request Schemas
class HolidayRequestBase(BaseModel):
    start_date: date
    end_date: date
    reason: Optional[str] = None


class HolidayRequestCreate(HolidayRequestBase):
    pass


class HolidayRequestUpdate(BaseModel):
    status: Optional[str] = None  # "approved" or "denied"


class HolidayRequest(HolidayRequestBase):
    id: int
    staff_id: int
    status: str
    created_at: datetime
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    staff: Staff

    class Config:
        from_attributes = True


# Shift Swap Schemas
class ShiftSwapBase(BaseModel):
    initiator_shift_id: int
    recipient_staff_id: int
    recipient_shift_id: Optional[int] = None
    message: Optional[str] = None


class ShiftSwapCreate(ShiftSwapBase):
    pass


class ShiftSwap(ShiftSwapBase):
    id: int
    initiator_staff_id: int
    status: str
    created_at: datetime
    accepted_at: Optional[datetime] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    initiator_shift: Shift
    initiator_staff: Staff
    recipient_staff: Staff
    recipient_shift: Optional[Shift] = None

    class Config:
        from_attributes = True
