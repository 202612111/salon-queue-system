# Flows, Queue Rules & Test Checklist

This document is the source of truth for queue behaviour. Apply these rules consistently in the backend and every screen.

## 1. Main customer flow — online

1. Customer opens Home (`/`).
2. Customer selects **Join Queue** and opens `/join`.
3. Customer enters name and 10-digit phone number.
4. Customer selects up to three services and chooses a specific barber or Any barber.
5. The page shows the combined service price, duration, and estimated wait.
6. Customer confirms. The system creates a queue entry and token, such as `S-14`.
7. Customer is taken to `/status/:id` and sees token, position, and estimated wait.
8. When the customer becomes second in line, show **Start coming**.
9. Reception calls the customer for an eligible barber.
10. Customer sees **It's your turn! Go to [barber]** and the TV highlights the token.
11. Barber taps **Start**; status becomes In chair.
12. Barber taps **Done**; status becomes Done and the barber becomes available.

## 2. Walk-in flow

1. Receptionist selects **Add walk-in** on `/reception`.
2. Receptionist enters the customer's name, phone number, services, and barber preference if provided.
3. The system validates the details and checks for an existing active entry for that phone number.
4. A valid walk-in joins the same queue at the end.
5. The customer receives a token and is managed by the same queue rules as online customers.

## 3. Queue statuses and allowed transitions

Use these statuses consistently:

- `Waiting` → `Called`
- `Called` → `In chair`
- `In chair` → `Done`
- `Waiting` → `Cancelled`
- `Called` → `No-show`

Do not allow backwards transitions. A completed, cancelled, or no-show entry is not an active queue entry.

## 4. Queue ordering and barber assignment

1. Queue order is first come, first served.
2. A walk-in joins at the end of the queue.
3. When reception selects **Call next** for barber X, choose the earliest eligible customer whose barber preference is X or Any.
4. A customer who selected a specific barber must never be assigned to another barber.
5. A customer who selected Any may be assigned to any eligible available barber.
6. A barber may have only one customer in the chair at a time.
7. A barber who is busy, off duty, or on break cannot receive a new assignment.
8. Calling a customer changes their status from Waiting to Called and records the assigned barber.
9. If no eligible customer exists for that barber, show a clear message; do not assign an ineligible customer.

## 5. Service totals and estimated waiting time

- A customer may select a maximum of three services.
- Total price = sum of the prices of all selected services.
- Total service duration = sum of the durations of all selected services.
- Estimated wait follows the lab rule: approximately **total minutes of services ahead ÷ number of barbers working**.
- Do not display a misleading `0 min` estimate when customers are ahead and the rule produces a positive estimate.
- Recalculate position and estimated wait when queue entries are called, started, completed, cancelled, or marked no-show, and when barber availability changes.
- Explain the estimate as an approximation; do not present it as a guaranteed start time.
- If no barbers are working, show an unavailable/unknown estimate instead of dividing by zero.

## 6. Phone number and duplicate-entry rule

- Phone number must contain exactly 10 digits.
- A phone number may have only one active queue entry at a time.
- If the same phone number tries to join again while an active entry exists, show the existing token/status and do not create a duplicate.
- Once an entry is Done, Cancelled, or No-show, the number may be used for a new entry.

## 7. No-show and cancellation

- A customer who has been Called but has not arrived within 10 minutes may be marked No-show by reception.
- No-show is available only for a Called entry.
- If a no-show customer later arrives, reception creates a new entry at the end of the queue with a new token. Do not restore their old queue position.
- A customer may cancel while Waiting; ask for confirmation.
- Do not allow a customer to cancel an entry that is already Done or No-show.
- Keep the queue history/status accurate after cancellation and no-show.

## 8. Opening and barber availability rules

- Online joining closes 30 minutes before salon closing.
- Walk-ins may still be added by reception when online joining is closed.
- When the online queue is closed, disable the customer Join action and show a clear message.
- A barber on break or off duty must not receive new customers.
- If a customer selected a barber who is on break, show a clear message such as **"Ravi is on break"**. Do not silently reassign the customer.

## 9. Real-time synchronization

- Customer status, reception dashboard, barber view, and TV display must reflect queue changes without manual refresh.
- The target for a call notification to appear on the customer's status screen is within 5 seconds.
- Start/Done actions on Barber View must update Reception and TV.
- Use the existing Socket.IO setup for live events if it is already present in the project.
- Handle reconnects: after reconnecting, a screen must fetch or receive the latest authoritative state so it does not remain stale.

## 10. Test checklist

Run these tests manually and/or through automated tests. Record Pass/Fail and evidence.

- [ ] Join with two services; verify correct combined price and duration.
- [ ] Attempt to select four services; verify the third-service limit is enforced.
- [ ] Enter a phone number with fewer/more than 10 digits or non-digits; verify validation.
- [ ] Join twice using the same phone while the first entry is active; verify no duplicate is created and the existing entry is shown.
- [ ] Call next for Amit when the earliest waiting customer selected Ravi; verify the Ravi customer is skipped.
- [ ] Call next for a barber; verify the earliest eligible X-or-Any customer is selected.
- [ ] Verify a customer who selected a specific barber is never assigned to a different barber.
- [ ] Verify a busy, off-duty, or on-break barber cannot receive another customer.
- [ ] When a customer is called, verify their phone/status view shows **It's your turn** within 5 seconds.
- [ ] Verify the TV highlights the newly called token.
- [ ] Start and Done on Barber View; verify Reception and TV update without refresh.
- [ ] Mark a Called customer No-show after 10 minutes; re-add them and verify they join at the end with a new token.
- [ ] Cancel a Waiting entry; verify confirmation is required and queue positions recalculate.
- [ ] Close online joining; verify customer Join is disabled while reception can still add a walk-in.
- [ ] Switch to Gujarati; verify all visible labels and messages are translated.
- [ ] Verify estimated wait decreases as customers ahead complete service.
- [ ] Open customer, reception, barber, and TV screens in separate browser windows; verify they stay synchronized.
- [ ] Check the customer screen on a phone-sized viewport, reception on a tablet landscape viewport, and TV display on a large landscape viewport.
- [ ] Verify empty queue, all barbers busy, no barbers working, and service/network error states.

## 11. Acceptance criteria

The project is ready for demonstration when:
- All seven routes/screens exist and their primary actions work.
- Queue assignment obeys first-come-first-served and barber preference rules.
- Duplicate active phone entries are prevented.
- Status transitions are enforced.
- Customer, reception, barber, and TV views stay synchronized.
- English and Gujarati are supported across the interface.
- The test checklist has been executed and failures are reported honestly.
- The app is deployed to a public URL and works on a phone without local setup.
