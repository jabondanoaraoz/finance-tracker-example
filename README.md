# Finance Tracker

App personal de finanzas para Santiago y Carolina. Registra gastos en una hoja de
Google Sheets y los muestra en un dashboard mobile-first que responde una pregunta
en 5 segundos: **¿cómo vamos este mes?**

## Stack

- **Backend:** Python 3 + Flask + [gspread](https://docs.gspread.org) (Google Sheets API v4)
- **Frontend:** HTML + CSS + JavaScript vanilla
- **Storage:** una hoja de Google Sheets llamada `Finance Tracker`, tab `Raw_Transactions`

## Estructura

```
finance-tracker/
├── CLAUDE.md                 # contexto del proyecto para el agente
├── README.md
├── .gitignore
├── backend/
│   ├── app.py               # servidor Flask (POST/GET /api/transactions)
│   ├── test_connection.py   # prueba la conexión con Google Sheets
│   ├── requirements.txt     # dependencias Python
│   └── credentials.json     # Service Account — local, NO va a GitHub
└── frontend/
    ├── index.html           # dashboard
    ├── styles.css           # estilos
    └── app.js               # lógica del frontend
```

## Puesta en marcha

### 1. Google Cloud (una sola vez)

1. Crear un proyecto en [console.cloud.google.com](https://console.cloud.google.com).
2. Habilitar **Google Sheets API**.
3. Crear una **cuenta de servicio** con rol Editor y descargar la clave JSON.
4. Guardar la clave como `backend/credentials.json`.
5. Compartir la hoja `Finance Tracker` con el email del service account (como Editor).

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

- `credentials.json` está en `.gitignore`: **nunca** se commitea.
- Sin autenticación por ahora — pensado para uso en `localhost`.
