from sqlalchemy import Column, Integer, String, Date, Time, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from .database import Base


class Staff(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    role = Column(String)  # e.g., "Manager", "Waiter", "Chef", etc.

    shifts = relationship("Shift", back_populates="staff")


class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, ForeignKey("staff.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    shift_type = Column(String)  # Repurposed for role: e.g., "Duty Manager", "Shift Manager"
    is_holiday = Column(Boolean, default=False)
    is_day_off = Column(Boolean, default=False)
    notes = Column(String)

    staff = relationship("Staff", back_populates="shifts")
