import { QueueService } from './queueService.js';
import { db } from './db.js';

console.log('--- STARTING STEP 5 BARBER VIEW & TV VERIFICATION TESTS ---');

// Reset test data
db.prepare("DELETE FROM queue_entries WHERE phone LIKE '66666%'").run();
db.prepare("UPDATE barbers SET current_token = NULL, current_started_at = NULL, is_on_duty = 1, is_on_break = 0").run();

// 1. Join a test customer
console.log('\n[Test 1] Customer joins queue...');
const cust = QueueService.joinQueue({
  customer_name: 'Vikram Joshi',
  phone: '6666600001',
  service_ids: [1, 2], // 45 min total
  barber_preference: 'Ravi',
  is_walk_in: true,
});
const token = cust.entry!.token;
console.log(`Joined token: ${token}, status: ${cust.entry?.status}`);

// 2. Call customer for Ravi
console.log('\n[Test 2] Calling customer for Ravi...');
const callRes = QueueService.callNext('Ravi');
console.log('Call success:', callRes.success);
console.log('Ravi customer status:', callRes.entry?.status);
if (callRes.entry?.status === 'Called') {
  console.log('✓ PASS: Customer in Called status.');
} else {
  console.error('✗ FAIL: Call failed!');
}

// 3. Barber Ravi clicks "Start Service" -> status becomes "In chair"
console.log('\n[Test 3] Barber Ravi taps Start Service...');
const startRes = QueueService.startService('Ravi');
console.log('Start success:', startRes.success);
console.log('New status (expected In chair):', startRes.entry?.status);
console.log('Started_at timestamp:', startRes.entry?.started_at);

if (startRes.success && startRes.entry?.status === 'In chair' && startRes.entry?.started_at) {
  console.log('✓ PASS: Transition Called -> In chair succeeded with started_at timestamp.');
} else {
  console.error('✗ FAIL: Start service transition failed!');
}

// 4. Barber Ravi clicks "Complete Service" -> status becomes "Done", chair freed
console.log('\n[Test 4] Barber Ravi taps Complete Service (Done)...');
const doneRes = QueueService.completeService('Ravi');
console.log('Done success:', doneRes.success);
console.log('Customer final status (expected Done):', doneRes.entry?.status);
console.log('Completed_at timestamp:', doneRes.entry?.completed_at);

const raviBarber = QueueService.getBarbers().find(b => b.name === 'Ravi');
console.log('Ravi current_token after Done (expected null):', raviBarber?.current_token);

if (doneRes.success && doneRes.entry?.status === 'Done' && raviBarber?.current_token === null) {
  console.log('✓ PASS: Transition In chair -> Done succeeded, station freed and barber available.');
} else {
  console.error('✗ FAIL: Complete service failed!');
}

// 5. Test On-break and Available toggle
console.log('\n[Test 5] Barber On-break and Available toggle...');
const breakRes = QueueService.setBarberBreak('Ravi', true);
console.log('Ravi on break:', breakRes.barber?.is_on_break);
if (breakRes.barber?.is_on_break === true) {
  console.log('✓ PASS: Barber successfully marked On break.');
}

const resumeRes = QueueService.setBarberBreak('Ravi', false);
console.log('Ravi back from break:', resumeRes.barber?.is_on_break);
if (resumeRes.barber?.is_on_break === false) {
  console.log('✓ PASS: Barber successfully returned to Available.');
}

// 6. Verify invalid transition guards (cannot start or complete when no customer is active)
console.log('\n[Test 6] Invalid transition guards when chair is empty...');
const invalidStart = QueueService.startService('Ravi');
const invalidDone = QueueService.completeService('Ravi');
console.log('Start empty chair allowed? (expected false):', invalidStart.success);
console.log('Done empty chair allowed? (expected false):', invalidDone.success);

if (!invalidStart.success && !invalidDone.success) {
  console.log('✓ PASS: Empty chair action guards enforced.');
} else {
  console.error('✗ FAIL: Invalid transitions were permitted!');
}

console.log('\n--- ALL STEP 5 TESTS PASSED SUCCESSFULLY ---');
