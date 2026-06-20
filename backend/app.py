"""
Finance Tracker — backend Flask.

Expone dos endpoints sobre el tab "Raw_Transactions" de la hoja de Google
Sheets "Finance Tracker":

    POST /api/transactions   -> guarda una transacción nueva
    GET  /api/transactions   -> devuelve todas las transacciones

La conexión con Sheets usa gspread + credentials.json (Service Account).
"""

import gspread
from flask import Flask, jsonify, request
from flask_cors import CORS
from google.oauth2.service_account import Credentials

# ---------------------------------------------------------------------------
# Configuración
# ---------------------------------------------------------------------------

# Permisos del service account: leer/escribir Sheets y Drive.
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

SHEET_NAME = "Finance Tracker"
TAB_NAME = "Raw_Transactions"

# Orden EXACTO de las columnas en el tab Raw_Transactions.
# Si esto cambia en la hoja, hay que actualizarlo acá también.
COLUMNS = [
    "Date",
    "Account",
    "Owner",
    "Merchant",
    "Amount (CAD)",
    "Transaction ID",
    "Raw Category",
    "App Category",
    "App Subcategory",
    "Needs Review",
]

# Categoría que siempre requiere revisión manual.
REVIEW_CATEGORY = "Others"

# ---------------------------------------------------------------------------
# App Flask
# ---------------------------------------------------------------------------

app = Flask(__name__)
# Permitir requests desde el frontend (que se abre como archivo local).
CORS(app)


def get_worksheet():
    """Autentica con Google Sheets y devuelve el tab Raw_Transactions."""
    creds = Credentials.from_service_account_file("credentials.json", scopes=SCOPES)
    client = gspread.authorize(creds)
    spreadsheet = client.open(SHEET_NAME)
    return spreadsheet.worksheet(TAB_NAME)


def next_transaction_id(worksheet):
    """
    Genera el próximo ID con formato TXN-001, TXN-002, ...

    Mira la columna "Transaction ID" de las filas existentes, busca el número
    más alto y le suma 1. Si la hoja está vacía, arranca en TXN-001.
    """
    col_index = COLUMNS.index("Transaction ID") + 1  # gspread usa índices base 1
    existing = worksheet.col_values(col_index)[1:]  # saltar el header

    max_num = 0
    for value in existing:
        # Esperamos "TXN-007"; extraemos el número final de forma tolerante.
        if value.startswith("TXN-"):
            try:
                max_num = max(max_num, int(value.split("-")[1]))
            except (IndexError, ValueError):
                continue

    return f"TXN-{max_num + 1:03d}"


@app.route("/api/transactions", methods=["POST"])
def create_transaction():
    """
    Guarda una transacción nueva en Raw_Transactions.

    Body esperado (JSON):
        date, account, owner, merchant, amount, category, subcategory, description
    """
    data = request.get_json(silent=True) or {}

    worksheet = get_worksheet()

    # ID auto-incremental basado en las filas existentes.
    transaction_id = next_transaction_id(worksheet)

    category = data.get("category", "")
    # "Others" siempre se marca para revisión manual; el resto, no.
    needs_review = "Yes" if category == REVIEW_CATEGORY else "No"

    # Si no viene merchant, usamos la descripción como fallback para no perder dato.
    merchant = data.get("merchant") or data.get("description", "")

    # Armamos la fila en el MISMO orden que COLUMNS.
    row = [
        data.get("date", ""),
        data.get("account", ""),
        data.get("owner", ""),
        merchant,
        data.get("amount", ""),
        transaction_id,
        category,  # Raw Category: lo que mandó el usuario
        category,  # App Category: por ahora igual al raw
        data.get("subcategory", ""),
        needs_review,
    ]

    # append_row agrega la fila al final del tab.
    worksheet.append_row(row, value_input_option="USER_ENTERED")

    return jsonify({"success": True, "transaction_id": transaction_id})


@app.route("/api/transactions", methods=["GET"])
def list_transactions():
    """
    Devuelve todas las filas de Raw_Transactions como un array de objetos.
    Cada objeto usa los nombres de columna como claves.
    """
    worksheet = get_worksheet()
    # get_all_records() usa la primera fila como header y devuelve dicts.
    records = worksheet.get_all_records()
    return jsonify(records)


if __name__ == "__main__":
    # debug=True recarga el servidor al guardar cambios. Solo para desarrollo.
    app.run(host="0.0.0.0", port=5000, debug=True)
