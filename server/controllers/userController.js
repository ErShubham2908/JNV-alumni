const User = require('../models/User');
const Notification = require('../models/Notification');

const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const allowedFields = [
      'name',
      'username',
      'email',
      'house',
      'navodaya',
      'currently',
      'currentCity',
      'profession',
      'company',
      'bio',
      'profileImage',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    if (req.body.username && req.body.username !== user.username) {
      const normalizedUsername = String(req.body.username).trim().toLowerCase();
      const existingUsernameUser = await User.findOne({ username: normalizedUsername, _id: { $ne: user._id } });

      if (existingUsernameUser) {
        return res.status(409).json({ message: 'This username is already taken. Please choose another one.' });
      }

      user.username = normalizedUsername;
    }

    if (req.body.email && req.body.email !== user.email) {
      const normalizedEmail = String(req.body.email).trim().toLowerCase();
      const existingEmailUser = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });

      if (existingEmailUser) {
        return res.status(409).json({ message: 'This email is already registered. Please use a different email.' });
      }

      user.email = normalizedEmail;
    }

    if (req.body.socialLinks) {
      user.socialLinks = {
        linkedin: req.body.socialLinks.linkedin || '',
        github: req.body.socialLinks.github || '',
        instagram: req.body.socialLinks.instagram || '',
      };
    }

    await user.save();

    await Notification.create({
      userId: user._id,
      title: 'Profile updated',
      message: 'Your profile has been successfully updated.',
    });

    const updatedUser = user.toObject();
    delete updatedUser.password;

    res.json({ user: updatedUser, message: 'Profile updated successfully.' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile.' });
  }
};

module.exports = { updateProfile };
