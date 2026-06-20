# Finance Tracker

App personal de finanzas para Santiago y Carolina. Registra gastos en una hoja de
Google Sheets y los muestra en un dashboard mobile-first que responde una pregunta
en 5 segundos: **¿cómo vamos este mes?**

## Stack

- **Backend:** Python 3 + Flask (capa HTTP, sin SDK de Google)
- **Frontend:** HTML + CSS + JavaScript vanilla
- **Storage:** Google Sheets `Finance Tracker` (tab `Raw_Transactions`), accedido
  mediante un **Google Apps Script Web App** desplegado como endpoint HTTP

> No se usa la Google Sheets API ni Service Accounts: la organización tiene
> deshabilitada la creación de keys. Todo el acceso al Sheet pasa por el endpoint
> de Apps Script, vía `backend/sheets_client.py`.

## Estructura

```
finance-tracker/
├── CLAUDE.md                 # contexto del proyecto para el agente
├── README.md
├── .gitignore
├── backend/
│   ├── app.py               # endpoints Flask (GET/POST /api/transactions)
│   ├── sheets_client.py     # cliente del Sheet (sheets_get / sheets_post)
│   ├── test_connection.py   # prueba el endpoint de Apps Script
│   ├── requirements.txt     # dependencias Python
│   ├── .env                 # SHEETS_API_URL — local, NO va a GitHub
│   └── .env.example         # plantilla de .env
└── frontend/
    ├── index.html           # dashboard
    ├── styles.css           # estilos
    └── app.js               # lógica del frontend
```

## Puesta en marcha

### 1. Configurar el endpoint (una sola vez)

```bash
cd backend
cp .env.example .env
# Editar .env y pegar la URL real del Apps Script Web App (termina en /exec)
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
python test_connection.py   # debe imprimir "Connection OK"
python app.py               # arranca en http://localhost:5000
```

### 3. Frontend

Abrir `frontend/index.html` directamente en el browser (no necesita servidor).
Requiere que el backend esté corriendo en `localhost:5000`.

## Endpoints

| Método | Ruta                  | Descripción                                              |
|--------|-----------------------|---------------------------------------------------------|
| `POST` | `/api/transactions`   | Guarda una transacción nueva y devuelve su `transaction_id` |
| `GET`  | `/api/transactions`   | Devuelve todas las transacciones como JSON              |

## Notas

- `backend/.env` está en `.gitignore`: **nunca** se commitea.
- El `Transaction ID` lo genera el Apps Script — no se envía al crear.
- Sin autenticación por ahora — pensado para uso en `localhost`.
