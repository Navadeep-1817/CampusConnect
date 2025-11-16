const User = require('../models/User');
const Department = require('../models/Department');

// @desc    Get all users (with filtering)
// @route   GET /api/users
// @access  Private (Admin)
exports.getUsers = async (req, res) => {
  try {
    const { role, department, year, batch, search, limit = 1000, page = 1 } = req.query;
    
    let query = {};

    // Role-based filtering
    if (req.user.role === 'local_admin') {
      query.department = req.user.department;
    }

    if (role) {
      // Handle comma-separated roles
      if (role.includes(',')) {
        const roles = role.split(',').map(r => r.trim());
        query.role = { $in: roles };
      } else {
        query.role = role;
      }
    }

    if (department) {
      query.department = department;
    }

    if (year) {
      query.year = year;
    }

    if (batch) {
      query.batch = batch;
    }

    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Convert to numbers
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    const skip = (pageNum - 1) * limitNum;

    const users = await User.find(query)
      .populate('department', 'name code')
      .select('-password')
      .sort({ name: 1 }) // Sort by name for better UX
      .limit(limitNum)
      .skip(skip)
      .lean(); // Use lean() for faster queries

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
};

// @desc    Create new user
// @route   POST /api/users
// @access  Private (Admin)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, department, year, batch, employeeId, rollNumber, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Authorization check
    if (req.user.role === 'local_admin') {
      if (department !== req.user.department.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Can only create users for your department'
        });
      }
      if (['central_admin', 'local_admin'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'Cannot create admin users'
        });
      }
    }

    const userData = {
      name,
      email,
      password,
      role,
      department,
      year,
      batch,
      employeeId,
      rollNumber,
      phone,
      createdBy: req.user._id,
      isActive: true
    };

    const user = await User.create(userData);
    await user.populate('department', 'name code');

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating user'
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('department', 'name code')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check authorization
    if (req.user.role === 'local_admin' && 
        user.department.toString() !== req.user.department.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this user'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user'
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin)
exports.updateUser = async (req, res) => {
  try {
    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Authorization check
    if (req.user.role === 'local_admin') {
      if (user.department.toString() !== req.user.department.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this user'
        });
      }
      if (['central_admin', 'local_admin'].includes(req.body.role)) {
        return res.status(403).json({
          success: false,
          message: 'Cannot change user role to admin'
        });
      }
    }

    // Don't allow password update through this route
    delete req.body.password;

    user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('department', 'name code');

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user'
    });
  }
};

// @desc    Delete/Deactivate user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Authorization check
    if (req.user.role === 'local_admin' && 
        user.department.toString() !== req.user.department.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this user'
      });
    }

    // Soft delete - deactivate user
    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
};

// @desc    Activate user
// @route   PUT /api/users/:id/activate
// @access  Private (Admin)
exports.activateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User activated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error activating user'
    });
  }
};

// @desc    Get department statistics
// @route   GET /api/users/stats/department
// @access  Private (Admin)
exports.getDepartmentStats = async (req, res) => {
  try {
    const departmentId = req.user.role === 'local_admin' 
      ? req.user.department 
      : req.query.department;

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        message: 'Department ID is required'
      });
    }

    const stats = await User.aggregate([
      { $match: { department: departmentId } },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

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
