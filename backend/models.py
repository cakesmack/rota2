from sqlalchemy import Column, Integer, String, Date, Time, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="staff")  # "manager" or "staff"
    is_active = Column(Boolean, default=True)
    staff_id = Column(Integer, ForeignKey("staff.id"), nullable=True)  # Link to staff record

    staff = relationship("Staff", back_populates="user", uselist=False)


class Staff(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    role = Column(String)  # e.g., "Manager", "Waiter", "Chef", etc.

    shifts = relationship("Shift", back_populates="staff")
    user = relationship("User", back_populates="staff", uselist=False)


class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, ForeignKey("staff.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=True)  # Optional for holidays/day-off
    end_time = Column(Time, nullable=True)  # Optional for holidays/day-off
    shift_type = Column(String)  # Repurposed for role: e.g., "Duty Manager", "Shift Manager"
    is_holiday = Column(Boolean, default=False)
    is_day_off = Column(Boolean, default=False)
    notes = Column(String)

    staff = relationship("Staff", back_populates="shifts")


class HolidayRequest(Base):
    __tablename__ = "holiday_requests"

    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, ForeignKey("staff.id"), nullable=False)
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)
    reason = Column(String)
    status = Column(String, nullable=False, default="pending")  # "pending", "approved", "denied"
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Manager who reviewed
    reviewed_at = Column(DateTime, nullable=True)

    staff = relationship("Staff")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
