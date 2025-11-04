"""
Quick script to check if database schema is up to date
"""
import sqlite3
import os

def check_database():
    db_path = 'rota.db'

    if not os.path.exists(db_path):
        print("❌ Database file 'rota.db' not found.")
        print("✓ This is OK - it will be created when you start the server.")
        return

    print(f"Checking database: {db_path}\n")

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check shifts table structure
        cursor.execute("PRAGMA table_info(shifts)")
        columns = cursor.fetchall()

        print("Shifts table columns:")
        print("-" * 60)

        issues = []
        for col in columns:
            col_id, name, type_, not_null, default, pk = col
            nullable = "NULL" if not_null == 0 else "NOT NULL"
            print(f"  {name:20} {type_:10} {nullable:10}")

            # Check for issues
            if name in ['start_time', 'end_time'] and not_null == 1:
                issues.append(f"Column '{name}' is NOT NULL (should be NULL)")

            if name == 'is_holiday' and name not in [c[1] for c in columns]:
                issues.append("Missing 'is_holiday' column")

            if name == 'is_day_off' and name not in [c[1] for c in columns]:
                issues.append("Missing 'is_day_off' column")

        # Check if required columns exist
        column_names = [c[1] for c in columns]
        if 'is_holiday' not in column_names:
            issues.append("Missing 'is_holiday' column")
        if 'is_day_off' not in column_names:
            issues.append("Missing 'is_day_off' column")

        conn.close()

        print("\n" + "=" * 60)
        if issues:
            print("❌ DATABASE SCHEMA ISSUES FOUND:")
            for issue in issues:
                print(f"  - {issue}")
            print("\n⚠️  You need to delete and recreate the database:")
            print("     1. Stop your server (Ctrl+C)")
            print("     2. Delete database: del rota.db")
            print("     3. Restart server: uvicorn backend.main:app --reload")
        else:
            print("✅ Database schema is up to date!")

    except Exception as e:
        print(f"❌ Error checking database: {e}")

if __name__ == "__main__":
    check_database()
