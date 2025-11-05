#!/usr/bin/env python3
"""
Create test shifts for the test staff member
"""

from datetime import datetime, timedelta, time as dt_time
from backend.database import SessionLocal
from backend.models import Shift, Staff

def create_test_shifts():
    db = SessionLocal()

    try:
        # Get the test staff member
        staff = db.query(Staff).filter(Staff.email == "john.doe@example.com").first()
        if not staff:
            print("Error: Test staff member not found. Run create_test_staff.py first.")
            return

        # Get Monday of current week
        today = datetime.now().date()
        monday = today - timedelta(days=today.weekday())

        # Create shifts for the week
        shifts_data = [
            # Monday - Regular shift
            {
                "date": monday,
                "start_time": dt_time(9, 0),
                "end_time": dt_time(17, 0),
                "shift_type": "Sales Associate",
                "is_holiday": False,
                "is_day_off": False
            },
            # Tuesday - Long shift
            {
                "date": monday + timedelta(days=1),
                "start_time": dt_time(8, 0),
                "end_time": dt_time(18, 0),
                "shift_type": "Sales Associate",
                "is_holiday": False,
                "is_day_off": False
            },
            # Wednesday - Day off
            {
                "date": monday + timedelta(days=2),
                "start_time": None,
                "end_time": None,
                "shift_type": None,
                "is_holiday": False,
                "is_day_off": True
            },
            # Thursday - Regular shift
            {
                "date": monday + timedelta(days=3),
                "start_time": dt_time(9, 0),
                "end_time": dt_time(17, 0),
                "shift_type": "Duty Manager",
                "is_holiday": False,
                "is_day_off": False
            },
            # Friday - Split shift 1
            {
                "date": monday + timedelta(days=4),
                "start_time": dt_time(9, 0),
                "end_time": dt_time(13, 0),
                "shift_type": "Sales Associate",
                "is_holiday": False,
                "is_day_off": False
            },
            # Friday - Split shift 2
            {
                "date": monday + timedelta(days=4),
                "start_time": dt_time(17, 0),
                "end_time": dt_time(21, 0),
                "shift_type": "Sales Associate",
                "is_holiday": False,
                "is_day_off": False
            },
            # Saturday - Regular shift
            {
                "date": monday + timedelta(days=5),
                "start_time": dt_time(10, 0),
                "end_time": dt_time(18, 0),
                "shift_type": "Sales Associate",
                "is_holiday": False,
                "is_day_off": False
            },
            # Sunday - Day off
            {
                "date": monday + timedelta(days=6),
                "start_time": None,
                "end_time": None,
                "shift_type": None,
                "is_holiday": False,
                "is_day_off": True
            }
        ]

        # Delete existing shifts for this staff member for this week
        week_end = monday + timedelta(days=6)
        db.query(Shift).filter(
            Shift.staff_id == staff.id,
            Shift.date >= monday,
            Shift.date <= week_end
        ).delete()
        db.commit()

        # Create new shifts
        for shift_data in shifts_data:
            shift = Shift(
                staff_id=staff.id,
                **shift_data
            )
            db.add(shift)

        db.commit()

        print("="*60)
        print("Test Shifts Created Successfully!")
        print("="*60)
        print(f"Created {len(shifts_data)} shifts for {staff.name}")
        print(f"Week starting: {monday.strftime('%Y-%m-%d')}")
        print("="*60)
        print("\nShift summary:")
        for i, shift_data in enumerate(shifts_data):
            day_name = (monday + timedelta(days=(shift_data['date'] - monday).days)).strftime('%A')
            if shift_data['is_day_off']:
                print(f"  {day_name}: Day Off")
            elif shift_data['is_holiday']:
                print(f"  {day_name}: On Holiday")
            else:
                print(f"  {day_name}: {shift_data['start_time']} - {shift_data['end_time']} ({shift_data['shift_type']})")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_shifts()
