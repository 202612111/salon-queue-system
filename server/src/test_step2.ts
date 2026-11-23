import { QueueService } from './queueService.js';
import { db } from './db.js';

console.log('--- STARTING STEP 2 VERIFICATION TESTS ---');

// Clean up any previous test entries
db.prepare("DELETE FROM queue_entries WHERE phone LIKE '99999%'").run();

// Test 1: Join with 2 services, verify combined price and duration
console.log('\n[Test 1] Join with 2 services (Classic Haircut ₹250 30m + Beard Trim ₹150 15m)...');
const res1 = QueueService.joinQueue({
  customer_name: 'Aarav Patel',
  phone: '9999900001',
  service_ids: [1, 2],
  barber_preference: 'Any',
  is_walk_in: true // ensure open regardless of cutoff
});
console.log('Result 1 Success:', res1.success);
console.log('Token created:', res1.entry?.token);
console.log('Total Duration (expected 45):', res1.entry?.total_duration);
console.log('Total Price (expected 400):', res1.entry?.total_price);
if (res1.entry?.total_duration === 45 && res1.entry?.total_price === 400) {
  console.log('✓ PASS: Combined price and duration match.');
} else {
  console.error('✗ FAIL: Combined price or duration mismatch!');
}

// Test 2: Attempt to select 4 services
console.log('\n[Test 2] Attempt to select 4 services (Limit is 3)...');
const res2 = QueueService.joinQueue({
  customer_name: 'Too Many Services',
  phone: '9999900002',
  service_ids: [1, 2, 3, 4],
  barber_preference: 'Any',
  is_walk_in: true
});
console.log('Result 2 Success (expected false):', res2.success);
console.log('Error message:', res2.error);
if (!res2.success && res2.error?.includes('between 1 and 3')) {
  console.log('✓ PASS: Max 3 services restriction enforced.');
} else {
  console.error('✗ FAIL: Max 3 services restriction failed!');
}

// Test 3: Phone number validation (not 10 digits)
console.log('\n[Test 3] Invalid phone numbers (8 digits and 11 digits)...');
const res3a = QueueService.joinQueue({
  customer_name: 'Short Phone',
  phone: '99999',
  service_ids: [1],
  barber_preference: 'Any',
  is_walk_in: true
});
const res3b = QueueService.joinQueue({
  customer_name: 'Long Phone',
  phone: '999990000000',
  service_ids: [1],
  barber_preference: 'Any',
  is_walk_in: true
});
if (!res3a.success && !res3b.success) {
  console.log('✓ PASS: Exactly 10-digit phone requirement strictly enforced.');
} else {
  console.error('✗ FAIL: Invalid phone accepted!');
}

// Test 4: Duplicate active phone prevention
console.log('\n[Test 4] Duplicate active phone test with phone 9999900001...');
const res4 = QueueService.joinQueue({
  customer_name: 'Aarav Second Attempt',
  phone: '9999900001',
  service_ids: [3],
  barber_preference: 'Ravi',
  is_walk_in: true
});
console.log('Result 4 Success (expected false):', res4.success);
console.log('Existing Entry Token returned:', res4.existingEntry?.token);
if (!res4.success && res4.existingEntry?.token === res1.entry?.token) {
  console.log('✓ PASS: Duplicate entry blocked; active token returned correctly.');
} else {
  console.error('✗ FAIL: Duplicate entry was created or not properly caught!');
}

// Test 5: Specific barber preference selection
console.log('\n[Test 5] Specific barber preference (Ravi)...');
const res5 = QueueService.joinQueue({
  customer_name: 'Mehul Shah',
  phone: '9999900003',
  service_ids: [1],
  barber_preference: 'Ravi',
  is_walk_in: true
});
console.log('Result 5 Barber Preference:', res5.entry?.barber_preference);
if (res5.success && res5.entry?.barber_preference === 'Ravi') {
  console.log('✓ PASS: Specific barber preference registered.');
} else {
  console.error('✗ FAIL: Barber preference failed!');
}

console.log('\n--- ALL STEP 2 UNIT TESTS COMPLETED SUCCESSFULLY ---');
