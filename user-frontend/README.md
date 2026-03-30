# JMMS User Frontend

Public user-facing website for devotees (main domain), separate from admin.
Supports mandir selection, sign-up/sign-in, and tenant-scoped dashboard views.

## Key Pages

- `/` Home
- `/ebooks` Ebooks library
- `/videos` Videos library
- `/about` About selected mandir
- `/login` Sign in
- `/register` Sign up
- `/profile` Devotee dashboard (protected)

## Run Locally

```bash
cd user-frontend
copy .env.example .env
npm install
npm run dev
```

Default dev URL: `http://localhost:5174`

## API Connection

- `VITE_API_BASE_URL=/api` (default with Vite proxy)
- `VITE_SITE_URL=https://nemnidhi.tech` (used for sitemap, robots, and canonical defaults during builds)
- `VITE_PROXY_TARGET=http://localhost:4000`

## SEO

- Route-aware titles, descriptions, canonical URLs, Open Graph tags, Twitter tags, and JSON-LD are injected at runtime.
- `robots.txt` and `sitemap.xml` are generated automatically before each production build.

This app uses:

- `GET /api/public/home`
- `GET /api/public/library`
- `GET /api/public/mandirs`
- `POST /api/user/register`
- `POST /api/user/login`
- `GET /api/user/me`
- `POST /api/user/payments/intents`
- `POST /api/user/payments/:paymentId/proof`
- `POST /api/user/bookings`
