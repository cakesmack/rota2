from pydantic import BaseModel, EmailStr
from datetime import date, time
from typing import Optional, List


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
    start_time: time
    end_time: time
    shift_type: Optional[str] = None
    is_holiday: Optional[bool] = False
    is_day_off: Optional[bool] = False
    notes: Optional[str] = None


class ShiftCreate(ShiftBase):
    pass


class ShiftUpdate(BaseModel):
    staff_id: Optional[int] = None
    date: Optional[date] = None
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
