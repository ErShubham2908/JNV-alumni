const express = require('express');
const protect = require('../middleware/authMiddleware');
const { updateProfile } = require('../controllers/userController');
const { setAdminUserVerification } = require('../controllers/adminController');

const router = express.Router();

router.put('/profile', protect, updateProfile);
router.put('/verification/:id', protect, setAdminUserVerification);

module.exports = router;
