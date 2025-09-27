from flask import Flask, render_template, request, redirect, url_for
import pyodbc
from datetime import datetime

app = Flask(__name__)

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

@app.route("/racking", methods=["GET"])
def racking_view():
    """Serve warehouse-racking.html page"""
    # if this page also needs database data, fetch it here
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT [Serial_Number], [Kanban_Location], [Status],
               [Last_Update_In], [Last_Update_Out]
        FROM [Warehouse_db]
    """)
    rows = cur.fetchall()
    conn.close()

    return render_template("warehouse-racking.html", items=rows)

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

@app.route("/add_item", methods=["POST"])
def add_item():
    serial_number = request.form["serial_number"]
    kanban_location = request.form["kanban_location"]
    status = request.form["Status"]
    now = datetime.now()

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO [Warehouse_db] ([Serial_Number], [Kanban_Location], [Status], [Last_Update_In], [Last_Update_Out])
        VALUES (?, ?, ?, ?, ?)
    """, (
        serial_number,
        kanban_location,
        status,
        now if status == "In Storage" else None,
        now if status == "Out Storage" else None
    ))
    conn.commit()
    conn.close()

    return redirect(url_for("index"))



if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)