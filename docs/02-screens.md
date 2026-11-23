# Screens & Features

The application has seven required screens. Implement the routes and interactions described here. Use realistic sample salon services and barbers during development, but keep the data structure ready for owner-managed values.

## Shared interface requirements

- Provide a visible English/Gujarati language switch.
- Translate all labels, buttons, validation messages, statuses, and empty states.
- Use charcoal `#1F2937` and gold `#D4A017` as the main visual theme.
- Use responsive layouts: phone for customer and barber screens, tablet landscape for reception, and large high-contrast typography for the TV.
- Show clear loading, empty, success, and error states.
- Use consistent token and status styling on every screen.
- All actions must work and update the shared queue.

---

## Screen 1 — Home

**Route:** `/`  
**Primary user:** Customer  
**Purpose:** Explain the live queue and make joining easy.

### Content
- Salon name and logo/brand mark.
- Current open/closed status and, when available, opening hours.
- Number of people waiting and estimated wait information.
- Barber availability/status summary.
- Prominent **Join Queue** action.
- Language switch (English/Gujarati).

### Behaviour
- Join Queue navigates to `/join`.
- If online joining is closed, disable the join action and show a clear reason.
- Walk-ins may still be accepted by reception even when online joining is closed.
- Queue and barber information should reflect current shared data.

### Layout
- Mobile-first, with the join action easy to reach.
- Keep the queue summary and barber status readable without excessive scrolling.

### States
- Salon open and queue available.
- Online queue closed.
- Salon closed.
- No customers waiting.

---

## Screen 2 — Join Queue

**Route:** `/join`  
**Primary user:** Customer  
**Purpose:** Collect the details needed to create a queue entry.

### Fields and controls
- Customer name.
- Phone number: exactly 10 digits; validate before submission.
- Services: multi-select, maximum three services.
- Barber preference: a specific available barber or **Any barber**.
- Live summary showing selected services, total price, total service duration, and estimated wait.
- **Confirm / Join Queue** button.
- Language switch.

### Behaviour
- Update price and service duration immediately when services are selected or removed.
- Do not allow more than three selected services.
- Validate that the phone number contains exactly 10 digits.
- Enforce one active queue entry per phone number. If the number already has an active entry, show the existing entry/status rather than creating a duplicate.
- A customer choosing a specific barber must not be assigned to another barber.
- If the chosen barber is on break or unavailable, clearly explain the situation and prevent an invalid assignment. Do not silently change the customer's preference.
- On successful confirmation, create a token and open `/status/:id`.
- If online joining is closed, explain that online joining is unavailable and direct the customer to reception for a walk-in.

### Layout
- Mobile form with clearly separated service cards and a persistent or easy-to-find live summary.
- The confirm action must be obvious.

### States
- Empty form.
- Validation errors.
- One or more services selected.
- Maximum of three services selected.
- Existing active entry for this phone.
- Selected barber unavailable/on break.
- Queue closed for online joining.
- Submission in progress and submission failure.

---

## Screen 3 — My Status

**Route:** `/status/:id`  
**Primary user:** Customer  
**Purpose:** Let a customer track their place in the queue.

### Content
- Token number, for example `S-14`.
- Current queue position.
- Estimated waiting time.
- Selected services and barber preference/assignment.
- Current status.
- A **Start coming** message when the customer reaches second position in line.
- A prominent **It's your turn!** message when the receptionist calls them, including the assigned barber.
- Cancel queue action with a confirmation step.

### Behaviour
- Update position and estimated wait as the queue changes.
- Show **Start coming** when the customer is second in line.
- When called, show **It's your turn! Go to [barber]**.
- Cancellation must ask for confirmation before changing the status.
- A completed, cancelled, or no-show entry must no longer appear as an active waiting entry.

### Layout
- Phone-friendly, simple, reassuring, and easy to read at a glance.
- Make token and status the most prominent elements.

### States
- Waiting.
- Second in line / Start coming.
- Called / It's your turn.
- In chair.
- Done.
- Cancelled.
- No-show or entry no longer active.
- Unable to find the token.

---

## Screen 4 — Reception Dashboard

**Route:** `/reception`  
**Primary user:** Receptionist  
**Target device:** Tablet, preferably landscape  
**Purpose:** Give staff control of the live queue.

### Content
- Summary of waiting customers and queue status.
- Barber cards showing each barber's name, availability, current customer/token, and estimated time left for the current service.
- Waiting list in first-come-first-served order, showing token, customer, services, preferred barber, and waiting duration.
- **Call next** action on each eligible barber card.
- **Add walk-in** action.
- Actions to mark a called customer as **No-show** or cancel an entry.
- Queue open/closed status.

### Behaviour
- **Call next** for barber X selects the earliest waiting customer who selected X or Any.
- Never assign a customer who selected a different named barber.
- Never assign a second active customer to a barber who already has someone in the chair.
- Add walk-ins to the same queue at the end, preserving first-come-first-served order.
- No-show can be applied to a customer who has been called and has not arrived within 10 minutes.
- Ask for confirmation before destructive actions such as cancellation or no-show.
- All changes update customer, barber, and TV views in real time.

### Layout
- Tablet landscape dashboard.
- Barber cards arranged in a clear three-column row when screen width allows.
- Waiting list should be prominent and scrollable without hiding key controls.
- Show time-left clearly; a progress bar may be used if it remains readable.

### States
- No customers waiting.
- One or more barbers available.
- All barbers busy.
- Barber on break.
- Customer called.
- Queue closed to online joining.

---

## Screen 5 — Barber View

**Route:** `/barber/:name`  
**Primary user:** Barber  
**Target device:** Phone  
**Purpose:** Let a barber manage their current service.

### Content
- Barber name and availability.
- Current customer name and token.
- Customer's selected services.
- Service timer or elapsed-time indicator.
- **Start** and **Done** actions.
- Next eligible customer preview where appropriate.
- **On break / Available** toggle.

### Behaviour
- Start changes the assigned customer's status to **In chair**.
- Done changes the customer's status to **Done**, frees the barber, and makes the barber available for the next eligible customer.
- On break prevents new assignments to that barber.
- Available makes the barber eligible for assignments again.
- Do not allow two simultaneous customers in the chair for one barber.
- Updates must synchronize with reception, customer status, and TV display.

### Layout
- Phone-friendly, large touch targets, minimal clutter.
- Current customer and Start/Done actions must be the focus.

### States
- No current customer.
- Customer called but not started.
- Service in progress.
- Service completed.
- Barber on break.

---

## Screen 6 — Waiting Area TV Display

**Route:** `/display`  
**Primary user:** Waiting customers  
**Target device:** Large TV  
**Purpose:** Show who is being served and who is next.

### Content
- Salon name/brand.
- A row or column for each barber, showing barber name and current token/customer.
- Next five queue tokens in order.
- Clearly highlighted newly called token.
- Optional current time and short instruction text.

### Behaviour
- Update automatically as queue and barber statuses change.
- A newly called token flashes/highlights in gold.
- Play a short chime when a new token is called, where browser/device audio permissions allow it.
- Do not require staff to refresh the display manually.

### Layout
- High contrast and large typography readable from approximately five metres.
- Avoid small text, dense tables, and unnecessary controls.
- Designed for landscape TV display.

### States
- No customers waiting.
- Customers waiting.
- One or more barbers serving customers.
- Newly called token highlighted.

---

## Screen 7 — Owner Settings

**Route:** `/admin`  
**Primary user:** Owner/manager  
**Purpose:** Configure the salon's daily queue operation.

### Content
- Service list with English and Gujarati names, duration, price, and enabled/disabled status.
- Controls to add/edit/enable/disable services.
- Barbers on duty and their availability.
- Queue open/close control.
- Basic statistics, such as customers served and queue activity.

### Behaviour
- Service changes should affect new queue entries and the Join Queue summary.
- Do not retroactively change the stored service/price details of an existing queue entry unless explicitly confirmed.
- Marking a barber off duty or on break must prevent new assignments to that barber.
- Closing the online queue disables customer online joining. Reception may still add walk-ins.
- Validate service duration and price values.

### Layout
- Clear sections for Services, Barbers, Queue Settings, and Statistics.
- Usable on a desktop or tablet.

### States
- No services configured.
- Services available.
- Queue open.
- Queue closed.
- No barbers on duty.
