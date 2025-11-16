const express = require('express');
const router = express.Router();
const {
  createDepartment,
  getDepartments,
  getDepartment,
  updateDepartment,
  deleteDepartment,
  addBatch,
  getDepartmentStats
} = require('../controllers/departmentController');
const { protect, authorize } = require('../middleware/auth');

// Public route to get departments (needed for registration)
router.get('/', getDepartments);

// Protected route to get single department
router.get('/:id', protect, getDepartment);

// Protected routes
router.post('/', protect, authorize('central_admin'), createDepartment);
router.put('/:id', protect, authorize('central_admin', 'local_admin'), updateDepartment);
router.delete('/:id', protect, authorize('central_admin'), deleteDepartment);

router.post('/:id/batches', protect, authorize('central_admin', 'local_admin'), addBatch);
router.get('/:id/stats', protect, authorize('central_admin', 'local_admin'), getDepartmentStats);

module.exports = router;
