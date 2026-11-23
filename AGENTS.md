# AGENTS.md — Salon Queue Management System

A salon queue application where customers join online or as walk-ins, track their turn, and receptionists and barbers manage a shared live queue. A waiting-area display shows the current and upcoming tokens.

## Read these documents first
- `docs/01-brief.md` — problem, users, scope, and exclusions.
- `docs/02-screens.md` — the seven screens, layouts, and interactions.
- `docs/03-flows-rules.md` — user flows, queue rules, edge cases, and test checklist.

## Project stack
- Frontend: React + Vite + TypeScript + Tailwind CSS.
- Backend: Node.js + Express.
- Database: SQLite for local development.
- Live updates: Socket.IO so customer, reception, barber, and TV views stay synchronized.
- Use the existing project structure and scripts where they already exist. Do not replace working configuration without explaining why.
- Use the package manager already represented by the project's lockfile. Do not create a second lockfile.
- Inspect the current code before changing it. Preserve working features.

## Design
- Premium, clean, mobile-first salon experience.
- Main palette: charcoal `#1F2937` and gold `#D4A017`.
- Use readable typography, rounded cards, clear status colours, and generous spacing.
- Support English and Gujarati. All user-facing labels must come from a central translation source; do not scatter hard-coded labels through components.
- Make the customer experience work on a phone, reception dashboard on a tablet, and waiting display on a large TV.

## Working rules
1. Work in small steps. Build only the screen or feature requested in the current task.
2. Before a substantial change, explain the plan and files to be changed; wait for approval.
3. Do not silently change the requirements in the docs. If a requirement seems contradictory or technically risky, explain the issue and ask before changing it.
4. Do not add anything in the "Don't build" section of `docs/01-brief.md`.
5. Keep queue rules in one shared backend/service layer and reuse them across screens.
6. Validate inputs on both client and server where appropriate.
7. Handle loading, empty, success, and error states. Do not leave buttons decorative: every visible action must work.
8. Keep secrets and local environment files out of Git. Provide an `.env.example` with placeholder values if environment variables are needed.
9. After each task, run the relevant checks, report the result, list changed files, and explain how to test manually.
10. Do not claim a feature is complete unless it has been run and tested.
11. Do not overwrite or delete existing project files unless the change is necessary and has been explained.
12. Keep the app usable at phone, tablet, and TV screen sizes.

## Run and verification
First inspect `package.json`, the lockfile, and existing scripts. Then tell the user the exact commands for starting the frontend and backend. Do not assume ports or script names before checking the project.

## Deployment awareness
The app must eventually be deployed with a working public URL. Check the hosting plan for both frontend and backend. SQLite data must be stored on persistent storage in production; do not deploy SQLite to an ephemeral filesystem and imply that data will persist.
