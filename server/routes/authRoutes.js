const express = require('express');
const { signup, login, getMe, logout } = require('../controllers/authController');
const protect = require('../middleware/authMiddleware');
const { receiveImage } = require('../utils/imageUpload');

const router = express.Router();

router.post('/signup', receiveImage('profileImage'), signup);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
