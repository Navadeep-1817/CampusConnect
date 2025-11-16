const Acknowledgment = require('../models/Acknowledgment');
const Notice = require('../models/Notice');

// @desc    Acknowledge notice
// @route   POST /api/acknowledgments/:noticeId
// @access  Private (Student, Faculty)
exports.acknowledgeNotice = async (req, res) => {
  try {
    const { noticeId } = req.params;

    const notice = await Notice.findById(noticeId);
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    // Find or create acknowledgment
    let acknowledgment = await Acknowledgment.findOne({
      notice: noticeId,
      user: req.user._id
    });

    if (acknowledgment) {
      acknowledgment.isAcknowledged = true;
      acknowledgment.acknowledgedAt = Date.now();
      await acknowledgment.save();
    } else {
      acknowledgment = await Acknowledgment.create({
        notice: noticeId,
        user: req.user._id,
        isAcknowledged: true,
        acknowledgedAt: Date.now()
      });
    }

    // Update notice acknowledgment count
    const ackCount = await Acknowledgment.countDocuments({
      notice: noticeId,
      isAcknowledged: true
    });
    notice.acknowledgmentCount = ackCount;
    await notice.save();

    res.status(200).json({
      success: true,
      message: 'Notice acknowledged successfully',
      data: acknowledgment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error acknowledging notice'
    });
  }
};

// @desc    Get acknowledgments for a notice
// @route   GET /api/acknowledgments/notice/:noticeId
// @access  Private (Admin, Faculty)
exports.getNoticeAcknowledgments = async (req, res) => {
  try {
    const { noticeId } = req.params;
    const { acknowledged } = req.query;

    const query = { notice: noticeId };
    
    if (acknowledged !== undefined) {
      query.isAcknowledged = acknowledged === 'true';
    }

    const acknowledgments = await Acknowledgment.find(query)
      .populate('user', 'name email rollNumber year batch')
      .sort({ acknowledgedAt: -1 });

    res.status(200).json({
      success: true,
      count: acknowledgments.length,
      data: acknowledgments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching acknowledgments'
    });
  }
};

// @desc    Get user's acknowledgments
// @route   GET /api/acknowledgments/user
// @access  Private
exports.getUserAcknowledgments = async (req, res) => {
  try {
    const acknowledgments = await Acknowledgment.find({ user: req.user._id })
      .populate('notice', 'title category priority createdAt')
      .sort({ viewedAt: -1 });

    res.status(200).json({
      success: true,
      count: acknowledgments.length,
      data: acknowledgments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching acknowledgments'
    });
  }
};

// @desc    Get acknowledgment statistics for a notice
// @route   GET /api/acknowledgments/notice/:noticeId/stats
// @access  Private (Admin, Faculty, Creator)
exports.getNoticeAckStats = async (req, res) => {
  try {
    const { noticeId } = req.params;

    const notice = await Notice.findById(noticeId);
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    const totalAcknowledgments = await Acknowledgment.countDocuments({
      notice: noticeId
    });

    const acknowledged = await Acknowledgment.countDocuments({
      notice: noticeId,
      isAcknowledged: true
    });

    const viewed = await Acknowledgment.countDocuments({
      notice: noticeId,
      viewedAt: { $exists: true }
    });

    res.status(200).json({
      success: true,
      data: {
        totalViews: notice.viewCount,
        totalAcknowledgments: acknowledged,
        totalUsers: totalAcknowledgments,
        viewedOnly: viewed - acknowledged,
        acknowledgmentRate: totalAcknowledgments > 0 
          ? ((acknowledged / totalAcknowledgments) * 100).toFixed(2) 
          : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    });
  }
};

// @desc    Get department acknowledgment statistics
// @route   GET /api/acknowledgments/department/:departmentId/stats
// @access  Private (Admin)
exports.getDepartmentAckStats = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Get all notices for the department
    const notices = await Notice.find({
      department: departmentId,
      ...dateFilter
    });

    const noticeIds = notices.map(n => n._id);

    const stats = await Acknowledgment.aggregate([
      {
        $match: {
          notice: { $in: noticeIds }
        }
      },
      {
        $group: {
          _id: '$isAcknowledged',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalNotices = notices.length;
    const acknowledged = stats.find(s => s._id === true)?.count || 0;
    const viewed = stats.reduce((sum, s) => sum + s.count, 0);

    res.status(200).json({
      success: true,
      data: {
        totalNotices,
        totalAcknowledgments: acknowledged,
        totalViews: viewed,
        averageAckPerNotice: totalNotices > 0 ? (acknowledged / totalNotices).toFixed(2) : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching department statistics'
    });
  }
};
