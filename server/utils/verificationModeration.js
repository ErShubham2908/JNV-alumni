const User = require('../models/User');
const Notification = require('../models/Notification');

const cleanupExpiredDeclinedUsers = async () => {
  const now = new Date();
  const expiredUsers = await User.find({
    $or: [
      { verificationStatus: 'deleting' },
      { verificationStatus: 'declined', verificationDeleteAt: { $lte: now } },
    ],
  }).select('_id').lean();
  let deletedCount = 0;

  for (const { _id } of expiredUsers) {
    const claimedUser = await User.findOneAndUpdate(
      {
        _id,
        verificationStatus: 'declined',
        verificationDeleteAt: { $lte: now },
      },
      { $set: { verificationStatus: 'deleting' } },
      { returnDocument: 'after', projection: { _id: 1 } }
    ) || await User.findOne({ _id, verificationStatus: 'deleting' }).select('_id').lean();

    if (!claimedUser) continue;

    await Notification.deleteMany({ userId: _id });
    const result = await User.deleteOne({ _id, verificationStatus: 'deleting' });
    deletedCount += result.deletedCount;
  }

  return deletedCount;
};

const initializeVerificationStatuses = async () => {
  await User.updateMany(
    { verificationStatus: { $exists: false } },
    {
      $set: {
        verificationStatus: 'pending',
        verificationDeleteAt: null,
        isVerified: false,
      },
    }
  );
};

const startDeclinedUserCleanup = () => {
  const runCleanup = async () => {
    try {
      const deletedCount = await cleanupExpiredDeclinedUsers();
      if (deletedCount) {
        console.log(`Removed ${deletedCount} declined alumni account(s) after the 10-hour grace period.`);
      }
    } catch (error) {
      console.error('Declined alumni cleanup failed:', error);
    }
  };

  void runCleanup();
  const cleanupInterval = setInterval(runCleanup, 60 * 1000);
  cleanupInterval.unref();
};

module.exports = {
  cleanupExpiredDeclinedUsers,
  initializeVerificationStatuses,
  startDeclinedUserCleanup,
};
