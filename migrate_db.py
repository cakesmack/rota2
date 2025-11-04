"""
Database migration script to add new columns to existing database
Run this instead of deleting the database to preserve existing data
"""
import sqlite3
import os

def migrate_database():
    db_path = 'rota.db'

    if not os.path.exists(db_path):
        print("No database file found. The new schema will be created automatically when you start the server.")
        return

    print(f"Migrating database: {db_path}")

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check if columns already exist
        cursor.execute("PRAGMA table_info(shifts)")
        columns = [column[1] for column in cursor.fetchall()]

        # Add is_holiday column if it doesn't exist
        if 'is_holiday' not in columns:
            print("Adding 'is_holiday' column...")
            cursor.execute("ALTER TABLE shifts ADD COLUMN is_holiday BOOLEAN DEFAULT 0")
            print("✓ Added 'is_holiday' column")
        else:
            print("✓ 'is_holiday' column already exists")

        # Add is_day_off column if it doesn't exist
        if 'is_day_off' not in columns:
            print("Adding 'is_day_off' column...")
            cursor.execute("ALTER TABLE shifts ADD COLUMN is_day_off BOOLEAN DEFAULT 0")
            print("✓ Added 'is_day_off' column")
        else:
            print("✓ 'is_day_off' column already exists")

        conn.commit()
        conn.close()

        print("\n✅ Migration completed successfully!")
        print("You can now restart your server.")

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        print("\nIf migration fails, you can delete the database and start fresh:")
        print("  rm rota.db")
        return False

    return True

if __name__ == "__main__":
    migrate_database()
