#!/usr/bin/env python3
"""
Create a test staff member and user account for testing the staff dashboard
"""

from backend.database import SessionLocal
from backend.models import User, Staff
from backend.auth import get_password_hash

def create_test_staff():
    db = SessionLocal()

    try:
        # Check if staff member already exists
        existing_staff = db.query(Staff).filter(Staff.email == "john.doe@example.com").first()
        if existing_staff:
            print(f"✓ Staff member already exists: {existing_staff.name} (ID: {existing_staff.id})")
            staff = existing_staff
        else:
            # Create a test staff member
            staff = Staff(
                name="John Doe",
                email="john.doe@example.com",
                phone="555-0123",
                role="Sales Associate"
            )
            db.add(staff)
            db.commit()
            db.refresh(staff)
            print(f"✓ Created staff member: {staff.name} (ID: {staff.id})")

        # Check if user already exists
        existing_user = db.query(User).filter(User.username == "johndoe").first()
        if existing_user:
            print(f"✓ User already exists: {existing_user.username}")
        else:
            # Create a user account linked to the staff member
            user = User(
                username="johndoe",
                email="john.doe@example.com",
                hashed_password=get_password_hash("password123"),
                role="staff",
                staff_id=staff.id,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"✓ Created user account: {user.username}")

        print("\n" + "="*60)
        print("Test Staff Account Created Successfully!")
        print("="*60)
        print("Username: johndoe")
        print("Password: password123")
        print("Role: staff")
        print(f"Linked to staff: {staff.name} (ID: {staff.id})")
        print("="*60)
        print("\nYou can now log in with these credentials to test the staff dashboard.")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_staff()
