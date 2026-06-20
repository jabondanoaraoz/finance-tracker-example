# Finance Tracker — Santiago & Carolina

## Propósito
App personal de finanzas. Guarda gastos en Google Sheets y los muestra
en un dashboard en el browser. Dos usuarios: Santiago y Carolina.

## Stack
- Backend: Python 3 + Flask (capa HTTP, sin SDK de Google)
- Storage: Google Sheets vía Apps Script Web App (endpoint HTTP)
- Frontend: HTML + CSS + JavaScript vanilla
- Auth: ninguna por ahora (localhost)

## Estructura de carpetas
finance-tracker/
├── CLAUDE.md
├── README.md
├── .gitignore
├── backend/
│   ├── app.py            ← endpoints Flask que consume el frontend
│   ├── sheets_client.py  ← única puerta al Sheet (sheets_get / sheets_post)
│   ├── requirements.txt
│   ├── .env              ← SHEETS_API_URL — NO va a GitHub
│   └── .env.example
└── frontend/
    ├── index.html
    ├── styles.css
    └── app.js

## Acceso al Sheet (IMPORTANTE)
- NO se usa la Google Sheets API ni ningún SDK (gspread, google-auth,
  googleapiclient). La organización deshabilitó la creación de Service
  Account keys (iam.disableServiceAccountKeyCreation).
- Todo el acceso pasa por un Google Apps Script Web App (endpoint HTTP).
  La URL vive en backend/.env como SHEETS_API_URL.
- Toda lectura/escritura usa sheets_get() o sheets_post() de sheets_client.py.
- El Transaction ID lo genera el Apps Script: NUNCA enviarlo en un create.
- Amount (CAD): al CREAR se envía como string contable ("($45.00)" gasto,
  "$500.00" ingreso). Al LEER, el endpoint lo devuelve como número.
- Sheet: tab Raw_Transactions — columnas: Date, Account, Owner, Merchant,
  Amount (CAD), Transaction ID, Raw Category, App Category,
  App Subcategory, Needs Review

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
