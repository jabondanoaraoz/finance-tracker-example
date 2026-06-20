"""
Finance Tracker — backend Flask.

Capa HTTP entre el frontend y el Sheet. NO toca Google directamente:
delega toda la persistencia en sheets_client (Apps Script Web App).

Endpoints (los que consume el frontend):
    GET  /api/transactions   -> lista transacciones (acepta filtros por query)
    POST /api/transactions   -> crea una transacción
"""

import os

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from sheets_client import sheets_get, sheets_post

# Carpeta del frontend (sirve estáticos desde el mismo servicio que la API).
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
# Permitir requests desde el frontend (útil si se sirve en otro origen).
CORS(app)

# Categoría que siempre requiere revisión manual.
REVIEW_CATEGORY = "Others"

# Filtros que el Apps Script entiende en el GET.
ALLOWED_FILTERS = {
    "owner",
    "needs_review",
    "transaction_id",
    "category",
    "from_date",
    "to_date",
}


def format_amount(raw) -> str:
    """
    Convierte un monto de entrada al formato string que espera el Apps Script.

    Gasto (negativo)  -> "($45.00)"
    Ingreso (positivo) -> "$500.00"

    Acepta el monto como número o como string ("-45", "45.00", "($45.00)").
    """
    s = str(raw).strip()
    # Los paréntesis indican negativo; lo normalizamos a signo menos.
    if "(" in s and ")" in s:
        s = "-" + s.replace("(", "").replace(")", "")
    cleaned = s.replace("$", "").replace(",", "").strip()
    try:
        value = float(cleaned)
    except ValueError:
        value = 0.0
    if value < 0:
        return f"(${abs(value):.2f})"
    return f"${value:.2f}"


@app.route("/")
def index():
    """Sirve el dashboard (frontend) desde el mismo servicio que la API."""
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/api/transactions", methods=["GET"])
def list_transactions():
    """Devuelve las transacciones del Sheet, con filtros opcionales por query."""
    filters = {k: v for k, v in request.args.items() if k in ALLOWED_FILTERS}
    return jsonify(sheets_get(filters))


@app.route("/api/transactions", methods=["POST"])
def create_transaction():
    """
    Crea una transacción nueva.

    Body esperado del frontend:
        date, amount, category, merchant, owner, account, subcategory
    El Transaction ID lo genera el Apps Script — nunca se envía acá.
    """
    data = request.get_json(silent=True) or {}

    category = data.get("category", "")
    # "Others" siempre se marca para revisión manual; el resto, no.
    needs_review = "Yes" if category == REVIEW_CATEGORY else "No"
    # Si no viene merchant, usamos la descripción como fallback para no perder dato.
    merchant = data.get("merchant") or data.get("description", "")

    # Fila en el formato exacto de columnas del Sheet (sin Transaction ID).
    sheet_row = {
        "Date": data.get("date", ""),
        "Account": data.get("account", ""),
        "Owner": data.get("owner", ""),
        "Merchant": merchant,
        "Amount (CAD)": format_amount(data.get("amount", 0)),
        "Raw Category": category,
        "App Category": category,
        "App Subcategory": data.get("subcategory", ""),
        "Needs Review": needs_review,
    }

    result = sheets_post({"action": "create", "data": sheet_row})

    # El Apps Script responde {"status": "ok"|"error", ...}: siempre validarlo.
    if result.get("status") == "ok":
        return jsonify(
            {"success": True, "transaction_id": result.get("transaction_id")}
        )
    return jsonify({"success": False, "error": result.get("message")}), 502


if __name__ == "__main__":
    # Solo para desarrollo local. En producción corre gunicorn (ver Procfile).
    # El host inyecta el puerto por la variable PORT; localmente cae en 5000.
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=True)
