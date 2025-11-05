#!/usr/bin/env python3
"""
Migration script to add holiday_requests table to existing database
"""

import sqlite3
from pathlib import Path

def migrate_database():
    db_path = Path(__file__).parent / "rota.db"

    if not db_path.exists():
        print("❌ Database file not found at:", db_path)
        print("   Please run init_db.py first to create the database.")
        return

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    try:
        # Check if table already exists
        cursor.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='holiday_requests'
        """)

        if cursor.fetchone():
            print("✅ holiday_requests table already exists")
            return

        print("Creating holiday_requests table...")

        # Create the holiday_requests table
        cursor.execute("""
            CREATE TABLE holiday_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                staff_id INTEGER NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                reason TEXT,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                created_at DATETIME NOT NULL,
                reviewed_by INTEGER,
                reviewed_at DATETIME,
                FOREIGN KEY (staff_id) REFERENCES staff (id),
                FOREIGN KEY (reviewed_by) REFERENCES users (id)
            )
        """)

        # Create indexes for better query performance
        cursor.execute("""
            CREATE INDEX idx_holiday_requests_staff_id
            ON holiday_requests(staff_id)
        """)

        cursor.execute("""
            CREATE INDEX idx_holiday_requests_status
            ON holiday_requests(status)
        """)

        cursor.execute("""
            CREATE INDEX idx_holiday_requests_dates
            ON holiday_requests(start_date, end_date)
        """)

        conn.commit()
        print("✅ Successfully created holiday_requests table and indexes")

    except sqlite3.Error as e:
        print(f"❌ Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    print("="*60)
    print("Holiday Requests Table Migration")
    print("="*60)
    migrate_database()
    print("="*60)
    print("Migration complete!")
    print("="*60)
