const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    batch: { type: Number, required: true },
    batchAdminOf: { type: [Number], default: [] },
    house: { type: String, trim: true },
    navodaya: { type: String, trim: true },
    currently: { type: String, trim: true },
    profileImage: { type: String, default: '' },
    currentCity: { type: String, trim: true },
    profession: { type: String, trim: true },
    company: { type: String, trim: true },
    bio: { type: String, trim: true },
    socialLinks: {
      linkedin: { type: String, default: '' },
      github: { type: String, default: '' },
      instagram: { type: String, default: '' },
    },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'declined', 'deleting'],
      default: 'pending',
      index: true,
    },
    verificationDeleteAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
