const User = require('../models/User');
const Department = require('../models/Department');
const { generateToken } = require('../middleware/auth');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Private (Only admins can create users)
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, department, year, batch, rollNumber, employeeId, phone } = req.body;

    // Authorization checks
    if (req.user.role === 'local_admin' && !['faculty', 'student'].includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Local admin can only create faculty and student accounts'
      });
    }

    if (req.user.role === 'local_admin' && department !== req.user.department.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Local admin can only create users in their own department'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user data object
    const userData = {
      name,
      email,
      password,
      role,
      createdBy: req.user._id
    };

    // Add role-specific fields
    if (role !== 'central_admin') {
      userData.department = department;
    }

    if (role === 'student') {
      userData.year = year;
      userData.batch = batch;
      userData.rollNumber = rollNumber;
    }

    if (role === 'faculty' || role === 'local_admin') {
      userData.employeeId = employeeId;
    }

    if (phone) {
      userData.phone = phone;
    }

    // Create user
    const user = await User.create(userData);

    // Update department with new user
    if (department) {
      const dept = await Department.findById(department);
      if (dept) {
        if (role === 'local_admin') {
          dept.localAdmin = user._id;
        } else if (role === 'faculty') {
          dept.faculty.push(user._id);
        } else if (role === 'student') {
          dept.students.push(user._id);
        }
        await dept.save();
      }
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating user'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for user (include password field)
    const user = await User.findOne({ email })
      .select('+password')
      .populate('department', 'name code _id');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact administrator.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in'
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('department', 'name code _id');
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user data'
    });
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      token
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating password'
    });
  }
};

// @desc    Update profile
// @route   PUT /api/auth/updateprofile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const allowedFields = ['name', 'phone', 'profilePicture', 'department', 'year', 'section', 'batch', 'rollNumber', 'employeeId'];
    const updates = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== '') {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).populate('department', 'name code');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `This ${field} is already in use`
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Error updating profile'
    });
  }
};
