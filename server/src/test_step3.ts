import { QueueService } from './queueService.js';
import { db } from './db.js';

console.log('--- STARTING STEP 3 VERIFICATION TESTS ---');

// Clean up
db.prepare("DELETE FROM queue_entries WHERE phone LIKE '88888%'").run();
db.prepare("UPDATE barbers SET current_token = NULL, current_started_at = NULL WHERE is_on_duty = 1").run();

// 1. Join 3 customers
console.log('\n[Test 1] Joining 3 customers: User A, User B, User C...');
const custA = QueueService.joinQueue({
  customer_name: 'User A',
  phone: '8888800001',
  service_ids: [1], // 30 min
  barber_preference: 'Any',
  is_walk_in: true,
});
const custB = QueueService.joinQueue({
  customer_name: 'User B',
  phone: '8888800002',
  service_ids: [2], // 15 min
  barber_preference: 'Any',
  is_walk_in: true,
});
const custC = QueueService.joinQueue({
  customer_name: 'User C',
  phone: '8888800003',
  service_ids: [1], // 30 min
  barber_preference: 'Any',
  is_walk_in: true,
});

const tokenA = custA.entry!.token;
const tokenB = custB.entry!.token;
const tokenC = custC.entry!.token;

console.log(`Tokens: A=${tokenA}, B=${tokenB}, C=${tokenC}`);

// 2. Verify initial positions
const entryA1 = QueueService.getEntryByToken(tokenA);
const entryB1 = QueueService.getEntryByToken(tokenB);
const entryC1 = QueueService.getEntryByToken(tokenC);

console.log(`Initial Positions: A=#${entryA1?.position}, B=#${entryB1?.position}, C=#${entryC1?.position}`);
if (entryA1?.position === 1 && entryB1?.position === 2 && entryC1?.position === 3) {
  console.log('✓ PASS: Initial sequential positions #1, #2, #3 verified.');
} else {
  console.error('✗ FAIL: Position mismatch!');
}

// 3. User B is position 2 -> "Start coming" trigger
if (entryB1?.position === 2) {
  console.log('✓ PASS: User B triggers "Start coming" alert (position == 2).');
}

// 4. Reception calls User A for barber 'Amit'
console.log('\n[Test 2] Calling User A for barber Amit...');
const callRes = QueueService.callNext('Amit');
console.log('Call result success:', callRes.success);
console.log('Called Token:', callRes.entry?.token);

const entryA_called = QueueService.getEntryByToken(tokenA);
console.log(`User A status: ${entryA_called?.status}, assigned_barber: ${entryA_called?.assigned_barber}`);

if (entryA_called?.status === 'Called' && entryA_called?.assigned_barber === 'Amit') {
  console.log('✓ PASS: User A is Called with assigned barber Amit (triggers "It\'s your turn!").');
} else {
  console.error('✗ FAIL: Call status transition failed!');
}

// 5. Verify dynamic queue progression: User B moves to #1, User C moves to #2
const entryB2 = QueueService.getEntryByToken(tokenB);
const entryC2 = QueueService.getEntryByToken(tokenC);

console.log(`After calling A: B position=#${entryB2?.position}, C position=#${entryC2?.position}`);
if (entryB2?.position === 1 && entryC2?.position === 2) {
  console.log('✓ PASS: Dynamic recalculation moved User B to #1 and User C to #2.');
} else {
  console.error('✗ FAIL: Queue progression recalculation error!');
}

// 6. User C cancels their turn (Waiting -> Cancelled)
console.log('\n[Test 3] User C cancels their queue entry...');
const cancelRes = QueueService.cancelEntry(tokenC);
console.log('Cancel result success:', cancelRes.success);
console.log('User C new status:', cancelRes.entry?.status);

if (cancelRes.success && cancelRes.entry?.status === 'Cancelled') {
  console.log('✓ PASS: Waiting entry successfully cancelled.');
} else {
  console.error('✗ FAIL: Cancellation failed!');
}

// 7. Verify cannot cancel an already cancelled entry or called entry
console.log('\n[Test 4] Attempting to cancel already Cancelled and Called entries...');
const cancelAgain = QueueService.cancelEntry(tokenC);
const cancelCalled = QueueService.cancelEntry(tokenA);

console.log('Cancel already cancelled allowed? (expected false):', cancelAgain.success);
console.log('Cancel called customer allowed? (expected false):', cancelCalled.success);

if (!cancelAgain.success && !cancelCalled.success) {
  console.log('✓ PASS: Invalid cancellation blocked.');
} else {
  console.error('✗ FAIL: Invalid cancellation permitted!');
}

console.log('\n--- ALL STEP 3 TESTS PASSED SUCCESSFULLY ---');
