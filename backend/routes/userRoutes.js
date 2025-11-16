const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  activateUser,
  getDepartmentStats
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Faculty can view users in their department for student list
const checkUserAccess = (req, res, next) => {
  if (req.user.role === 'central_admin' || req.user.role === 'local_admin') {
    return next();
  }
  
  if (req.user.role === 'faculty') {
    // Faculty can only view students in their own department
    if (req.query.role === 'student' && 
        req.query.department && 
        req.query.department === (req.user.department?._id?.toString() || req.user.department?.toString())) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: 'Faculty can only view students in their own department'
    });
  }
  
  return res.status(403).json({
    success: false,
    message: 'Not authorized to access this route'
  });
};

router.use(checkUserAccess);

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/stats/department')
  .get(getDepartmentStats);

router.route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

router.route('/:id/activate')
  .put(activateUser);

module.exports = router;
