# JMMS Backend

Express backend for the Jain Mandir Management System (JMMS), including:

- RBAC (Trustee/Admin/Executive) with JWT auth.
- Devotee family master profiles.
- Finance engine (Bhent/Boli/Gupt Daan, pledged rules, cancellation/refund logs).
- 80G-style PDF receipt generation.
- WhatsApp automation (instant paid receipt + daily due reminder sweep).
- Bhandar inventory checkout/return audit.
- Tithi/Pooja scheduler with conflict prevention.
- Mongo-backed persistence via `MONGO_URI` (with automatic JSON file fallback if Mongo is unavailable).
- Multi-tenant foundations with `mandirId` isolation primitives.

## Setup

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

Server starts on `http://localhost:4000` by default.

## Environment

- `MONGO_URI` controls primary persistence (example: `mongodb://127.0.0.1:27017/jmms`)
- If Mongo cannot be reached, backend falls back to local file store (`data/db.json`).

## Default Users

- Trustee: `trustee` / `trustee123`
- Admin: `admin` / `admin123`
- Executive: `executive` / `executive123`
- Super Admin: `superadmin` / `superadmin123`
- Devotee (sample): `amit.jain@example.org` / `devotee123`

## Core Endpoints

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/system/reference`
- `GET /api/dashboard/metrics`
- `GET /api/dashboard/reports/summary` (Trustee only)
- `GET/POST /api/families`
- `GET /api/families/:familyId`
- `GET/POST /api/transactions`
- `PATCH /api/transactions/:transactionId/status`
- `POST /api/transactions/:transactionId/cancel`
- `GET /api/transactions/cancellations/logs`
- `GET/POST /api/inventory/assets`
- `GET/POST /api/inventory/assets/checkouts`
- `POST /api/inventory/assets/checkouts/:checkoutId/return`
- `GET/POST /api/scheduler/bookings`
- `GET /api/public/home`
- `GET /api/public/library?type=ebook|video`
- `POST /api/user/register`
- `POST /api/user/login`
- `POST /api/user/session`
- `GET /api/user/me`
- `POST /api/user/payments/intents`
- `POST /api/user/payments/:paymentId/proof`
- `POST /api/user/bookings`
- `GET /api/public/mandirs`
- `GET/POST/PATCH /api/tenants/mandirs` (super admin)
- `GET/POST/PATCH/DELETE /api/content/library`
- `GET/PUT /api/whatsapp/config`
- `GET /api/whatsapp/logs`
- `POST /api/whatsapp/run-due-sweep`

## Receipt Files

Generated receipt PDFs are stored in `backend/data/receipts` and served via:

- `GET /receipts/:fileName`
