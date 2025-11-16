const express = require('express');
const router = express.Router();
const {
  acknowledgeNotice,
  getNoticeAcknowledgments,
  getUserAcknowledgments,
  getNoticeAckStats,
  getDepartmentAckStats
} = require('../controllers/acknowledgmentController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Student and Faculty routes
router.post('/:noticeId', authorize('student', 'faculty'), acknowledgeNotice);
router.get('/user', getUserAcknowledgments);

// Admin/Faculty routes
router.get('/notice/:noticeId', authorize('central_admin', 'local_admin', 'faculty'), getNoticeAcknowledgments);
router.get('/notice/:noticeId/stats', authorize('central_admin', 'local_admin', 'faculty'), getNoticeAckStats);
router.get('/department/:departmentId/stats', authorize('central_admin', 'local_admin'), getDepartmentAckStats);

module.exports = router;
