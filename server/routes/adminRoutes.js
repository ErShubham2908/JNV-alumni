const express = require('express');
const {
  deleteAdminUser,
  getAdminDashboard,
  getAdminUsers,
  loginAdmin,
  setAdminUserVerification,
  setBatchAdminAccess,
  updateAdminUser,
} = require('../controllers/adminController');
const protectAdmin = require('../middleware/adminMiddleware');

const router = express.Router();

router.post('/login', loginAdmin);
router.get('/dashboard', protectAdmin, getAdminDashboard);
router.get('/users', protectAdmin, getAdminUsers);
router.put('/batch-admins/:userId', protectAdmin, setBatchAdminAccess);
router.put('/users/:id', protectAdmin, updateAdminUser);
router.put('/users/:id/verification', protectAdmin, setAdminUserVerification);
router.delete('/users/:id', protectAdmin, deleteAdminUser);

module.exports = router;
