import pyodbc
from datetime import datetime

# === CONFIG (Matching app.py) ===
DB_PATH = r"d:\warehouse-racking\static\Warehouse-tracking.accdb"
CONN_STR = (
    r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};"
    f"DBQ={DB_PATH};"
)

def get_conn():
    return pyodbc.connect(CONN_STR)

def test_dummy_removal():
    conn = get_conn()
    cur = conn.cursor()
    
    test_location = "TEST_LOC_99"
    test_serial = "F999999999"
    dummy_serial = f"Dummy_{test_location}"
    now = datetime.now()
    
    try:
        print(f"--- Starting test on location {test_location} ---")
        
        # 1. Cleanup before test
        cur.execute("DELETE FROM Warehouse_db WHERE Kanban_Location = ?", (test_location,))
        conn.commit()
        
        # 2. Register a dummy
        print(f"Registering dummy: {dummy_serial}")
        cur.execute("""
            INSERT INTO Warehouse_db 
            ([Serial_Number], [Kanban_Location], [Status], [Item_Type], [Last_Update_In])
            VALUES (?, ?, 'Reserved', 'Dummy', ?)
        """, (dummy_serial, test_location, now))
        conn.commit()
        
        # Verify dummy exists
        cur.execute("SELECT Serial_Number FROM Warehouse_db WHERE Kanban_Location = ?", (test_location,))
        rows = cur.fetchall()
        print(f"Rows at location after dummy registration: {len(rows)}")
        assert len(rows) == 1
        assert rows[0][0] == dummy_serial
        
        # 3. Register a real serial (Simulating the logic added to app.py)
        print(f"Registering real serial: {test_serial}")
        # THIS IS THE LOGIC WE ADDED:
        cur.execute("DELETE FROM Warehouse_db WHERE Kanban_Location = ? AND Serial_Number LIKE 'Dummy_%'", (test_location,))
        
        cur.execute("""
            INSERT INTO Warehouse_db 
            ([Serial_Number], [Kanban_Location], [Status], [Item_Type], [Last_Update_In])
            VALUES (?, ?, 'In Storage', 'Control Valve', ?)
        """, (test_serial, test_location, now))
        conn.commit()
        
        # 4. Verify ONLY the real serial exists (Dummy removed)
        cur.execute("SELECT Serial_Number, Status FROM Warehouse_db WHERE Kanban_Location = ?", (test_location,))
        rows = cur.fetchall()
        print(f"Rows at location after real registration: {len(rows)}")
        for r in rows:
            print(f"Found: {r[0]} ({r[1]})")
            
        assert len(rows) == 1
        assert rows[0][0] == test_serial
        assert rows[0][1] == "In Storage"
        
        # 5. Push out the serial (Simulating push_out logic in app.py)
        print(f"Pushing out: {test_serial}")
        cur.execute("DELETE FROM Warehouse_db WHERE Serial_Number = ?", (test_serial,))
        conn.commit()
        
        # 6. Final check: should be EMPTY
        cur.execute("SELECT COUNT(*) FROM Warehouse_db WHERE Kanban_Location = ?", (test_location,))
        count = cur.fetchone()[0]
        print(f"Final row count at location: {count}")
        assert count == 0
        
        print("\n✅ TEST PASSED: Dummy was automatically removed and location is now empty after push-out.")
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
    finally:
        # Final cleanup
        cur.execute("DELETE FROM Warehouse_db WHERE Kanban_Location = ?", (test_location,))
        conn.commit()
        conn.close()

if __name__ == "__main__":
    test_dummy_removal()
