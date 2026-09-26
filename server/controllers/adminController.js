const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { normalizeBatchAdmins, canApproveBatchUser } = require('../utils/batchAdminAccess');

const setAdminUserVerification = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'declined'].includes(status)) {
      return res.status(400).json({ message: 'Verification status must be approved or declined.' });
    }

    const targetUser = await User.findById(req.params.id).select('_id batch verificationStatus verificationDeleteAt').lean();
    if (!targetUser) {
      return res.status(404).json({ message: 'Alumni account not found.' });
    }

    const isSystemAdmin = Boolean(req.admin);
    const isBatchAdmin = Boolean(req.user) && canApproveBatchUser({
      actor: req.user,
      targetUser,
      isSystemAdmin: false,
    });

    if (!isSystemAdmin && !isBatchAdmin) {
      return res.status(403).json({
        message: 'Only a global admin or an assigned batch admin for this batch can update verification.',
      });
    }

    const now = new Date();
    const updates = {
      verificationStatus: status,
      isVerified: status === 'approved',
      verificationDeleteAt: status === 'declined'
        ? new Date(now.getTime() + 10 * 60 * 60 * 1000)
        : null,
    };
    const eligibleUserQuery = status === 'approved'
      ? {
          _id: req.params.id,
          verificationStatus: { $nin: ['deleting'] },
          $or: [
            { verificationStatus: { $ne: 'declined' } },
            { verificationDeleteAt: { $gt: now } },
          ],
        }
      : { _id: req.params.id, verificationStatus: { $ne: 'deleting' } };
    const user = await User.findOneAndUpdate(
      eligibleUserQuery,
      { $set: updates },
      { returnDocument: 'after', runValidators: true }
    );

    if (!user) {
      const existingUser = await User.findById(req.params.id).select('verificationStatus verificationDeleteAt').lean();
      if (!existingUser) return res.status(404).json({ message: 'Alumni account not found.' });
      if (existingUser.verificationStatus === 'deleting') {
        return res.status(409).json({ message: 'This account has entered deletion processing and can no longer be approved.' });
      }
      if (existingUser.verificationStatus === 'declined' && existingUser.verificationDeleteAt <= now) {
        return res.status(409).json({ message: 'The 10-hour deletion period has ended; this account can no longer be approved.' });
      }
      return res.status(409).json({ message: 'The account verification status changed. Refresh and try again.' });
    }
    return res.json({
      user: {
        _id: user._id,
        verificationStatus: user.verificationStatus,
        verificationDeleteAt: user.verificationDeleteAt,
        isVerified: user.isVerified,
      },
      message: status === 'approved'
        ? 'Alumni profile approved.'
        : 'Alumni profile declined and scheduled for deletion in 10 hours.',
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid alumni account ID.' });
    }
    console.error('Set admin user verification error:', error);
    return res.status(500).json({ message: 'Could not update alumni verification status.' });
  }
};

const loginAdmin = (req, res) => {
  const configuredEmail = process.env.ADMIN_EMAIL?.trim();
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const { email = '', password = '' } = req.body;

  if (!configuredEmail || !configuredPassword) {
    return res.status(503).json({
      message: 'Admin login is not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD in the project root .env file.',
    });
  }

  const submittedEmail = String(email).trim();
  const submittedPassword = String(password);
  const emailMatches = submittedEmail.toLowerCase() === configuredEmail.toLowerCase();
  const expectedPassword = Buffer.from(configuredPassword);
  const actualPassword = Buffer.from(submittedPassword);
  const passwordMatches = expectedPassword.length === actualPassword.length &&
    crypto.timingSafeEqual(expectedPassword, actualPassword);

  if (!emailMatches || !passwordMatches) {
    return res.status(401).json({ message: 'Invalid admin email or password.' });
  }

  const token = jwt.sign(
    { role: 'admin', email: configuredEmail.toLowerCase() },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '8h' }
  );

  return res.json({
    token,
    admin: { email: configuredEmail },
    message: 'Admin login successful.',
  });
};

const setBatchAdminAccess = async (req, res) => {
  try {
    const { userId } = req.params;
    const { batch, isBatchAdmin } = req.body;
    const batchNumber = Number(batch);

    if (!Number.isInteger(batchNumber) || batchNumber < 1) {
      return res.status(400).json({ message: 'Batch must be a valid year.' });
    }

    if (typeof isBatchAdmin !== 'boolean') {
      return res.status(400).json({ message: 'Assign or remove batch admin permissions using a boolean value.' });
    }

    const user = await User.findById(userId).select('_id name batchAdminOf');
    if (!user) {
      return res.status(404).json({ message: 'Alumni account not found.' });
    }

    const updatedAdmins = normalizeBatchAdmins(user.batchAdminOf);
    if (isBatchAdmin) {
      updatedAdmins.push(batchNumber);
    }

    const sanitizedAdmins = normalizeBatchAdmins(updatedAdmins.filter((value) => value !== batchNumber || isBatchAdmin));
    user.batchAdminOf = sanitizedAdmins;
    await user.save();

    return res.json({
      user: {
        _id: user._id,
        name: user.name,
        batchAdminOf: user.batchAdminOf,
      },
      message: isBatchAdmin
        ? `${user.name} is now assigned as batch admin for Batch ${batchNumber}.`
        : `${user.name} was removed from Batch ${batchNumber} admin access.`,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid alumni account ID.' });
    }
    console.error('Set batch admin access error:', error);
    return res.status(500).json({ message: 'Could not update batch admin access.' });
  }
};

const getAdminDashboard = async (req, res) => {
  try {
    const [totalAlumni, totalBatches, totalBatchAdmins] = await Promise.all([
      User.countDocuments(),
      User.distinct('batch').then((batches) => batches.length),
      User.countDocuments({ batchAdminOf: { $exists: true, $ne: [] } }),
    ]);

    return res.json({
      admin: { email: req.admin.email },
      stats: { totalAlumni, totalBatches, totalBatchAdmins },
    });
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    return res.status(500).json({ message: 'Could not load the admin dashboard.' });
  }
};

const getAdminUsers = async (req, res) => {
  try {
    const { batch, house } = req.query;
    const query = {};

    if (batch) {
      const batchNumber = Number(batch);
      if (!Number.isInteger(batchNumber) || batchNumber < 1) {
        return res.status(400).json({ message: 'Batch must be a valid year.' });
      }
      query.batch = batchNumber;
    }

    if (house) query.house = String(house);

    const [users, batches, houses] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ batch: -1, house: 1, name: 1 })
        .lean(),
      User.distinct('batch'),
      User.distinct('house', { house: { $nin: ['', null] } }),
    ]);

    return res.json({
      users,
      filters: {
        batches: batches.sort((left, right) => right - left),
        houses: houses.sort((left, right) => left.localeCompare(right)),
      },
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    return res.status(500).json({ message: 'Could not load alumni accounts.' });
  }
};

const updateAdminUser = async (req, res) => {
  try {
    const allowedFields = [
      'name',
      'username',
      'email',
      'batch',
      'house',
      'navodaya',
      'currently',
      'profileImage',
      'currentCity',
      'profession',
      'company',
      'bio',
      'socialLinks',
    ];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Provide at least one profile field to update.' });
    }

    if (updates.name !== undefined) updates.name = String(updates.name).trim();
    if (updates.username !== undefined) updates.username = String(updates.username).trim().toLowerCase();
    if (updates.email !== undefined) updates.email = String(updates.email).trim().toLowerCase();
    if (updates.batch !== undefined) {
      updates.batch = Number(updates.batch);
      if (!Number.isInteger(updates.batch) || updates.batch < 1) {
        return res.status(400).json({ message: 'Batch must be a valid year.' });
      }
    }

    if (updates.name !== undefined && !updates.name) {
      return res.status(400).json({ message: 'Name is required.' });
    }
    if (updates.username !== undefined && !/^[a-z0-9._-]+$/.test(updates.username)) {
      return res.status(400).json({ message: 'Username can only contain letters, numbers, dots, underscores, and dashes.' });
    }
    if (updates.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    if (updates.socialLinks !== undefined) {
      if (!updates.socialLinks || typeof updates.socialLinks !== 'object' || Array.isArray(updates.socialLinks)) {
        return res.status(400).json({ message: 'Social links must be an object.' });
      }
      updates.socialLinks = {
        linkedin: String(updates.socialLinks.linkedin || '').trim(),
        github: String(updates.socialLinks.github || '').trim(),
        instagram: String(updates.socialLinks.instagram || '').trim(),
      };
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Alumni account not found.' });

    if (updates.username && updates.username !== user.username) {
      const usernameExists = await User.exists({ username: updates.username, _id: { $ne: user._id } });
      if (usernameExists) return res.status(409).json({ message: 'This username is already in use.' });
    }
    if (updates.email && updates.email !== user.email) {
      const emailExists = await User.exists({ email: updates.email, _id: { $ne: user._id } });
      if (emailExists) return res.status(409).json({ message: 'This email is already in use.' });
    }

    Object.assign(user, updates);
    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;
    return res.json({ user: safeUser, message: 'Alumni account updated.' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid alumni account ID.' });
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Username or email is already in use.' });
    }
    console.error('Update admin user error:', error);
    return res.status(500).json({ message: 'Could not update the alumni account.' });
  }
};

const deleteAdminUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('_id');
    if (!user) return res.status(404).json({ message: 'Alumni account not found.' });

    await User.deleteOne({ _id: user._id });
    await Notification.deleteMany({ userId: user._id });

    return res.json({ message: 'Alumni account and its notifications were permanently deleted.' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid alumni account ID.' });
    }
    console.error('Delete admin user error:', error);
    return res.status(500).json({ message: 'Could not delete the alumni account.' });
  }
};

module.exports = {
  deleteAdminUser,
  getAdminDashboard,
  getAdminUsers,
  loginAdmin,
  setAdminUserVerification,
  setBatchAdminAccess,
  updateAdminUser,
};
