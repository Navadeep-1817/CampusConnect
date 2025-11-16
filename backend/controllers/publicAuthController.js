const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

// @desc    Public self-registration (for students)
// @route   POST /api/auth/public-register
// @access  Public
exports.publicRegister = async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;

    // Validate input
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Validate role - only allow student, faculty, and local_admin for self-registration
    const allowedRoles = ['student', 'faculty', 'local_admin', 'central_admin'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    // Department is required for non-central-admin roles
    if (role !== 'central_admin' && !department) {
      return res.status(400).json({
        success: false,
        message: 'Department is required for this role'
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
      role
    };

    // Add department for non-central-admin roles
    if (role !== 'central_admin' && department) {
      userData.department = department;
    }

    // Create user
    const user = await User.create(userData);

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Public register error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `A user with this ${field} already exists`
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Error creating user'
    });
  }
};
