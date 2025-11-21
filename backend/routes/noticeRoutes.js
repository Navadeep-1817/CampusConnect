const express = require('express');
const router = express.Router();
const {
  createNotice,
  getNotices,
  getNotice,
  updateNotice,
  deleteNotice,
  addComment,
  replyToComment
} = require('../controllers/noticeController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
  if (err) {
    console.error('❌ Multer error:', err.message);
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error',
      error: err.code
    });
  }
  next();
};

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getNotices)
  .post(
    authorize('central_admin', 'local_admin', 'faculty'),
    upload.array('attachments', 5),
    handleMulterError,
    createNotice
  );

router.route('/:id')
  .get(getNotice)
  .put(
    authorize('central_admin', 'local_admin', 'faculty'),
    upload.array('attachments', 5),
    handleMulterError,
    updateNotice
  )
  .delete(
    authorize('central_admin', 'local_admin', 'faculty'),
    deleteNotice
  );

router.route('/:id/comments')
  .post(addComment);

router.route('/:id/comments/:commentId/reply')
  .post(replyToComment);

module.exports = router;
