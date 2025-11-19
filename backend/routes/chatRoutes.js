const express = require('express');
const router = express.Router();
const {
  createChatRoom,
  getChatRooms,
  getChatRoom,
  getChatMessages,
  sendMessage,
  deleteMessage,
  markAsRead,
  createPrivateChat
} = require('../controllers/chatController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.route('/rooms')
  .get(getChatRooms)
  .post(authorize('central_admin', 'local_admin', 'faculty'), createChatRoom);

router.route('/rooms/:id')
  .get(getChatRoom);

const upload = require('../middleware/upload');

router.route('/rooms/:id/messages')
  .get(getChatMessages)
  .post((req, res, next) => {
    // Only apply multer if Content-Type is multipart/form-data
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      upload.array('attachments', 5)(req, res, next);
    } else {
      next();
    }
  }, sendMessage);

router.route('/rooms/:id/read')
  .put(markAsRead);

router.route('/messages/:id')
  .delete(deleteMessage);

router.route('/private')
  .post(authorize('central_admin', 'local_admin', 'faculty'), createPrivateChat);

module.exports = router;
