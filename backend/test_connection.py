"""
Prueba rápida de conexión con Google Sheets.

Verifica que credentials.json funciona y que podemos abrir la hoja
"Finance Tracker". Imprime los tabs encontrados y "Connection OK".

Uso:
    python test_connection.py
"""

import gspread
from google.oauth2.service_account import Credentials

# Permisos que necesita el service account: leer/escribir Sheets y Drive.
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

# Nombre exacto de la hoja en Google Drive.
SHEET_NAME = "Finance Tracker"


def main():
    # 1. Cargar las credenciales del service account desde el JSON local.
    creds = Credentials.from_service_account_file("credentials.json", scopes=SCOPES)

    # 2. Autenticar el cliente de gspread con esas credenciales.
    client = gspread.authorize(creds)

    # 3. Abrir la hoja por su nombre.
    spreadsheet = client.open(SHEET_NAME)

    # 4. Imprimir los nombres de todos los tabs encontrados.
    print("Tabs encontrados:")
    for ws in spreadsheet.worksheets():
        print(f"  - {ws.title}")

    # 5. Si llegamos hasta acá sin errores, la conexión funciona.
    print("Connection OK")


if __name__ == "__main__":
    main()
