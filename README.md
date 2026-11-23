<<<<<<< HEAD
# Salon Queue Management System

**Live demo:** Add your deployed URL here  
**Hosted on:** Add your hosting provider(s) here

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

## Deployment guide

### Option A: Render (Single Service with Persistent Disk)
1. Push this repository to GitHub or GitLab.
2. Log into [Render](https://render.com) and click **New > Blueprint**.
3. Select your repository. Render automatically reads `render.yaml`.
4. The service will build (`npm install && npm run build`) and start on port 10000.
5. Persistent disk (`/var/data`) stores `salon.db` across redeployments and restarts.

### Option B: Railway (One-Click or Docker)
1. Connect repository on [Railway](https://railway.app).
2. Set Build Command to `npm run build` and Start Command to `npm start`.
3. Add a Persistent Volume mounted at `/app/data` and set environment variable `DATA_DIR=/app/data`.
4. Deploy service and copy the public `.up.railway.app` URL.

## Project documentation

- `AGENTS.md`
- `docs/01-brief.md`
- `docs/02-screens.md`
- `docs/03-flows-rules.md`

## Team / author

Add your name and required academic details here.
=======
# salon-queue-system
>>>>>>> d59f79d77e9af994b4fa22b615837b7bce173d7e
