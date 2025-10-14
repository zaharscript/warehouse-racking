from flask import Flask, render_template, request, redirect, url_for, flash
import pyodbc
from datetime import datetime

app = Flask(__name__)
app.secret_key = "supersecret"  # needed for flash messages

# === CONFIG ===
DB_PATH = r"C:\Users\Admin\OneDrive\Pictures\agv\static\Warehouse-tracking.accdb"
CONN_STR = (
    r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};"
    f"DBQ={DB_PATH};"
)

def get_conn():
    return pyodbc.connect(CONN_STR)





# ✅ ADD THIS HELPER FUNCTION after get_conn() function in app.py:

def get_location_data():
    """Helper function to get all warehouse data for the map"""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT [Serial_Number], [Kanban_Location], [Status],
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
            last_update_in = row[3]
            last_update_out = row[4]
            
            if not kanban_location:
                continue
            
            location_data[kanban_location] = {
                'serial': serial_number,
                'status': status,
                'last_update_in': str(last_update_in) if last_update_in else None,
                'last_update_out': str(last_update_out) if last_update_out else None
            }
        except Exception as e:
            print(f"ERROR processing row: {e}")
            continue
    
    return rows, location_data

# New route for warehouse-racking.html
# ✅ ADD THIS HELPER FUNCTION after get_conn() function in app.py:

def get_location_data():
    """Helper function to get all warehouse data for the map"""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT [Serial_Number], [Kanban_Location], [Status],
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
            last_update_in = row[3]
            last_update_out = row[4]
            
            if not kanban_location:
                continue
            
            location_data[kanban_location] = {
                'serial': serial_number,
                'status': status,
                'last_update_in': str(last_update_in) if last_update_in else None,
                'last_update_out': str(last_update_out) if last_update_out else None
            }
        except Exception as e:
            print(f"ERROR processing row: {e}")
            continue
    
    return rows, location_data


# ✅ UPDATE your racking_view route to use the helper:

@app.route("/racking", methods=["GET"])
def racking_view():
    rows, location_data = get_location_data()
    
    active_tab = request.args.get("tab", "registration")
    error_serial = request.args.get("error_serial")

    return render_template("warehouse-racking.html", 
                           items=rows,
                           location_data=location_data,
                           active_tab=active_tab, 
                           error_serial=error_serial)


# ✅ UPDATE your search route to use the helper:

@app.route("/search", methods=["POST"])
def search():
    serial_number = request.form.get("serial_number")
    
    # Get all data for the map
    rows, location_data = get_location_data()
    
    # Search for specific serial number
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT Serial_Number, Kanban_Location, Status, Last_Update_In, Last_Update_Out
        FROM Warehouse_db
        WHERE Serial_Number = ?
        """,
        (serial_number,)
    )
    row = cur.fetchone()
    conn.close()

    if row:
        return render_template("warehouse-racking.html", 
                               search_result=row, 
                               location_data=location_data,
                               items=rows,
                               active_tab="search")
    else:
        flash(f"Serial number {serial_number} not found!")
        return redirect(url_for("racking_view", tab="search", error_serial=serial_number))




@app.route("/debug_db")
def debug_db():
    try:
        conn = get_conn()
        cur = conn.cursor()
        
        # Get all table names
        tables = []
        for table_info in cur.tables(tableType='TABLE'):
            tables.append(table_info.table_name)
        
        # Get column names for each table
        table_columns = {}
        for table in tables:
            try:
                columns = []
                for column in cur.columns(table=table):
                    columns.append(column.column_name)
                table_columns[table] = columns
            except:
                table_columns[table] = ["Error getting columns"]
        
        conn.close()
        
        result = "<h2>Database Debug Info:</h2>"
        result += f"<h3>Tables found: {tables}</h3>"
        for table, columns in table_columns.items():
            result += f"<h4>Table: {table}</h4>"
            result += f"<p>Columns: {', '.join(columns)}</p>"
        
        return result
        
    except Exception as e:
        return f"Debug error: {str(e)}"


# ✅ Keep your index route as is (it's fine):
@app.route("/")
def index():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT [Serial_Number], [Kanban_Location], [Status],
               [Last_Update_In], [Last_Update_Out]
        FROM [Warehouse_db]
    """)
    rows = cur.fetchall()
    conn.close()
    return render_template("index.html", items=rows)


# ✅ UPDATE your add_item route:
@app.route("/add_item", methods=["POST"])
def add_item():
    serial_number = request.form.get("serial_number")
    kanban_location = request.form.get("kanban_location")
    status = request.form.get("Status")
    now = datetime.now()

    if not serial_number or not kanban_location or not status:
        flash("❌ Please fill in all fields!", "error")
        return redirect(url_for("index"))

    conn = get_conn()
    cur = conn.cursor()

    # Check if serial number already exists
    cur.execute("""
        SELECT Serial_Number, Kanban_Location, Status
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

                # Update to new location
                cur.execute("""
                    UPDATE Warehouse_db
                    SET Kanban_Location = ?, Status = ?, Last_Update_In = ?, Last_Update_Out = NULL
                    WHERE Serial_Number = ?
                """, (kanban_location, status, now, serial_number))
                flash(f"✅ Serial {serial_number} moved to {kanban_location}!", "success")
            else:
                # Mark as Out Storage
                cur.execute("""
                    UPDATE Warehouse_db
                    SET Status = ?, Last_Update_Out = ?
                    WHERE Serial_Number = ?
                """, (status, now, serial_number))
                flash(f"✅ Serial {serial_number} marked as Out Storage!", "success")
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
                    ([Serial_Number], [Kanban_Location], [Status], [Last_Update_In], [Last_Update_Out])
                    VALUES (?, ?, ?, ?, ?)
                """, (serial_number, kanban_location, status, now, None))
                flash(f"✅ Serial {serial_number} added to {kanban_location}!", "success")
            else:
                # Adding new item as Out Storage
                cur.execute("""
                    INSERT INTO Warehouse_db 
                    ([Serial_Number], [Kanban_Location], [Status], [Last_Update_In], [Last_Update_Out])
                    VALUES (?, ?, ?, ?, ?)
                """, (serial_number, kanban_location, status, None, now))
                flash(f"✅ Serial {serial_number} added as Out Storage!", "success")

        conn.commit()
        conn.close()
        return redirect(url_for("index"))

    except Exception as e:
        conn.close()
        flash(f"❌ Error: {str(e)}", "error")
        return redirect(url_for("index"))


# ✅ UPDATE your update_status route:
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


# Add item route for warehouse-racking.html
@app.route("/add_item_racking", methods=["POST"])
def add_item_racking():
    serial_number = request.form["serial_number"]
    kanban_location = request.form["kanban_location"]
    status = request.form["Status"]
    now = datetime.now()

    # Confirmation flag (hidden input in form if user already confirmed)
    confirmed = request.form.get("confirmed", "no")

    conn = get_conn()
    cur = conn.cursor()

    # 🔍 Check if the location is already occupied
    cur.execute("""
        SELECT COUNT(*) FROM Warehouse_db
        WHERE Kanban_Location = ? AND Status = 'In Storage'
    """, (kanban_location,))
    location_exists = cur.fetchone()[0]

    if location_exists > 0:
        conn.close()
        flash(f"❌ Location '{kanban_location}' is already occupied! Please choose another slot.")
        return redirect(url_for("racking_view"))

    # 🔎 Check if serial already exists
    cur.execute("""
        SELECT Serial_Number, Kanban_Location, Status
        FROM Warehouse_db
        WHERE Serial_Number = ?
    """, (serial_number,))
    existing = cur.fetchone()

    if existing:
        # Case 1: already in DB, and status is In Storage
        if status == "In Storage":
            old_location = existing.Kanban_Location

            if old_location != kanban_location and confirmed != "yes":
                # Ask for confirmation instead of updating right away
                conn.close()
                flash(
                    f"⚠️ Serial {serial_number} already exists at {old_location}. "
                    f"Do you want to move it to {kanban_location}?",
                    "warning"
                )

                # Fetch the location_data and other required data
                conn = get_conn()
                cur = conn.cursor()

                # Get location data (adjust this query to match your racking_view route)
                cur.execute("SELECT Kanban_Location, Serial_Number, Status, Last_Update_In FROM Warehouse_db")
                rows = cur.fetchall()
                location_data = {}
                for row in rows:
                    loc, serial, stat, last_update = row
                    if loc not in location_data:
                        location_data[loc] = []
                    location_data[loc].append({
                        'serial': serial,
                        'status': stat,
                        'last_update': str(last_update) if last_update else None
                    })

                conn.close()

                # Render the same form but include hidden confirmation
                return render_template(
                    "warehouse-racking.html",
                    confirm_serial=serial_number,
                    confirm_location=kanban_location,
                    confirm_status=status,
                    active_tab="registration",
                    location_data=location_data
                )

            # User already confirmed → update location
            cur.execute("""
                UPDATE Warehouse_db
                SET Kanban_Location = ?, Status = ?, Last_Update_In = ?, Last_Update_Out = NULL
                WHERE Serial_Number = ?
            """, (kanban_location, status, now, serial_number))

        else:
            # Case 2: status "Out Storage" → mark as out
            cur.execute("""
                UPDATE Warehouse_db
                SET Status = ?, Last_Update_Out = ?
                WHERE Serial_Number = ?
            """, (status, now, serial_number))
    else:
        # Case 3: new serial → insert
        cur.execute("""
            INSERT INTO [Warehouse_db] 
            ([Serial_Number], [Kanban_Location], [Status], [Last_Update_In], [Last_Update_Out])
            VALUES (?, ?, ?, ?, ?)
        """, (serial_number, kanban_location, status, now, None))

    conn.commit()
    conn.close()

    flash(f"✅ Serial {serial_number} saved successfully!", "success")
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
    cur.execute("""
        UPDATE Warehouse_db
        SET Status = ?, Last_Update_Out = ?
        WHERE Serial_Number = ?
    """, ("Out Storage", datetime.now(), serial_number))
    rows_updated = cur.rowcount
    conn.commit()
    conn.close()

    if rows_updated > 0:
        flash(f"Serial number {serial_number} marked as 'Out Storage'.")
    else:
        flash(f"Serial number {serial_number} not found.")
    return redirect(url_for("racking_view"))


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




if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)