const Notice = require('../models/Notice');
const Acknowledgment = require('../models/Acknowledgment');
const User = require('../models/User');
const mongoose = require('mongoose');

// @desc    Create notice
// @route   POST /api/notices
// @access  Private (Admin, Faculty)
exports.createNotice = async (req, res) => {
  try {
    console.log('📝 Create Notice Request:', {
      body: req.body,
      files: req.files,
      user: { id: req.user._id, role: req.user.role, department: req.user.department }
    });

    let {
      title,
      content,
      category,
      priority,
      visibility,
      department,
      targetYear,
      targetBatch,
      externalLinks,
      expiryDate,
      allowComments,
      isPinned
    } = req.body;

    // Parse externalLinks if it's a JSON string (from FormData)
    if (typeof externalLinks === 'string') {
      try {
        externalLinks = JSON.parse(externalLinks);
      } catch (e) {
        externalLinks = [];
      }
    }
    
    // Ensure externalLinks is always an array
    if (!Array.isArray(externalLinks)) {
      externalLinks = [];
    }

    // Validation
    if (!title || !content || !category || !visibility) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, content, category, or visibility'
      });
    }

    // Authorization checks
    if (req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        message: 'Students cannot create notices'
      });
    }

    if (req.user.role === 'faculty' && visibility === 'global') {
      return res.status(403).json({
        success: false,
        message: 'Faculty cannot create global notices'
      });
    }

    if (req.user.role === 'local_admin' && visibility === 'global') {
      return res.status(403).json({
        success: false,
        message: 'Local admin cannot create global notices'
      });
    }

    // Set department based on user role
    let noticeDepartment = department;
    if (req.user.role !== 'central_admin' && visibility !== 'global') {
      noticeDepartment = req.user.department;
    }

    const noticeData = {
      title,
      content,
      category,
      priority: priority || 'medium',
      visibility,
      externalLinks: externalLinks || [],
      allowComments: allowComments !== false,
      isPinned: isPinned || false,
      postedBy: req.user._id,
      createdBy: req.user._id
    };

    // Only add department if not global visibility
    if (noticeDepartment) {
      noticeData.department = noticeDepartment;
    }

    // Only add targetYear if provided
    if (targetYear) {
      noticeData.targetYear = parseInt(targetYear);
    }

    // Only add targetBatch if provided
    if (targetBatch) {
      noticeData.targetBatch = targetBatch;
    }

    // Only add expiryDate if provided
    if (expiryDate) {
      noticeData.expiryDate = expiryDate;
    }

    // Handle file attachments from multer
    if (req.files && req.files.length > 0) {
      noticeData.attachments = req.files.map(file => ({
        fileName: file.originalname,
        fileUrl: `/uploads/${file.filename}`,
        fileType: file.mimetype,
        fileSize: file.size
      }));
    }

    console.log('📦 Notice Data to Create:', noticeData);

    const notice = await Notice.create(noticeData);
    
    console.log('✅ Notice created with ID:', notice._id);

    await notice.populate('postedBy', 'name role email');
    await notice.populate('createdBy', 'name role email');
    if (notice.department) {
      await notice.populate('department', 'name code');
    }

    console.log('✅ Notice fully populated:', notice);

    res.status(201).json({
      success: true,
      message: 'Notice created successfully',
      data: notice
    });
  } catch (error) {
    console.error('❌ Create notice error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      errors: error.errors
    });
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    // Handle Cast errors (invalid ObjectId)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: `Invalid ${error.path}: ${error.value}`
      });
    }
    
    // Return detailed error for debugging
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating notice',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Get all notices (with filtering)
// @route   GET /api/notices
// @access  Private
exports.getNotices = async (req, res) => {
  try {
    const {
      category,
      visibility,
      department,
      year,
      batch,
      search,
      priority,
      isActive,
      page = 1,
      limit = 20
    } = req.query;

    let query = { isActive: isActive !== 'false' };

    // Role-based filtering with new visibility options
    if (req.user.role === 'student') {
      query.$or = [
        { visibility: 'global' },
        {
          visibility: 'department',
          department: req.user.department
        },
        {
          visibility: 'batch',
          department: req.user.department,
          targetYear: req.user.year
        },
        {
          visibility: 'class',
          department: req.user.department,
          targetYear: req.user.year,
          targetBatch: req.user.batch
        }
      ];
    } else if (req.user.role === 'faculty') {
      query.$or = [
        { visibility: 'global' },
        { visibility: 'faculty_global' },
        {
          visibility: 'faculty_department',
          department: req.user.department
        },
        {
          visibility: 'department',
          department: req.user.department
        },
        { postedBy: req.user._id },
        { createdBy: req.user._id }
      ];
    } else if (req.user.role === 'local_admin') {
      query.$or = [
        { visibility: 'global' },
        { visibility: 'admin_global' },
        {
          visibility: 'admin_department',
          department: req.user.department
        },
        {
          visibility: 'department',
          department: req.user.department
        }
      ];
    } else if (req.user.role === 'central_admin') {
      // Central admin sees all notices
      query.$or = [
        { visibility: 'global' },
        { visibility: 'admin_global' },
        { visibility: { $regex: '^admin_' } },
        { postedBy: req.user._id },
        { createdBy: req.user._id }
      ];
    }

    // Additional filters
    if (category) query.category = category;
    if (visibility) query.visibility = visibility;
    if (department) query.department = department;
    if (year) query.targetYear = year;
    if (batch) query.targetBatch = batch;
    if (priority) query.priority = priority;

    // Search by title or content
    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } }
        ]
      });
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notices = await Notice.find(query)
      .populate('postedBy', 'name role email')
      .populate('createdBy', 'name role email')
      .populate('department', 'name code')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notice.countDocuments(query);

    res.status(200).json({
      success: true,
      count: notices.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: notices
    });
  } catch (error) {
    console.error('Get notices error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notices'
    });
  }
};

// @desc    Get single notice
// @route   GET /api/notices/:id
// @access  Private
exports.getNotice = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id)
      .populate('postedBy', 'name role email phone')
      .populate('createdBy', 'name role email phone')
      .populate('department', 'name code')
      .populate('comments.user', 'name role')
      .populate('comments.replies.user', 'name role');

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    // Increment view count
    notice.viewCount += 1;
    await notice.save();

    // Create/update acknowledgment record for view
    if (req.user.role === 'student') {
      await Acknowledgment.findOneAndUpdate(
        { notice: notice._id, user: req.user._id },
        { 
          notice: notice._id,
          user: req.user._id,
          viewedAt: Date.now()
        },
        { upsert: true, new: true }
      );
    }

    res.status(200).json({
      success: true,
      data: notice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching notice'
    });
  }
};

// @desc    Update notice
// @route   PUT /api/notices/:id
// @access  Private (Creator or Admin)
exports.updateNotice = async (req, res) => {
  try {
    let notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    // Authorization check
    const noticeCreator = notice.postedBy || notice.createdBy;
    if (req.user.role === 'faculty' && 
        noticeCreator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this notice'
      });
    }

    if (req.user.role === 'local_admin' &&
        notice.department.toString() !== req.user.department.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this notice'
      });
    }

    // Handle new file attachments
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        fileName: file.originalname,
        fileUrl: `/uploads/${file.filename}`,
        fileType: file.mimetype,
        fileSize: file.size
      }));
      req.body.attachments = [...(notice.attachments || []), ...newAttachments];
    }

    notice = await Notice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('postedBy', 'name role email')
     .populate('createdBy', 'name role email')
     .populate('department', 'name code');

    res.status(200).json({
      success: true,
      message: 'Notice updated successfully',
      data: notice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating notice'
    });
  }
};

// @desc    Delete notice
// @route   DELETE /api/notices/:id
// @access  Private (Creator or Admin)
exports.deleteNotice = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    // Authorization check
    const noticeCreator = notice.postedBy || notice.createdBy;
    if (req.user.role === 'faculty' && 
        noticeCreator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notice'
      });
    }

    // Soft delete
    notice.isActive = false;
    await notice.save();

    res.status(200).json({
      success: true,
      message: 'Notice deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting notice'
    });
  }
};

// @desc    Add comment to notice
// @route   POST /api/notices/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    if (!notice.allowComments) {
      return res.status(403).json({
        success: false,
        message: 'Comments are not allowed on this notice'
      });
    }

    notice.comments.push({
      user: req.user._id,
      text
    });

    await notice.save();
    await notice.populate('comments.user', 'name role');

    res.status(200).json({
      success: true,
      message: 'Comment added successfully',
      data: notice.comments[notice.comments.length - 1]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding comment'
    });
  }
};

// @desc    Reply to comment
// @route   POST /api/notices/:id/comments/:commentId/reply
// @access  Private
exports.replyToComment = async (req, res) => {
  try {
    const { text } = req.body;
    const notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    const comment = notice.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    comment.replies.push({
      user: req.user._id,
      text
    });

    await notice.save();
    await notice.populate('comments.replies.user', 'name role');

    res.status(200).json({
      success: true,
      message: 'Reply added successfully',
      data: comment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding reply'
    });
  }
};
