const jwt = require('jsonwebtoken');
const User = require('../models/User');

const buildApprovedUserFilter = () => ({
  $or: [
    { verificationStatus: 'approved' },
    { isVerified: true },
  ],
});

const buildPublicAlumniQuery = (filters = {}) => {
  const query = {};

  if (filters.name) {
    query.name = { $regex: filters.name, $options: 'i' };
  }

  if (filters.batch) {
    query.batch = Number(filters.batch);
  }

  if (filters.house) {
    query.house = { $regex: filters.house, $options: 'i' };
  }

  return {
    ...query,
    ...buildApprovedUserFilter(),
  };
};

const dedupeAlumni = (items = []) => {
  const seen = new Set();

  return items.filter((item) => {
    const key = `${(item?.name || '').trim().toLowerCase()}-${item?.batch ?? ''}`;
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const getAlumni = async (req, res) => {
  try {
    const { page = 1, limit = 10, batch, house, name } = req.query;
    const query = buildPublicAlumniQuery({ batch, house, name });
    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    const total = await User.countDocuments(query);
    const alumni = await User.find(query)
      .select('-password')
      .sort({ batch: -1, name: 1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .lean();

    const uniqueAlumni = dedupeAlumni(alumni);

    res.json({
      alumni: uniqueAlumni,
      page: pageNumber,
      totalPages: Math.max(1, Math.ceil(total / limitNumber)),
      total,
    });
  } catch (error) {
    console.error('Get alumni error:', error);
    res.status(500).json({ message: 'Failed to fetch alumni data.' });
  }
};

const getAlumniByYear = async (req, res) => {
  try {
    const { year } = req.params;
    const alumni = await User.find({
      batch: Number(year),
      ...buildApprovedUserFilter(),
    })
      .select('-password')
      .sort({ name: 1 })
      .lean();

    res.json({ alumni: dedupeAlumni(alumni), year: Number(year) });
  } catch (error) {
    console.error('Get alumni by year error:', error);
    res.status(500).json({ message: 'Failed to fetch alumni for that batch.' });
  }
};

const searchAlumni = async (req, res) => {
  try {
    const { q } = req.query;
    const searchTerm = (q || '').trim();

    if (!searchTerm) {
      const alumni = await User.find().select('-password').sort({ batch: -1, name: 1 }).limit(20).lean();
      return res.json({ alumni: dedupeAlumni(alumni) });
    }

    const batchMatches = /^\d{4}$/.test(searchTerm) ? Number(searchTerm) : null;
    const qRegex = new RegExp(searchTerm, 'i');

    const query = {
      $and: [
        batchMatches
          ? {
              $or: [
                { name: qRegex },
                { house: qRegex },
                { batch: batchMatches },
              ],
            }
          : {
              $or: [{ name: qRegex }, { house: qRegex }, { currentCity: qRegex }],
            },
        buildApprovedUserFilter(),
      ],
    };

    const alumni = await User.find(query).select('-password').sort({ batch: -1, name: 1 }).lean();
    res.json({ alumni: dedupeAlumni(alumni) });
  } catch (error) {
    console.error('Search alumni error:', error);
    res.status(500).json({ message: 'Search failed.' });
  }
};

const getAlumniById = async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id).select('-password').lean();

    if (!targetUser) {
      return res.status(404).json({ message: 'Alumni profile not found.' });
    }

    const authorizationHeader = req.headers.authorization;
    const token = authorizationHeader?.startsWith('Bearer ') ? authorizationHeader.slice(7) : '';
    let actor = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

        if (decoded.role === 'admin') {
          actor = { role: 'admin' };
        } else if (decoded.id) {
          actor = await User.findById(decoded.id).select('-password').lean();
        }
      } catch {
        actor = null;
      }
    }

    const canAccessPendingProfile = Boolean(
      actor && (
        actor.role === 'admin' ||
        String(actor._id) === String(targetUser._id) ||
        (Array.isArray(actor.batchAdminOf) && actor.batchAdminOf.some((batch) => Number(batch) === Number(targetUser.batch)))
      )
    );

    if (!canAccessPendingProfile && targetUser.verificationStatus !== 'approved' && !targetUser.isVerified) {
      return res.status(404).json({ message: 'Alumni profile not found.' });
    }

    res.json({ alumni: targetUser });
  } catch (error) {
    console.error('Get alumni by id error:', error);
    res.status(500).json({ message: 'Failed to fetch alumni profile.' });
  }
};

module.exports = {
  buildApprovedUserFilter,
  buildPublicAlumniQuery,
  getAlumni,
  getAlumniByYear,
  searchAlumni,
  getAlumniById,
};
