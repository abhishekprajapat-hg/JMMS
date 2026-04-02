# JMMS Mobile

Expo-based mobile app that mirrors the user website experience and connects to the same JMMS backend APIs.

## Features

- Home dashboard with live `/api/public/home` data plus fallback content
- Ebooks and videos library backed by `/api/public/library`
- Donation flow using `/api/user/payments/intents` and `/api/user/payments/:paymentId/proof`
- Built-in Jain calendar using the same local Panchang data as the website
- Devotee login, signup, profile, receipts, saved books, and watch history

## Run locally

```bash
cd user-mobile
copy .env.example .env
npm install
npm start
```

Useful scripts:

- `npm run android`
- `npm run ios`
- `npm run web`
- `npm run doctor`
- `npm run export:android`
- `npm run build:preview`

## Backend connection

Set `EXPO_PUBLIC_API_BASE_URL` in `.env`.

Examples:

- Android emulator: `http://10.0.2.2:4000/api`
- iOS simulator: `http://localhost:4000/api`
- Physical device: `http://<your-computer-lan-ip>:4000/api`

The backend should be running from the repo's `backend` folder on port `4000`.

## Android preview build

This project includes [eas.json](/c:/Users/abhishe/OneDrive/Desktop/JMMS/user-mobile/eas.json) with a `preview` profile that produces an APK build.

Example:

```bash
npx eas-cli login
npm run build:preview
```

If you are building from CI, set `EXPO_TOKEN` instead of running interactive login.

Assumed package IDs:

- Android: `tech.nemnidhi.jmmsmobile`
- iOS: `tech.nemnidhi.jmmsmobile`

Change those in [app.json](/c:/Users/abhishe/OneDrive/Desktop/JMMS/user-mobile/app.json) if you want a different final app identifier before publishing.
