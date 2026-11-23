# Salon Queue Management System — Project Brief

## 1. Problem

Customers may spend a long time waiting at a salon without knowing their position or how long the wait will be. This creates uncertainty, crowding, and confusion about who arrived first. The salon needs one shared queue that customers and staff can see and manage in real time.

## 2. Users

- **Customer:** joins the queue, chooses services and a barber preference, and tracks their turn.
- **Receptionist:** manages the queue, registers walk-ins, calls customers, and handles cancellations and no-shows.
- **Barber:** sees the assigned customer, starts and completes a service, and changes availability.
- **Owner/manager:** configures services, prices, durations, staff availability, and queue opening hours.

## 3. Main goals

1. Make joining the queue simple on a mobile phone.
2. Show each customer their token, queue position, and estimated waiting time.
3. Give reception staff a clear dashboard to manage the shared queue.
4. Let barbers update service progress.
5. Keep customer, reception, barber, and waiting-area display views synchronized.
6. Provide a clear waiting-area TV display.
7. Support English and Gujarati labels.
8. Provide basic owner settings and queue statistics.

## 4. Must-have features

1. **Join queue:** customer enters their name and 10-digit phone number, selects up to three services, and chooses a particular barber or Any barber.
2. **Live queue status:** customer sees their token, position, estimated wait, and appropriate messages as their turn approaches or is called.
3. **Reception dashboard:** staff see waiting customers and barber cards; they can call next, add walk-ins, cancel, and mark no-shows.
4. **Barber view:** each barber sees their current customer and selected services, then marks the service Started and Done and can set themselves On break or Available.
5. **Waiting-area display:** TV shows which token is with each barber and the next five tokens; a newly called token is visually highlighted and accompanied by a chime where supported.
6. **Owner settings:** owner can manage service names, duration, price and availability; barbers on duty; queue open/closed status; and basic statistics.
7. **Language switch:** English and Gujarati labels are available throughout the application.
8. **Live synchronization:** changes made by one role appear in the other relevant views without requiring a manual refresh.

## 5. Out of scope — do not build

- Online payments.
- Future-date appointments or appointment booking.
- SMS or WhatsApp notifications.
- Loyalty points or rewards.
- Multiple salon branches or multi-tenant management.

Do not add these features unless the project owner explicitly changes the scope.

## 6. Look and feel

Premium salon feel: charcoal `#1F2937` with gold `#D4A017` accents, clean layouts, rounded cards, strong visual hierarchy, and mobile-first customer screens. The interface must also be practical on a reception tablet and readable from a distance on a waiting-area TV.

## 7. Technical direction

The current project direction is React + Vite + TypeScript + Tailwind CSS on the frontend, Express on the backend, SQLite for local data storage, and Socket.IO for live updates. Inspect the existing project before implementation and preserve its working setup. Explain any proposed architecture change before making it.
