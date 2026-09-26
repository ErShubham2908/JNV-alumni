const User = require('../models/User');
const Notification = require('../models/Notification');
const generateToken = require('../utils/generateToken');
const { uploadImageToDrive } = require('../utils/googleDrive');
const { getImageType } = require('../utils/imageUpload');

const normalizeName = (value = '') => value.trim();

const signup = async (req, res) => {
  try {
    const {
      name,
      username,
      email,
      batch,
      house,
      navodaya,
      currently,
      password,
      confirmPassword,
      defaultAvatar,
      currentCity,
      profession,
      company,
      bio,
      linkedin,
      github,
      instagram,
    } = req.body;

    if (!name || !username || !email || !batch || !house || !navodaya || !currently || !password) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    const normalizedUsername = String(username).trim().toLowerCase();
    const normalizedEmail = String(email).trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!/^[a-z0-9._-]+$/.test(normalizedUsername)) {
      return res.status(400).json({ message: 'Username can only contain letters, numbers, dots, underscores, and dashes.' });
    }

    if (!emailPattern.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    if (defaultAvatar && !['boy', 'girl'].includes(defaultAvatar)) {
      return res.status(400).json({ message: 'Choose a valid default avatar.' });
    }

    const normalizedName = normalizeName(name);
    const existingUserByUsername = await User.findOne({ username: normalizedUsername });
    if (existingUserByUsername) {
      return res.status(409).json({ message: 'This username is already taken. Please choose another one.' });
    }

    const existingUserByEmail = await User.findOne({ email: normalizedEmail });
    if (existingUserByEmail) {
      return res.status(409).json({ message: 'This email is already registered. Please use a different email.' });
    }

    const existingUser = await User.findOne({
      name: { $regex: new RegExp(`^${normalizedName}$`, 'i') },
      batch: Number(batch),
    });

    if (existingUser) {
      return res.status(409).json({ message: 'An alumni account for this name and batch already exists.' });
    }

    let profileImage = defaultAvatar === 'girl' ? '/avatars/girl.svg' : '/avatars/boy.svg';
    if (req.file) {
      const imageType = getImageType(req.file.buffer);
      if (!imageType) {
        return res.status(400).json({ message: 'The selected file is not a supported image.' });
      }

      try {
        const fileName = `${normalizeName(req.file.originalname).replace(/\.[^.]+$/, '')}${imageType.extension}`;
        profileImage = await uploadImageToDrive({
          ...req.file,
          mimetype: imageType.mimeType,
          originalname: fileName,
        });
      } catch (error) {
        if (error.code === 'GOOGLE_DRIVE_NOT_CONFIGURED') {
          return res.status(503).json({ message: error.message });
        }

        console.error('Signup profile image upload error:', error);
        return res.status(502).json({
          message: 'Could not upload the profile image to Google Drive. Confirm the service account has access to the configured folder, then try again.',
        });
      }
    }

    const user = await User.create({
      name: normalizedName,
      username: normalizedUsername,
      email: normalizedEmail,
      batch: Number(batch),
      house,
      navodaya,
      currently,
      profileImage,
      currentCity: currentCity || '',
      profession: profession || '',
      company: company || '',
      bio: bio || '',
      socialLinks: {
        linkedin: linkedin || '',
        github: github || '',
        instagram: instagram || '',
      },
      password,
      isVerified: false,
      verificationStatus: 'pending',
      verificationDeleteAt: null,
    });

    await Notification.create({
      userId: user._id,
      title: 'Welcome',
      message: 'Welcome to the Alumni Network!',
    });

    const token = generateToken(user._id);
    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(201).json({
      token,
      user: safeUser,
      message: 'Signup successful.',
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error while creating your profile.' });
  }
};

const login = async (req, res) => {
  try {
    const { identifier, username, email, name, batch, password } = req.body;
    const lookupValue = String(identifier || username || email || name || '').trim();

    if (!lookupValue || !password) {
      return res.status(400).json({ message: 'Username/email and password are required.' });
    }

    let user = null;
    const normalizedIdentifier = lookupValue.toLowerCase();

    user = await User.findOne({
      $or: [{ username: normalizedIdentifier }, { email: normalizedIdentifier }],
    });

    if (!user && (name || batch)) {
      user = await User.findOne({
        name: { $regex: new RegExp(`^${normalizeName(name || lookupValue)}$`, 'i') },
        batch: Number(batch),
      });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = generateToken(user._id);
    const safeUser = user.toObject();
    delete safeUser.password;

    res.json({ token, user: safeUser, message: 'Login successful.' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error while logging in.' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Failed to fetch user details.' });
  }
};

const logout = (req, res) => {
  res.json({ message: 'Logged out successfully.' });
};

module.exports = { signup, login, getMe, logout };
