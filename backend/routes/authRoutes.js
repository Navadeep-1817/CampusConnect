const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updatePassword,
  updateProfile
} = require('../controllers/authController');
const { publicRegister } = require('../controllers/publicAuthController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.post('/login', login);
router.post('/register', publicRegister); // Public self-registration

// Protected routes
router.get('/me', protect, getMe);
router.put('/updatepassword', protect, updatePassword);
router.put('/updateprofile', protect, updateProfile);

// Admin routes - create users by admin
router.post('/admin/create-user', protect, authorize('central_admin', 'local_admin'), register);

module.exports = router;
