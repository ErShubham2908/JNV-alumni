const normalizeBatchAdmins = (value = []) => {
  const normalizedSet = new Set();

  for (const rawBatch of Array.isArray(value) ? value : []) {
    const batchNumber = Number(rawBatch);
    if (!Number.isInteger(batchNumber) || batchNumber < 1) {
      continue;
    }
    normalizedSet.add(batchNumber);
  }

  return [...normalizedSet].sort((left, right) => left - right);
};

const isBatchAdminForBatch = (user, batch) => {
  if (!user || !batch) {
    return false;
  }

  const batchNumber = Number(batch);
  if (!Number.isInteger(batchNumber) || batchNumber < 1) {
    return false;
  }

  return normalizeBatchAdmins(user.batchAdminOf).includes(batchNumber);
};

const canApproveBatchUser = ({ actor, targetUser, isSystemAdmin = false }) => {
  if (isSystemAdmin) {
    return true;
  }

  if (!actor || !targetUser) {
    return false;
  }

  return isBatchAdminForBatch(actor, targetUser.batch);
};

module.exports = {
  normalizeBatchAdmins,
  isBatchAdminForBatch,
  canApproveBatchUser,
};
