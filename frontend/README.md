# JMMS Frontend

React + Vite admin frontend for the Jain Mandir Management System (JMMS).

## Run Locally

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Default dev URL: `http://localhost:5173`

## Backend Connection

The frontend calls backend APIs using `VITE_API_BASE_URL`.

- Default: `/api` (uses Vite dev proxy)
- Timeout control: `VITE_API_TIMEOUT_MS` (default `12000`)

Optional dev-proxy mode:

```env
VITE_API_BASE_URL=/api
VITE_PROXY_TARGET=http://localhost:4000
```

Optional direct-backend mode:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

In proxy mode, Vite forwards `/api`, `/health`, and `/receipts` to the backend.
