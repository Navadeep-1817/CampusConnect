const Department = require('../models/Department');
const User = require('../models/User');
const mongoose = require('mongoose');

// @desc    Create department
// @route   POST /api/departments
// @access  Private (Central Admin)
exports.createDepartment = async (req, res) => {
  try {
    const { name, code, description, batches } = req.body;

    const department = await Department.create({
      name,
      code,
      description,
      batches,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: department
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating department'
    });
  }
};

// @desc    Get all departments
// @route   GET /api/departments
// @access  Public/Private
exports.getDepartments = async (req, res) => {
  try {
    // If user is authenticated and is local_admin, show only their department
    let query = {};
    if (req.user && req.user.role === 'local_admin') {
      query = { _id: req.user.department };
    }

    const departments = await Department.find(query)
      .populate('localAdmin', 'name email employeeId')
      .select('name code description batches hodName hodEmail hodPhone localAdmin')
      .sort({ name: 1 });

    // Add counts for students and faculty
    const departmentsWithCounts = await Promise.all(
      departments.map(async (dept) => {
        const studentsCount = await User.countDocuments({ 
          department: dept._id, 
          role: 'student',
          isActive: true 
        });
        const facultyCount = await User.countDocuments({ 
          department: dept._id, 
          role: 'faculty',
          isActive: true 
        });

        return {
          ...dept.toObject(),
          studentsCount,
          facultyCount
        };
      })
    );

    res.status(200).json({
      success: true,
      count: departmentsWithCounts.length,
      data: departmentsWithCounts
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching departments'
    });
  }
};

// @desc    Get single department
// @route   GET /api/departments/:id
// @access  Public/Private
exports.getDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('📍 GET Department Request:', {
      id,
      user: req.user ? { id: req.user._id, role: req.user.role, department: req.user.department } : 'Not authenticated'
    });

    // Validate ObjectId
    if (!require('mongoose').Types.ObjectId.isValid(id)) {
      console.error('❌ Invalid ObjectId:', id);
      return res.status(400).json({
        success: false,
        message: 'Invalid department ID format'
      });
    }

    const department = await Department.findById(id)
      .populate('localAdmin', 'name email employeeId phone')
      .populate('faculty', 'name email employeeId phone')
      .populate('students', 'name email rollNumber year batch');

    if (!department) {
      console.error('❌ Department not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Authorization check (only if user is authenticated)
    if (req.user && req.user.role === 'local_admin') {
      const userDeptId = req.user.department?._id || req.user.department;
      if (department._id.toString() !== userDeptId.toString()) {
        console.warn('⚠️ Unauthorized access attempt:', {
          requestedDept: id,
          userDept: userDeptId
        });
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this department'
        });
      }
    }

    console.log('✅ Department fetched successfully:', department.name);

    res.status(200).json({
      success: true,
      data: department
    });
  } catch (error) {
    console.error('❌ Get department error:', {
      message: error.message,
      stack: error.stack,
      params: req.params
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching department'
    });
  }
};

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private (Central Admin)
exports.updateDepartment = async (req, res) => {
  try {
    let department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    department = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('localAdmin', 'name email');

    res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      data: department
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating department'
    });
  }
};

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Private (Central Admin)
exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Soft delete
    department.isActive = false;
    await department.save();

    res.status(200).json({
      success: true,
      message: 'Department deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting department'
    });
  }
};

// @desc    Add batch to department
// @route   POST /api/departments/:id/batches
// @access  Private (Admin)
exports.addBatch = async (req, res) => {
  try {
    const { batch } = req.body;
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    if (!batch) {
      return res.status(400).json({
        success: false,
        message: 'Batch name is required'
      });
    }

    // Check if batch already exists
    if (department.batches.includes(batch)) {
      return res.status(400).json({
        success: false,
        message: 'Batch already exists'
      });
    }

    department.batches.push(batch);
    await department.save();

    res.status(200).json({
      success: true,
      message: 'Batch added successfully',
      data: department
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding batch'
    });
  }
};

// @desc    Get department statistics
// @route   GET /api/departments/:id/stats
// @access  Private (Admin)
exports.getDepartmentStats = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    const stats = {
      totalFaculty: department.faculty.length,
      totalStudents: department.students.length,
      batches: department.batches.length
    };

    // Get year-wise student count
    const yearWiseCount = await User.aggregate([
      { 
        $match: { 
          department: department._id,
          role: 'student'
        }
      },
      {
        $group: {
          _id: '$year',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    stats.yearWiseCount = yearWiseCount;

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    });
  }
};
