"""
Prueba rápida de conexión con el Apps Script Web App.

Verifica que SHEETS_API_URL está configurada y que el endpoint responde.
Imprime cuántas transacciones devuelve y un par de ejemplos.

Uso:
    python test_connection.py
"""

from sheets_client import sheets_get


def main():
    # Lee todas las transacciones (sin filtros).
    transactions = sheets_get()

    print(f"Transacciones encontradas: {len(transactions)}")
    for t in transactions[:3]:
        print(f"  - {t['Transaction ID']} | {t['Date']} | {t['Merchant']} | {t['Amount (CAD)']}")

    print("Connection OK")


if __name__ == "__main__":
    main()
