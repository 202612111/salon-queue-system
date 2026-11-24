<<<<<<< HEAD
# Salon Queue Management System

**Live demo:** https://salon-queue-system-3psq-a6xag01ee-abc-f01c.vercel.app/
**Hosted on:** Vercel

## About

A real-time salon queue management application. Customers can join the queue and track their turn, while receptionists and barbers manage service progress. A waiting-area display shows current and upcoming tokens.

## Main features

- Customer queue joining and live status.
- Reception dashboard for queue management and walk-ins.
- Barber view to start and complete services.
- Waiting-area TV display.
- Owner settings for services, barbers, and queue availability.
- English and Gujarati interface.
- Live updates across screens.

## Technology

- React, Vite, TypeScript, Tailwind CSS
- Node.js and Express
- SQLite
- Socket.IO

## Run locally

```bash
# 1. Install dependencies
npm install

# 2. Run both backend (Express on port 5000) and frontend (Vite on port 5173) concurrently:
npm run dev

# Or run separately in two terminals:
npm run dev:server  # Starts Express API & Socket.IO server on http://localhost:5000
npm run dev:client  # Starts Vite React dev server on http://localhost:5173

# 3. Build for production:
npm run build

# 4. Start production server (serves API and compiled client from port 5000):
npm start
```

## Demo access

The application has no artificial barriers or paywalls for student assessment. All 7 screens are immediately accessible:
- **Screen 1 — Home:** `/`
- **Screen 2 — Join Queue:** `/join`
- **Screen 3 — My Status:** `/status/:id` (e.g. `/status/S-01`)
- **Screen 4 — Reception Dashboard:** `/reception`
- **Screen 5 — Barber View:** `/barber/:name` (e.g. `/barber/Amit`, `/barber/Ravi`, `/barber/Kiran`)
- **Screen 6 — Waiting Area TV Display:** `/display`
- **Screen 7 — Owner Settings:** `/admin`

