# Warehouse Tracking System (3rd Party Racking Management)

A comprehensive web-based solution for managing and tracking items within a warehouse racking system. This application provides real-time visibility into storage capacity, item locations, and history.

![Warehouse Racking System](warehouse-racking-system.png)

## 🚀 Key Features

- **Item Registration**: Register new items with unique serial numbers (format: F + 9 digits) and categorize them by type.
- **Interactive Warehouse Map**: A visual representation of Racking 1 and Racking 2, showing occupied, available, and reserved slots in real-time.
- **Barcode/QR Scanner**: Integrated scanner using the device camera for quick item identification and registration.
- **Advanced Search & Removal**:
    - Search items by serial number.
    - View current or last known location.
    - "Push Out" functionality to mark items as out of storage and archive records.
- **Location History**: Track the full history of items that have passed through a specific racking slot.
- **Real-time Statistics**: Dashboard showing Total Slots, Occupies Slots, Finished Goods, and Available Slots.
- **Dummy Pallet Reservation**: Ability to reserve slots with dummy pallets to manage space effectively.

## 🛠️ Tech Stack

- **Backend**: Python 3.x, Flask
- **Database**: Microsoft Access (`.accdb`) using `pyodbc`
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Scanner Library**: [html5-qrcode](https://github.com/mebjas/html5-qrcode)

## ⚙️ Installation & Setup

### Prerequisites

1.  **Python**: Ensure Python 3.x is installed.
2.  **Microsoft Access Database Engine**: Required for the `pyodbc` driver to connect to `.accdb` files.
    - Download and install from [Microsoft](https://www.microsoft.com/en-us/download/details.aspx?id=54920).
3.  **ODBC Driver**: Ensure the "Microsoft Access Driver (*.mdb, *.accdb)" is available in your system's ODBC Data Source Administrator.

### Setup Steps

1.  **Clone the Repository**:
    ```bash
    git clone <repository-url>
    cd warehouse-racking
    ```

2.  **Install Dependencies**:
    ```bash
    pip install flask pyodbc
    ```

3.  **Database Configuration**:
    - Update the `DB_PATH` in `app.py` (line 13) to point to the absolute path of your `Warehouse-tracking.accdb` file.
    ```python
    DB_PATH = r"C:\path\to\your\project\static\Warehouse-tracking.accdb"
    ```

4.  **Run the Application**:
    ```bash
    python app.py
    ```
    The application will be accessible at `http://localhost:5000`.

## 📂 Project Structure

- `app.py`: Main Flask application server and database logic.
- `templates/`: HTML templates (Jinja2).
- `static/`:
    - `css/`: Application styles.
    - `js/`: Client-side logic, including map rendering and scanner integration.
    - `img/`: Static assets and icons.
- `Warehouse-tracking.accdb`: Microsoft Access database file.

## 📝 License

© 2026 Zaharscript 📎. All rights reserved.
