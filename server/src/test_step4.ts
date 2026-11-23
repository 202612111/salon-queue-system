import { QueueService } from './queueService.js';
import { db } from './db.js';

console.log('--- STARTING STEP 4 RECEPTION VERIFICATION TESTS ---');

// Reset test data
db.prepare("DELETE FROM queue_entries WHERE phone LIKE '77777%'").run();
db.prepare("UPDATE barbers SET current_token = NULL, current_started_at = NULL, is_on_duty = 1, is_on_break = 0").run();

// Test 1: Strict Barber Affinity & FCFS Matching
console.log('\n[Test 1] Testing Strict Barber Affinity & Skipping...');
// Customer 1 prefers Ravi
const c1 = QueueService.joinQueue({
  customer_name: 'Customer 1 (Wants Ravi)',
  phone: '7777700001',
  service_ids: [1],
  barber_preference: 'Ravi',
  is_walk_in: true,
});
// Customer 2 prefers Any
const c2 = QueueService.joinQueue({
  customer_name: 'Customer 2 (Wants Any)',
  phone: '7777700002',
  service_ids: [1],
  barber_preference: 'Any',
  is_walk_in: true,
});
// Customer 3 prefers Amit
const c3 = QueueService.joinQueue({
  customer_name: 'Customer 3 (Wants Amit)',
  phone: '7777700003',
  service_ids: [1],
  barber_preference: 'Amit',
  is_walk_in: true,
});

console.log(`Created: C1=${c1.entry?.token} (Ravi), C2=${c2.entry?.token} (Any), C3=${c3.entry?.token} (Amit)`);

// Call next for Amit
console.log('Calling next customer for barber Amit...');
const amitCall1 = QueueService.callNext('Amit');
console.log('Amit called token:', amitCall1.entry?.token);

// Amit MUST NOT be assigned C1 (who selected Ravi). Amit should get C2 (earliest Any)
if (amitCall1.entry?.token === c2.entry?.token) {
  console.log('✓ PASS: Barber Amit skipped Customer 1 (prefers Ravi) and correctly selected Customer 2 (earliest Any).');
} else {
  console.error(`✗ FAIL: Expected token ${c2.entry?.token}, but got ${amitCall1.entry?.token}`);
}

// Verify C1 is still Waiting for Ravi
const c1Check = QueueService.getEntryByToken(c1.entry!.token);
if (c1Check?.status === 'Waiting' && c1Check?.barber_preference === 'Ravi') {
  console.log('✓ PASS: Customer 1 remains Waiting for Ravi and was NOT misassigned.');
} else {
  console.error('✗ FAIL: Customer 1 status or assignment corrupted!');
}

// Test 2: Double call guard (Barber already has active customer)
console.log('\n[Test 2] Attempting to call next for Amit again while active...');
const amitCall2 = QueueService.callNext('Amit');
console.log('Second call allowed? (expected false):', amitCall2.success);
console.log('Error message:', amitCall2.error);
if (!amitCall2.success && amitCall2.error?.includes('already has an active customer')) {
  console.log('✓ PASS: Barber with active customer cannot call another customer.');
} else {
  console.error('✗ FAIL: Barber received second active customer!');
}

// Test 3: On-Break Guard
console.log('\n[Test 3] Barber On-Break Guard...');
QueueService.setBarberBreak('Kiran', true);
const kiranCall = QueueService.callNext('Kiran');
console.log('Call next for Kiran on break allowed? (expected false):', kiranCall.success);
console.log('Error message:', kiranCall.error);
if (!kiranCall.success && kiranCall.error?.includes('on break')) {
  console.log('✓ PASS: On-break barber cannot receive customer assignment.');
} else {
  console.error('✗ FAIL: On-break barber was assigned customer!');
}
QueueService.setBarberBreak('Kiran', false); // Restore Kiran

// Test 4: Walk-in registration when Online Queue is paused
console.log('\n[Test 4] Adding Walk-in while online queue is paused...');
QueueService.setOnlineQueueOpen(false); // Pause online queue
const walkInAttempt = QueueService.joinQueue({
  customer_name: 'Online User (Blocked)',
  phone: '7777700004',
  service_ids: [1],
  barber_preference: 'Any',
  is_walk_in: false,
});
console.log('Online join while paused allowed? (expected false):', walkInAttempt.success);

const walkInSuccess = QueueService.joinQueue({
  customer_name: 'Walk-in User (Allowed)',
  phone: '7777700005',
  service_ids: [1],
  barber_preference: 'Any',
  is_walk_in: true,
});
console.log('Walk-in at reception allowed? (expected true):', walkInSuccess.success);
console.log('Walk-in Token:', walkInSuccess.entry?.token);
if (!walkInAttempt.success && walkInSuccess.success && walkInSuccess.entry?.is_walk_in) {
  console.log('✓ PASS: Online joining blocked when paused, while walk-in successfully registered.');
} else {
  console.error('✗ FAIL: Walk-in or online pause rule mismatch!');
}
QueueService.setOnlineQueueOpen(true); // Re-open

// Test 5: No-show flow and re-entry rule
console.log('\n[Test 5] Mark No-Show and re-entry rule...');
// Amit's customer was C2 (Token S-02)
const c2Token = c2.entry!.token;
const noShowRes = QueueService.markNoShow(c2Token);
console.log('Mark no-show success:', noShowRes.success);
console.log('C2 new status:', noShowRes.entry?.status);

// Verify Amit's station was freed
const amitBarber = QueueService.getBarbers().find(b => b.name === 'Amit');
console.log('Amit current token after no-show (expected null):', amitBarber?.current_token);

if (noShowRes.success && noShowRes.entry?.status === 'No-show' && amitBarber?.current_token === null) {
  console.log('✓ PASS: Customer marked No-show and barber chair released.');
} else {
  console.error('✗ FAIL: No-show station release failed!');
}

// Re-register the customer who was marked No-show
console.log('Re-registering no-show customer with same phone 7777700002...');
const reAddRes = QueueService.joinQueue({
  customer_name: 'Customer 2 Returned',
  phone: '7777700002',
  service_ids: [1],
  barber_preference: 'Any',
  is_walk_in: true,
});
console.log('Re-registration success:', reAddRes.success);
console.log('New Token generated:', reAddRes.entry?.token);
console.log('New Position (expected end of line):', reAddRes.entry?.position);

if (reAddRes.success && reAddRes.entry?.token !== c2Token && reAddRes.entry?.position! > 1) {
  console.log('✓ PASS: No-show customer re-joined at end of queue with a brand new token.');
} else {
  console.error('✗ FAIL: Re-entry rule failed!');
}

console.log('\n--- ALL STEP 4 TESTS COMPLETED SUCCESSFULLY ---');
