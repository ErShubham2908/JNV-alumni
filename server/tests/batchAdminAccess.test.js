const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeBatchAdmins,
  isBatchAdminForBatch,
  canApproveBatchUser,
} = require('../utils/batchAdminAccess');
const { buildPublicAlumniQuery } = require('../controllers/alumniController');

test('normalizeBatchAdmins removes duplicates and invalid values', () => {
  assert.deepEqual(normalizeBatchAdmins([2020, '2021', 2020, null, 'abc', 2022]), [2020, 2021, 2022]);
});

test('user is batch admin for assigned batch only', () => {
  const user = { batchAdminOf: [2022, 2024] };

  assert.equal(isBatchAdminForBatch(user, 2022), true);
  assert.equal(isBatchAdminForBatch(user, 2023), false);
});

test('system admin can approve any batch user', () => {
  const actor = { name: 'Admin' };
  const targetUser = { batch: 2024 };

  assert.equal(canApproveBatchUser({ actor, targetUser, isSystemAdmin: true }), true);
  assert.equal(canApproveBatchUser({ actor, targetUser, isSystemAdmin: false }), false);
});

test('assigned batch admin can approve their own batch user', () => {
  const actor = { batchAdminOf: [2024] };
  const targetUser = { batch: 2024 };

  assert.equal(canApproveBatchUser({ actor, targetUser }), true);
});

test('public alumni queries only include approved accounts', () => {
  const query = buildPublicAlumniQuery({ batch: 2024, house: 'Aravali' });

  assert.equal(query.batch, 2024);
  assert.deepEqual(query.house, { $regex: 'Aravali', $options: 'i' });
  assert.deepEqual(query.$or, [
    { verificationStatus: 'approved' },
    { isVerified: true },
  ]);
});
