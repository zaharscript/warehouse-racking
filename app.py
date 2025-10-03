from flask import Flask, render_template, request, redirect, url_for, flash
import pyodbc
from datetime import datetime

app = Flask(__name__)
app.secret_key = "supersecret"  # needed for flash messages

# === CONFIG ===
DB_PATH = r"C:\Users\Admin\OneDrive\Pictures\agv\Warehouse-tracking.accdb"
CONN_STR = (
    r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};"
    f"DBQ={DB_PATH};"
)

def get_conn():
    return pyodbc.connect(CONN_STR)

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


# New route for warehouse-racking.html
@app.route("/racking", methods=["GET"])
def racking_view():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT [Serial_Number], [Kanban_Location], [Status],
               [Last_Update_In], [Last_Update_Out]
        FROM [Warehouse_db]
    """)
    rows = cur.fetchall()
    conn.close()

    active_tab = request.args.get("tab", "registration")
    error_serial = request.args.get("error_serial")  # 👈 capture error serial if any

    return render_template("warehouse-racking.html", items=rows,
                           active_tab=active_tab, error_serial=error_serial)



@app.route("/update_status/<serial>", methods=["POST"])
def update_status(serial):
    new_status = request.form["status"]
    now = datetime.now()

    conn = get_conn()
    cur = conn.cursor()

    if new_status == "In Storage":
        cur.execute("""
            UPDATE [Warehouse_db]
            SET [Status] = ?, [Last_Update_In] = ?
            WHERE [Serial_Number] = ?
        """, (new_status, now, serial))
    else:  # Out Storage
        cur.execute("""
            UPDATE [Warehouse_db]
            SET [Status] = ?, [Last_Update_Out] = ?
            WHERE [Serial_Number] = ?
        """, (new_status, now, serial))

    conn.commit()
    conn.close()
    return redirect(url_for("index"))

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

# Add item route for index.html
@app.route("/add_item", methods=["POST"])
def add_item():
    serial_number = request.form["serial_number"]
    kanban_location = request.form["kanban_location"]
    status = request.form["Status"]
    now = datetime.now()

    conn = get_conn()
    cur = conn.cursor()

    if status == "In Storage":
        # Insert new record
        cur.execute("""
            INSERT INTO [Warehouse_db] 
            ([Serial_Number], [Kanban_Location], [Status], [Last_Update_In], [Last_Update_Out])
            VALUES (?, ?, ?, ?, ?)
        """, (serial_number, kanban_location, status, now, None))
    else:
        # Update existing record (mark as Out Storage)
        cur.execute("""
            UPDATE Warehouse_db
            SET Status = ?, Last_Update_Out = ?
            WHERE Serial_Number = ?
        """, (status, now, serial_number))

    conn.commit()
    conn.close()

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
                flash(f"⚠️ Serial {serial_number} already exists at {old_location}. "
                      f"Do you want to move it to {kanban_location}?", "warning")

                # Render the same form but include hidden confirmation
                return render_template(
                    "warehouse-racking.html",
                    confirm_serial=serial_number,
                    confirm_location=kanban_location,
                    confirm_status=status,
                    active_tab="registration"
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




# 🔍 Search serial number 
@app.route("/search", methods=["POST"])
def search():
    serial_number = request.form.get("serial_number")
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
        return render_template("warehouse-racking.html", search_result=row, active_tab="search")
    else:
        flash(f"Serial number {serial_number} not found!")
        return redirect(url_for("racking_view", tab="search", error_serial=serial_number))




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




if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)