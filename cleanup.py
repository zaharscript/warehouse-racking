"""
cleanup.py
Daily cleanup script for warehouse_db in MS Access.
- Archives old rows to warehouse_db_archive
- Deletes rows where Last_Update_Out is 1+ month old
"""

import pyodbc
import logging
from datetime import datetime

# === CONFIG ===
DB_PATH = r"C:\Users\Admin\OneDrive\Pictures\agv\Warehouse-tracking.accdb"  
LOG_FILE = r"C:\path\to\cleanup.log"     

CONN_STR = (
    r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};"
    f"DBQ={DB_PATH};"
)

# Setup logging
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

def get_conn():
    return pyodbc.connect(CONN_STR)

def archive_and_delete():
    conn = get_conn()
    cur = conn.cursor()

    logging.info("Starting cleanup job...")

    # 1) To ensure archive table exists
    try:
        cur.execute("SELECT TOP 1 * FROM warehouse_db_archive")
    except Exception:
        logging.info("Archive table missing. Creating it...")
        cur.execute("""
            SELECT [Serial Number], Kanban_Location, Status, Manual,
                   Last_Update_In, Last_Update_Out
            INTO warehouse_db_archive
            FROM warehouse_db
            WHERE 1=0
        """)
        conn.commit()

    # 2) Move old rows to archive
    cur.execute("""
        INSERT INTO warehouse_db_archive ([Serial Number], Kanban_Location,
            Status, Manual, Last_Update_In, Last_Update_Out)
        SELECT [Serial Number], Kanban_Location, Status, Manual,
               Last_Update_In, Last_Update_Out
        FROM warehouse_db
        WHERE Last_Update_Out IS NOT NULL
          AND Date() >= DateAdd('m', 1, [Last_Update_Out])
    """)
    moved = cur.rowcount
    conn.commit()
    logging.info(f"Archived {moved} rows.")

    # 3) Delete old rows from live table
    cur.execute("""
        DELETE FROM warehouse_db
        WHERE Last_Update_Out IS NOT NULL
          AND Date() >= DateAdd('m', 1, [Last_Update_Out])
    """)
    deleted = cur.rowcount
    conn.commit()
    logging.info(f"Deleted {deleted} rows from warehouse_db.")

    conn.close()
    logging.info("Cleanup job finished.")

if __name__ == "__main__":
    try:
        archive_and_delete()
    except Exception as e:
        logging.error(f"Error during cleanup: {e}")
        raise
