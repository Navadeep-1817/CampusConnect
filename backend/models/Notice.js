const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Content is required']
  },
  category: {
    type: String,
    enum: ['Academic', 'Events', 'Exams', 'Circulars', 'Others'],
    required: [true, 'Category is required']
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  visibility: {
    type: String,
    enum: [
      'global',              // All users
      'department',          // All users in a department
      'batch',              // Students in a year/batch
      'class',              // Students in specific class
      'faculty_global',     // All faculty
      'faculty_department', // Faculty in specific department
      'admin_global',       // All admins (central + local)
      'admin_department'    // Admins in specific department
    ],
    required: [true, 'Visibility is required']
  },
  // Target audience fields
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null,
    required: function() {
      const requiresDept = ['department', 'batch', 'class', 'faculty_department', 'admin_department'];
      return requiresDept.includes(this.visibility);
    },
    validate: {
      validator: function(v) {
        const requiresDept = ['department', 'batch', 'class', 'faculty_department', 'admin_department'];
        // Allow null/undefined for global visibility types
        if (!requiresDept.includes(this.visibility)) return true;
        // Require valid ObjectId for department-specific visibilities
        return v != null && v !== '';
      },
      message: 'Department is required for department-specific visibility'
    }
  },
  
  // Target role for role-specific notices
  targetRole: {
    type: String,
    enum: ['student', 'faculty', 'local_admin', 'central_admin', null],
    default: null
  },
  targetYear: {
    type: Number,
    min: 1,
    max: 4,
    default: null,
    required: function() {
      return this.visibility === 'batch' || this.visibility === 'class';
    }
  },
  targetBatch: {
    type: String,
    default: null,
    required: function() {
      return this.visibility === 'class';
    }
  },
  // Attachments
  attachments: [{
    fileName: {
      type: String,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // External links
  externalLinks: {
    type: [{
      title: { type: String, default: '' },
      url: { type: String, default: '' }
    }],
    default: []
  },
  // Author information
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Metadata
  expiryDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  allowComments: {
    type: Boolean,
    default: true
  },
  // Comments
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true
    },
    replies: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      text: {
        type: String,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Statistics
  viewCount: {
    type: Number,
    default: 0
  },
  acknowledgmentCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Middleware to auto-set targetRole based on visibility
noticeSchema.pre('save', function(next) {
  if (this.visibility && this.visibility.startsWith('faculty_')) {
    this.targetRole = 'faculty';
  } else if (this.visibility && this.visibility.startsWith('admin_')) {
    this.targetRole = this.visibility === 'admin_global' ? null : 'local_admin';
  } else if (['batch', 'class'].includes(this.visibility)) {
    this.targetRole = 'student';
  }
  next();
});

// Index for faster queries
noticeSchema.index({ department: 1, createdAt: -1 });
noticeSchema.index({ category: 1, createdAt: -1 });
noticeSchema.index({ visibility: 1, isActive: 1 });
noticeSchema.index({ targetRole: 1, department: 1 });
noticeSchema.index({ visibility: 1, targetRole: 1, isActive: 1 });

module.exports = mongoose.model('Notice', noticeSchema);
