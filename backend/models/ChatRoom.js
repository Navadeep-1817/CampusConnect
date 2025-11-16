const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Chat room name is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['department', 'class', 'private', 'global', 'private-group'],
    required: [true, 'Chat room type is required']
  },
  // Target audience for department rooms
  targetAudience: {
    type: String,
    enum: ['all', 'students', 'faculty', 'deo', 'faculty-deo', 'custom'],
    default: 'all'
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: function() {
      return this.type === 'department' || this.type === 'class';
    }
  },
  // For private-group rooms (cross-department)
  departments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],
  // For class-specific chats
  year: {
    type: Number,
    min: 1,
    max: 4,
    required: function() {
      return this.type === 'class';
    }
  },
  batch: {
    type: String,
    required: function() {
      return this.type === 'class';
    }
  },
  // For private chats
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Moderators (can delete messages)
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage'
  },
  lastMessageAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for faster queries
chatRoomSchema.index({ type: 1, department: 1 });
chatRoomSchema.index({ type: 1, targetAudience: 1, department: 1 });
chatRoomSchema.index({ participants: 1 });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
