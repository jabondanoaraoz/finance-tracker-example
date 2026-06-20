"""
Cliente HTTP del Sheet — única puerta de entrada a los datos.

El backend ya NO usa la Google Sheets API ni ningún SDK de Google
(la organización tiene deshabilitada la creación de Service Account keys:
iam.disableServiceAccountKeyCreation).

En su lugar, todo el acceso al Sheet pasa por un Google Apps Script Web App
desplegado como endpoint HTTP. La URL vive en .env como SHEETS_API_URL.

Reglas del proyecto:
  - Toda lectura/escritura del Sheet usa sheets_get() o sheets_post().
  - El Transaction ID lo genera el Apps Script: nunca enviarlo en un create.
"""

import os

import requests
from dotenv import load_dotenv

# Carga las variables de .env (SHEETS_API_URL) al entorno del proceso.
load_dotenv()

SHEETS_URL = os.getenv("SHEETS_API_URL")

# Tiempo máximo de espera por request (Apps Script puede tardar unos segundos).
TIMEOUT = 30


def _require_url():
    """Falla con un mensaje claro si la URL no está configurada."""
    if not SHEETS_URL:
        raise RuntimeError(
            "SHEETS_API_URL no está definida. Copiá backend/.env.example a "
            "backend/.env y pegá la URL del Apps Script Web App."
        )


def sheets_get(filters: dict | None = None) -> list:
    """
    Lee transacciones del Sheet con filtros opcionales.

    Filtros soportados por el Apps Script: owner, needs_review,
    transaction_id, category, from_date, to_date.

    Devuelve la lista de transacciones (el array que viene en "data").
    """
    _require_url()
    r = requests.get(SHEETS_URL, params=filters or {}, timeout=TIMEOUT)
    r.raise_for_status()
    body = r.json()
    if body.get("status") != "ok":
        raise RuntimeError(f"Apps Script error: {body.get('message')}")
    return body["data"]


def sheets_post(payload: dict) -> dict:
    """
    Ejecuta create, update o delete en el Sheet.

    Devuelve el JSON crudo del Apps Script. Siempre validar el campo "status"
    en quien llame, porque un error vuelve como {"status": "error", ...}.
    """
    _require_url()
    r = requests.post(SHEETS_URL, json=payload, timeout=TIMEOUT)
    r.raise_for_status()
    return r.json()
