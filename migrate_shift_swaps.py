#!/usr/bin/env python3
"""
Migration script to add shift_swaps table to existing database
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
            WHERE type='table' AND name='shift_swaps'
        """)

        if cursor.fetchone():
            print("✅ shift_swaps table already exists")
            return

        print("Creating shift_swaps table...")

        # Create the shift_swaps table
        cursor.execute("""
            CREATE TABLE shift_swaps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                initiator_shift_id INTEGER NOT NULL,
                initiator_staff_id INTEGER NOT NULL,
                recipient_staff_id INTEGER NOT NULL,
                recipient_shift_id INTEGER,
                message TEXT,
                status VARCHAR(50) NOT NULL DEFAULT 'proposed',
                created_at DATETIME NOT NULL,
                accepted_at DATETIME,
                reviewed_by INTEGER,
                reviewed_at DATETIME,
                FOREIGN KEY (initiator_shift_id) REFERENCES shifts (id),
                FOREIGN KEY (initiator_staff_id) REFERENCES staff (id),
                FOREIGN KEY (recipient_staff_id) REFERENCES staff (id),
                FOREIGN KEY (recipient_shift_id) REFERENCES shifts (id),
                FOREIGN KEY (reviewed_by) REFERENCES users (id)
            )
        """)

        # Create indexes for better query performance
        cursor.execute("""
            CREATE INDEX idx_shift_swaps_initiator
            ON shift_swaps(initiator_staff_id)
        """)

        cursor.execute("""
            CREATE INDEX idx_shift_swaps_recipient
            ON shift_swaps(recipient_staff_id)
        """)

        cursor.execute("""
            CREATE INDEX idx_shift_swaps_status
            ON shift_swaps(status)
        """)

        conn.commit()
        print("✅ Successfully created shift_swaps table and indexes")

    except sqlite3.Error as e:
        print(f"❌ Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    print("="*60)
    print("Shift Swaps Table Migration")
    print("="*60)
    migrate_database()
    print("="*60)
    print("Migration complete!")
    print("="*60)
