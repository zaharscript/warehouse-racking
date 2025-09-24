from flask import Flask, render_template, request, redirect, url_for
import pyodbc
import datetime

app = Flask(__name__)

# ⚡ Change this path to your actual Access DB file
DB_PATH = r"C:\Users\Admin\OneDrive\Desktop\Racking Manager System\NexT level HTML UI upgrade\warehouse-racking\warehouse-racking.accdb"

def get_conn():
    """Create a new connection to the Access database."""
    return pyodbc.connect(
        r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=" + DB_PATH + ";"
    )

def cleanup_old_records():
    """Delete records older than 1 month after Last_Update_Out."""
    conn = get_conn()
    cur = conn.cursor()

    # Find records with Last_Update_Out older than 30 days
    cutoff = datetime.datetime.now() - datetime.timedelta(days=30)

    cur.execute("""
        DELETE FROM warehouse_db
        WHERE [Last_Update_Out] IS NOT NULL
        AND [Last_Update_Out] < ?
    """, (cutoff,))
    conn.commit()
    conn.close()


@app.route("/")
def index():
    """Show all warehouse items."""
    cleanup_old_records()  # auto-clean whenever user loads homepage

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT [Serial Number], [Kanban Location], [Status], [Manual],
               [Last_Update_In], [Last_Update_Out]
        FROM warehouse_db
    """)
    rows = cur.fetchall()
    conn.close()

    return render_template("index.html", items=rows)


@app.route("/add", methods=["POST"])
def add_item():
    """Add a new warehouse item."""
    serial = request.form["serial_number"]
    location = request.form["kanban_location"]

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO warehouse_db ([Serial Number], [Kanban Location], [Status], [Manual], [Last_Update_In], [Last_Update_Out])
        VALUES (?, ?, 'In Storage', False, ?, NULL)
    """, (serial, location, datetime.datetime.now()))
    conn.commit()
    conn.close()

    return redirect(url_for("index"))


@app.route("/update", methods=["POST"])
def update_status():
    """Update status + manual flag + auto timestamps."""
    serial = request.form["serial_number"]
    status = request.form["status"]
    manual = "manual" in request.form  # True if checked

    conn = get_conn()
    cur = conn.cursor()

    if status == "In Storage":
        cur.execute("""
            UPDATE warehouse_db
            SET [Status] = ?, [Manual] = ?, [Last_Update_In] = ?
            WHERE [Serial Number] = ?
        """, (status, manual, datetime.datetime.now(), serial))
    else:
        cur.execute("""
            UPDATE warehouse_db
            SET [Status] = ?, [Manual] = ?, [Last_Update_Out] = ?
            WHERE [Serial Number] = ?
        """, (status, manual, datetime.datetime.now(), serial))

    conn.commit()
    conn.close()

    return redirect(url_for("index"))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
