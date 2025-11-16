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

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getNotices)
  .post(
    authorize('central_admin', 'local_admin', 'faculty'),
    upload.array('attachments', 5),
    createNotice
  );

router.route('/:id')
  .get(getNotice)
  .put(
    authorize('central_admin', 'local_admin', 'faculty'),
    upload.array('attachments', 5),
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
