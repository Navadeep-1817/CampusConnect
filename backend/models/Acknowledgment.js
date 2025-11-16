const mongoose = require('mongoose');

const acknowledgmentSchema = new mongoose.Schema({
  notice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notice',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  viewedAt: {
    type: Date,
    default: Date.now
  },
  acknowledgedAt: {
    type: Date
  },
  isAcknowledged: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index to ensure one acknowledgment per user per notice
acknowledgmentSchema.index({ notice: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Acknowledgment', acknowledgmentSchema);
