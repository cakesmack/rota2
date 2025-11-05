"""
Database initialization script
Creates tables and optionally creates a default admin user
"""
from backend.database import engine
from backend import models
from backend.auth import get_password_hash
from sqlalchemy.orm import Session
import sys

def init_database():
    """Create all database tables"""
    print("Creating database tables...")
    models.Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")

def create_admin_user(username="admin", email="admin@example.com", password="admin123"):
    """Create a default admin user"""
    from backend.database import SessionLocal

    db = SessionLocal()
    try:
        # Check if admin already exists
        existing_admin = db.query(models.User).filter(models.User.username == username).first()
        if existing_admin:
            print(f"⚠️  User '{username}' already exists. Skipping admin creation.")
            return

        # Create admin user
        hashed_password = get_password_hash(password)
        admin_user = models.User(
            username=username,
            email=email,
            hashed_password=hashed_password,
            role="manager",
            is_active=True
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print(f"\n✅ Admin user created successfully!")
        print(f"   Username: {username}")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print(f"   Role: manager")
        print(f"\n⚠️  IMPORTANT: Change the password after first login!")

    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Rota Management - Database Initialization")
    print("=" * 60)

    # Create tables
    init_database()

    # Ask if user wants to create admin account
    if len(sys.argv) > 1 and sys.argv[1] == "--create-admin":
        print("\n" + "=" * 60)
        print("Creating default admin account...")
        print("=" * 60)
        create_admin_user()
    else:
        print("\n💡 Tip: Run with --create-admin flag to create a default admin user")
        print("   Example: python init_db.py --create-admin")

    print("\n✅ Database initialization complete!")
