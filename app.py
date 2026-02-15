from flask import Flask, render_template, request, redirect, url_for, flash
import pyodbc
import re
from datetime import datetime


app = Flask(__name__)
app.secret_key = "supersecret"  # needed for flash messages

# === CONFIG ===
# DB_PATH = r"C:\Users\nilai.inspection\OneDrive - Emerson\Desktop\warehouse-racking\static\Warehouse-tracking.accdb"
DB_PATH = r"static\Warehouse-tracking.accdb"
CONN_STR = (
    r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};"
    f"DBQ={DB_PATH};"
)

def get_conn():
    return pyodbc.connect(CONN_STR)

# ✅ HELPER FUNCTION

def get_statistics():
    conn = get_conn()
    cur = conn.cursor()

    # SLOT OCCUPIED → all items in Warehouse_db
    cur.execute("SELECT COUNT(*) FROM Warehouse_db")
    slot_occupied = cur.fetchone()[0]

    # FINISH GOOD → items starting with 'F' and not dummy
    cur.execute("""
        SELECT COUNT(*) 
        FROM Warehouse_db
        WHERE Serial_Number LIKE 'F%' 
        AND Serial_Number NOT LIKE 'Dummy_%'
    """)
    finish_good = cur.fetchone()[0]

    conn.close()

    # TOTAL SLOTS is fixed (136)
    total_slots = 136

    return {
        "total_slots": total_slots,
        "slot_occupied": slot_occupied,
        "finish_good": finish_good
    }

def get_location_data():
    """Helper function to get all warehouse data for the map"""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT [Serial_Number], [Kanban_Location], [Status], [Item_Type],
               [Last_Update_In], [Last_Update_Out]
        FROM [Warehouse_db]
    """)
    rows = cur.fetchall()
    conn.close()
    
    location_data = {}
    for row in rows:
        try:
            serial_number = row[0] if row[0] else "N/A"
            kanban_location = row[1] if row[1] else ""
            status = row[2] if row[2] else "Out Storage"
            item_type = row[3] if row[3] else ""
            last_update_in = row[4]
            last_update_out = row[5]
            
            if not kanban_location:
                continue
            
            location_data[kanban_location] = {
                'serial': serial_number,
                'status': status,
                'item_type': item_type,
                'last_update_in': str(last_update_in) if last_update_in else None,
                'last_update_out': str(last_update_out) if last_update_out else None
            }
        except Exception as e:
            print(f"ERROR processing row: {e}")
            continue
    
    return rows, location_data

# 🏓Update the update_status route:
@app.route("/update_status/<serial>", methods=["POST"])
def update_status(serial):
    new_status = request.form.get("status")
    
    if not new_status:
        flash("❌ Please select a status!", "error")
        return redirect(url_for("index"))
    
    now = datetime.now()

    conn = get_conn()
    cur = conn.cursor()

    try:
        if new_status == "In Storage":
            cur.execute("""
                UPDATE Warehouse_db
                SET Status = ?, Last_Update_In = ?
                WHERE Serial_Number = ?
            """, (new_status, now, serial))
            flash(f"✅ Serial {serial} marked as In Storage!", "success")
        else:  # Out Storage
            cur.execute("""
                UPDATE Warehouse_db
                SET Status = ?, Last_Update_Out = ?
                WHERE Serial_Number = ?
            """, (new_status, now, serial))
            flash(f"✅ Serial {serial} marked as Out Storage!", "success")

        conn.commit()
        conn.close()
        return redirect(url_for("index"))
        
    except Exception as e:
        conn.close()
        flash(f"❌ Error: {str(e)}", "error")
        return redirect(url_for("index"))


@app.route("/racking", methods=["GET"])
def racking_view():
    rows, location_data = get_location_data()   
    active_tab = request.args.get("tab", "registration")
    error_serial = request.args.get("error_serial")
    stats = get_statistics()

    return render_template("warehouse-racking.html", 
                           items=rows,
                           location_data=location_data,
                           active_tab=active_tab, 
                           error_serial=error_serial,
                           stats=stats)


# 🏓 UPDATE SEARCH ROUTE TO USE THE HELPER:

@app.route("/search", methods=["POST"])
def search():
    serial_number = request.form.get("serial_number")

    if not serial_number:
        flash("No serial number provided.")
        return redirect(url_for("racking_view", tab="search"))

    # Get all data for the map (your existing helper)
    rows, location_data = get_location_data()
    conn = get_conn()
    cur = conn.cursor()

    # 1️⃣ Try to find in active table first
    cur.execute("""
        SELECT Serial_Number, Kanban_Location, Status, Item_Type, Last_Update_In, Last_Update_Out
        FROM Warehouse_db
        WHERE Serial_Number = ?
    """, (serial_number,))
    row = cur.fetchone()

    # 2️⃣ If not found, check old table
    if not row:
        cur.execute("""
            SELECT Serial_Number, Kanban_Location, Status, Item_Type, Last_Update_In, Last_Update_Out
            FROM Warehouse_db_old
            WHERE Serial_Number = ?
        """, (serial_number,))
        row = cur.fetchone()

    conn.close()
    stats = get_statistics()
    # 3️⃣ Show result if found (from either table)
    if row:
       
        flash(f"Serial number {serial_number} found in {'Warehouse_db' if row else 'Warehouse_db_old'}.")
        return render_template(
            "warehouse-racking.html",
            search_result=row,
            location_data=location_data,
            items=rows,
            active_tab="search",
            stats=stats
        )
    else:
        flash(f"Serial number {serial_number} not found in active or old records!")
        return redirect(url_for("racking_view", tab="search", error_serial=serial_number))


# ✅ Keep index route as is
@app.route("/")
def index():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT [Serial_Number], [Kanban_Location], [Status], [Item_Type],
               [Last_Update_In], [Last_Update_Out]
        FROM [Warehouse_db]
    """)
    rows = cur.fetchall()
    conn.close()
    return render_template("index.html", items=rows)


# 🏓 UPDATE  add_item route:
@app.route("/add_item", methods=["POST"])
def add_item():
    serial_number = request.form.get("serial_number")
    kanban_location = request.form.get("kanban_location")
    status = request.form.get("Status")
    item_type = request.form.get("item_type")   # ✅ capture from dropdown
    now = datetime.now()

    # Validation: make sure item_type is also required
    if not serial_number or not kanban_location or not status or not item_type:
        flash("❌ Please fill in all fields!", "error")
        return redirect(url_for("index"))

    conn = get_conn()
    cur = conn.cursor()

    # Check if serial number already exists
    cur.execute("""
        SELECT Serial_Number, Kanban_Location, Status, Item_Type
        FROM Warehouse_db
        WHERE Serial_Number = ?
    """, (serial_number,))
    existing = cur.fetchone()

    try:
        if existing:
            # Serial exists - update it
            if status == "In Storage":
                # Check if new location is occupied
                cur.execute("""
                    SELECT COUNT(*) FROM Warehouse_db
                    WHERE Kanban_Location = ? AND Status = 'In Storage' AND Serial_Number != ?
                """, (kanban_location, serial_number))
                location_occupied = cur.fetchone()[0]

                if location_occupied > 0:
                    flash(f"❌ Location '{kanban_location}' is already occupied!", "error")
                    conn.close()
                    return redirect(url_for("index"))

                # Update to new location and refresh Item_Type
                cur.execute("""
                    UPDATE Warehouse_db
                    SET Kanban_Location = ?, Status = ?, Item_Type = ?, Last_Update_In = ?, Last_Update_Out = NULL
                    WHERE Serial_Number = ?
                """, (kanban_location, status, item_type, now, serial_number))
                flash(f"✅ Serial {serial_number} moved to {kanban_location} as {item_type}!", "success")
            else:
                # Mark as Out Storage and refresh Item_Type
                cur.execute("""
                    UPDATE Warehouse_db
                    SET Status = ?, Item_Type = ?, Last_Update_Out = ?
                    WHERE Serial_Number = ?
                """, (status, item_type, now, serial_number))
                flash(f"✅ Serial {serial_number} marked as Out Storage ({item_type})!", "success")
        else:
            # New serial - insert it
            if status == "In Storage":
                # Check if location is occupied
                cur.execute("""
                    SELECT COUNT(*) FROM Warehouse_db
                    WHERE Kanban_Location = ? AND Status = 'In Storage'
                """, (kanban_location,))
                location_occupied = cur.fetchone()[0]

                if location_occupied > 0:
                    flash(f"❌ Location '{kanban_location}' is already occupied!", "error")
                    conn.close()
                    return redirect(url_for("index"))

                cur.execute("""
                    INSERT INTO Warehouse_db 
                    ([Serial_Number], [Kanban_Location], [Status], [Item_Type], [Last_Update_In], [Last_Update_Out])
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (serial_number, kanban_location, status, item_type, now, None))
                flash(f"✅ Serial {serial_number} added to {kanban_location} as {item_type}!", "success")
            else:
                # Adding new item as Out Storage
                cur.execute("""
                    INSERT INTO Warehouse_db 
                    ([Serial_Number], [Kanban_Location], [Status], [Item_Type], [Last_Update_In], [Last_Update_Out])
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (serial_number, kanban_location, status, item_type, None, now))
                flash(f"✅ Serial {serial_number} added as Out Storage ({item_type})!", "success")

        conn.commit()
        conn.close()
        return redirect(url_for("index"))

    except Exception as e:
        conn.close()
        flash(f"❌ Error: {str(e)}", "error")
        return redirect(url_for("index"))


# ➕Add item route for warehouse-racking.html
@app.route("/add_item_racking", methods=["POST"])
def add_item_racking():
    serial_number = request.form.get("serial_number", "").strip()
    # Regex: F + 9 digits
    if not re.fullmatch(r"F\d{9}", serial_number):
        flash("❌ Invalid Serial Number format! Use F followed by 9 digits (e.g. F002344321)", "error")
        return redirect(url_for("racking_view", tab="registration"))
    kanban_location = request.form.get("kanban_location", "").strip()
    item_type = request.form.get("item_type", "").strip()   # ✅ capture dropdown
    status = "In Storage"  # Always "In Storage" for registration
    now = datetime.now()

    # Validation: require item_type as well
    if not serial_number or not kanban_location or not item_type:
        flash("❌ Please fill in all fields!", "error")
        return redirect(url_for("racking_view", tab="registration"))

    confirmed = request.form.get("confirmed", "no")

    conn = get_conn()
    cur = conn.cursor()

    # 🔍 Check if the location is already occupied
    cur.execute("""
        SELECT Serial_Number FROM Warehouse_db
        WHERE Kanban_Location = ? AND Status = 'In Storage'
    """, (kanban_location,))
    existing_at_location = cur.fetchone()

    if existing_at_location:
        existing_serial = existing_at_location[0]
        if existing_serial != serial_number:
            conn.close()
            flash(f"❌ Location '{kanban_location}' is already occupied by Serial {existing_serial}!", "error")
            return redirect(url_for("racking_view", tab="registration"))

    # 🔎 Check if serial already exists
    cur.execute("""
        SELECT Serial_Number, Kanban_Location, Status, Item_Type
        FROM Warehouse_db
        WHERE Serial_Number = ?
    """, (serial_number,))
    existing = cur.fetchone()

    if existing:
        old_location = existing[1]
        old_status = existing[2]
        old_item_type = existing[3]  # ✅ Get existing Item Type

        # If serial exists at a different location, ask for confirmation
        if old_location != kanban_location and confirmed != "yes":
            conn.close()
            status_msg = f"currently at {old_location}" if old_status == "In Storage" else "currently marked as Out Storage"
            flash(
                f"⚠️ Serial {serial_number} already exists ({status_msg}). "
                f"Do you want to move it to {kanban_location}?",
                "warning"
            )
            rows, location_data = get_location_data()
            return render_template(
                "warehouse-racking.html",
                confirm_serial=serial_number,
                confirm_location=kanban_location,
                confirm_status=status,
                confirm_item_type=old_item_type,  # ✅ Pass it to template
                active_tab="registration",
                location_data=location_data,
                items=rows,
                stats=get_statistics()
            )

        # User confirmed or same location → update location and refresh Item_Type
        cur.execute("""
            UPDATE Warehouse_db
            SET Kanban_Location = ?, Status = ?, Item_Type = ?, Last_Update_In = ?, Last_Update_Out = NULL
            WHERE Serial_Number = ?
        """, (kanban_location, status, item_type, now, serial_number))
        flash(f"✅ Serial {serial_number} moved to {kanban_location} as {item_type}!", "success")
    else:
        # Case: new serial → insert with Item_Type
        cur.execute("""
            INSERT INTO Warehouse_db 
            ([Serial_Number], [Kanban_Location], [Status], [Item_Type], [Last_Update_In], [Last_Update_Out])
            VALUES (?, ?, ?, ?, ?, ?)
        """, (serial_number, kanban_location, status, item_type, now, None))
        flash(f"✅ Serial {serial_number} registered at {kanban_location} as {item_type}!", "success")

    conn.commit()
    conn.close()
    return redirect(url_for("racking_view", tab="registration"))


# route for registering dummy pallet slots

@app.route("/register_dummy", methods=["POST"])
def register_dummy():
    kanban_location = request.form.get("kanban_location", "").strip()
    
    if not kanban_location:
        flash("❌ Please select a location!", "error")
        return redirect(url_for("racking_view", tab="registration"))
    
    now = datetime.now()
    serial_number = f"Dummy_{kanban_location}"
    status = "Reserved"   # New status for dummy slots
    item_type = "Dummy"   # ✅ Define item_type for dummy pallets
    
    conn = get_conn()
    cur = conn.cursor()
    
    try:
        # Check if location already has something
        cur.execute("""
            SELECT Serial_Number, Status FROM Warehouse_db
            WHERE Kanban_Location = ?
        """, (kanban_location,))
        existing = cur.fetchone()
        
        if existing:
            existing_serial = existing[0]
            existing_status = existing[1]
            
            # If it's already a dummy, remove it (toggle off)
            if existing_serial.startswith("Dummy_"):
                cur.execute("""
                    DELETE FROM Warehouse_db
                    WHERE Kanban_Location = ?
                """, (kanban_location,))
                flash(f"✅ Dummy removed from {kanban_location}!", "success")
            else:
                # Location occupied by real item
                flash(f"❌ Location {kanban_location} is occupied by {existing_serial}!", "error")
                conn.close()
                return redirect(url_for("racking_view", tab="registration"))
        else:
            # Insert dummy record
            cur.execute("""
                INSERT INTO Warehouse_db 
                ([Serial_Number], [Kanban_Location], [Status], [Item_Type], [Last_Update_In], [Last_Update_Out])
                VALUES (?, ?, ?, ?, ?, ?)
            """, (serial_number, kanban_location, status, item_type, now, None))
            flash(f"✅ Dummy pallet reserved at {kanban_location}!", "success")
        
        conn.commit()
        conn.close()
        return redirect(url_for("racking_view", tab="registration"))
        
    except Exception as e:
        conn.close()
        flash(f"❌ Error: {str(e)}", "error")
        return redirect(url_for("racking_view", tab="registration"))


# ✅ Update status to "Out Storage"
@app.route("/push_out", methods=["POST"])
def push_out():
    serial_number = request.form.get("serial_number")
    if not serial_number:
        flash("No serial number provided for push out.")
        return redirect(url_for("racking_view"))

    conn = get_conn()
    cur = conn.cursor()

    try:
        # 1️⃣ Fetch the record from Warehouse_db
        cur.execute("""
            SELECT [Serial_Number], [Kanban_Location], [Status], [Item_Type], [Last_Update_In] 
            FROM Warehouse_db 
            WHERE Serial_Number = ?
        """, (serial_number,))
        record = cur.fetchone()

        if not record:
            flash(f"Serial number {serial_number} not found.")
            conn.close()
            return redirect(url_for("racking_view", tab="search"))

        new_update_out = datetime.now()

        # 2️⃣ Check if it exists in Warehouse_db_old
        cur.execute("""
            SELECT Serial_Number FROM Warehouse_db_old 
            WHERE Serial_Number = ?
        """, (serial_number,))
        exists = cur.fetchone()

        if exists:
            # Update existing record
            cur.execute("""
                UPDATE Warehouse_db_old
                SET [Kanban_Location] = ?, 
                    [Status] = 'Out Storage', 
                    [Item_Type] = ?, 
                    [Last_Update_In] = ?, 
                    [Last_Update_Out] = ?
                WHERE Serial_Number = ?
            """, (record[1], record[3], record[4], new_update_out, serial_number))
            flash(f"ℹ️ Updated existing archive record for Serial {serial_number}.")
        else:
            # Insert new record
            cur.execute("""
                INSERT INTO Warehouse_db_old 
                ([Serial_Number], [Kanban_Location], [Status], [Item_Type], [Last_Update_In], [Last_Update_Out])
                VALUES (?, ?, 'Out Storage', ?, ?, ?)
            """, (record[0], record[1], record[3], record[4], new_update_out))
            flash(f"✅ Serial {serial_number} archived.")

        # 3️⃣ Delete from active table
        cur.execute("DELETE FROM Warehouse_db WHERE Serial_Number = ?", (serial_number,))

        conn.commit()

    except Exception as e:
        conn.rollback()
        flash(f"❌ Error: {e}")
    finally:
        conn.close()

    return redirect(url_for("racking_view", tab="search"))

# Alternate route for debugging
@app.route("/debug_locations")
def debug_locations():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT [Serial_Number], [Kanban_Location], [Status]
        FROM [Warehouse_db]
    """)
    rows = cur.fetchall()
    conn.close()
    
    result = "<h2>Database Locations Debug</h2>"
    result += f"<p>Total records: {len(rows)}</p>"
    result += "<table border='1' cellpadding='5'>"
    result += "<tr><th>Serial Number</th><th>Kanban Location</th><th>Status</th></tr>"
    
    for row in rows:
        result += f"<tr><td>{row[0]}</td><td>{row[1]}</td><td>{row[2]}</td></tr>"
    
    result += "</table>"
    result += "<br><p><strong>Expected format examples:</strong></p>"
    result += "<ul>"
    result += "<li>R1_A4_01, R1_A4_02, ... R1_A4_18</li>"
    result += "<li>R1_A3_01, R1_A3_02, ... R1_A3_18</li>"
    result += "<li>R2_A4_01, R2_A4_02, ... R2_A4_16</li>"
    result += "</ul>"
    
    return result

@app.route('/api/warehouse_data')
def get_warehouse_data():
    items = YourModel.query.all()
    
    warehouse_data = {}
    for item in items:
        warehouse_data[item.location] = {
            'serial': item.serial_number,
            'status': item.status,
            'last_update_in': str(item.timestamp_in) if item.timestamp_in else None,
            'last_update_out': str(item.timestamp_out) if item.timestamp_out else None
        }
    
    return jsonify(warehouse_data)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)