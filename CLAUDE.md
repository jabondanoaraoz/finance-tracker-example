# Finance Tracker — Santiago & Carolina

## Propósito
App personal de finanzas. Guarda gastos en Google Sheets y los muestra
en un dashboard en el browser. Dos usuarios: Santiago y Carolina.

## Stack
- Backend: Python 3 + Flask
- Storage: Google Sheets API v4 (gspread)
- Frontend: HTML + CSS + JavaScript vanilla
- Auth: ninguna por ahora (localhost)

## Estructura de carpetas
finance-tracker/
├── CLAUDE.md
├── README.md
├── .gitignore
├── backend/
│   ├── app.py
│   ├── credentials.json   ← NO va a GitHub
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── styles.css
    └── app.js

## Google Sheets
- Sheet name: "Finance Tracker"
- Tab: Raw_Transactions — columnas: Date, Account, Owner, Merchant,
  Amount (CAD), Transaction ID, Raw Category, App Category,
  App Subcategory, Needs Review
- Credenciales en backend/credentials.json (Service Account)

## Categorías de gastos
Groceries | Entertainment | Fixed & Home | Medical | Pets |
Transportation | Others

## Dueños de transacciones
- Santiago → mostrar avatar chip "S"
- Carolina → mostrar avatar chip "C"
- Joint → mostrar avatar chip compartido

## Colores UI
- Verde: positivo, on track, bajo presupuesto
- Ámbar: atención, cerca del límite
- Rojo: sobre presupuesto — usar con moderación
- Neutral: gris oscuro / blanco para UI estándar

## Tipografía
- Preferida: Inter o DM Sans (Google Fonts)
- Números: tabular figures para alineación

## Diseño
- Mobile-first (390px base)
- El dashboard responde una pregunta en 5 segundos:
  ¿cómo vamos este mes?
- Clean y confiable — no flashy
