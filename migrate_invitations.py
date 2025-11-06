"""
Migration script to add staff invitation system
Adds invitation tracking fields to staff table and creates staff_invitations table
"""

import sqlite3
from datetime import datetime

def migrate():
    conn = sqlite3.connect('rota.db')
    cursor = conn.cursor()

    print("Starting invitation system migration...")

    try:
        # Check if invitation_sent_at column exists in staff table
        cursor.execute("PRAGMA table_info(staff)")
        columns = [column[1] for column in cursor.fetchall()]

        # Add invitation tracking columns to staff table if they don't exist
        if 'invitation_sent_at' not in columns:
            print("Adding invitation_sent_at to staff table...")
            cursor.execute("""
                ALTER TABLE staff ADD COLUMN invitation_sent_at DATETIME
            """)

        if 'invitation_accepted_at' not in columns:
            print("Adding invitation_accepted_at to staff table...")
            cursor.execute("""
                ALTER TABLE staff ADD COLUMN invitation_accepted_at DATETIME
            """)

        # Check if staff_invitations table exists
        cursor.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='staff_invitations'
        """)

        if not cursor.fetchone():
            print("Creating staff_invitations table...")
            cursor.execute("""
                CREATE TABLE staff_invitations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    staff_id INTEGER NOT NULL,
                    token VARCHAR(255) UNIQUE NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    expires_at DATETIME NOT NULL,
                    used_at DATETIME,
                    created_at DATETIME NOT NULL,
                    FOREIGN KEY (staff_id) REFERENCES staff (id)
                )
            """)

            # Create indexes for performance
            cursor.execute("""
                CREATE INDEX ix_staff_invitations_token ON staff_invitations (token)
            """)
            cursor.execute("""
                CREATE INDEX ix_staff_invitations_staff_id ON staff_invitations (staff_id)
            """)
            print("Created staff_invitations table with indexes")
        else:
            print("staff_invitations table already exists")

        conn.commit()
        print("✓ Migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"✗ Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
