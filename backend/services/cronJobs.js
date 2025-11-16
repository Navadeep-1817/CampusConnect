const cron = require('node-cron');
const Notice = require('../models/Notice');
const User = require('../models/User');
const Acknowledgment = require('../models/Acknowledgment');
const { sendEmail } = require('./emailService');
const { dailyDigestTemplate, weeklyDigestTemplate, acknowledgmentReminderTemplate } = require('../templates/emailTemplates');

/**
 * Send daily digest emails to all users
 * Runs every day at 8:00 AM
 */
const sendDailyDigest = cron.schedule('0 8 * * *', async () => {
  console.log('📧 Running daily digest job...');
  
  try {
    const users = await User.find({ 
      isActive: true,
      emailNotifications: true // Only send to users who opted in
    }).select('email name role department');

    for (const user of users) {
      try {
        // Get notices from last 24 hours relevant to user
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        let noticeQuery = {
          createdAt: { $gte: yesterday },
          status: 'published'
        };

        // Filter by department for non-admin users
        if (user.role !== 'central_admin' && user.department) {
          noticeQuery.department = user.department;
        }

        const newNotices = await Notice.find(noticeQuery)
          .sort({ createdAt: -1 })
          .limit(10)
          .populate('postedBy', 'name')
          .populate('department', 'name');

        // Get unacknowledged notices for this user
        const allUserNotices = await Notice.find({
          ...noticeQuery,
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        }).select('_id');

        const acknowledgedNoticeIds = await Acknowledgment.find({
          user: user._id,
          notice: { $in: allUserNotices.map(n => n._id) },
          isAcknowledged: true
        }).distinct('notice');

        const unacknowledgedCount = allUserNotices.length - acknowledgedNoticeIds.length;

        // Get expiring notices
        const expiringNotices = await Notice.find({
          expiryDate: {
            $gte: new Date(),
            $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // Next 3 days
          },
          status: 'published'
        }).count();

        const stats = {
          newNotices: newNotices.length,
          unacknowledged: unacknowledgedCount,
          expiringNotices
        };

        // Only send if there's something to report
        if (newNotices.length > 0 || unacknowledgedCount > 0 || expiringNotices > 0) {
          const html = dailyDigestTemplate(newNotices, stats, user.name);
          
          await sendEmail({
            to: user.email,
            subject: `📬 Daily Digest - ${newNotices.length} New Notice${newNotices.length !== 1 ? 's' : ''}`,
            html
          });
        }
      } catch (error) {
        console.error(`Failed to send digest to ${user.email}:`, error.message);
      }

      // Small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('✅ Daily digest job completed');
  } catch (error) {
    console.error('❌ Daily digest job failed:', error);
  }
}, {
  scheduled: false // Start manually
});

/**
 * Send weekly digest emails
 * Runs every Monday at 9:00 AM
 */
const sendWeeklyDigest = cron.schedule('0 9 * * 1', async () => {
  console.log('📧 Running weekly digest job...');
  
  try {
    const users = await User.find({ 
      isActive: true,
      emailNotifications: true
    }).select('email name role department');

    for (const user of users) {
      try {
        const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        let noticeQuery = {
          createdAt: { $gte: lastWeek },
          status: 'published'
        };

        if (user.role !== 'central_admin' && user.department) {
          noticeQuery.department = user.department;
        }

        const weekNotices = await Notice.find(noticeQuery);
        const noticeIds = weekNotices.map(n => n._id);

        const acknowledgedCount = await Acknowledgment.countDocuments({
          user: user._id,
          notice: { $in: noticeIds },
          isAcknowledged: true
        });

        const urgentNotices = await Notice.find({
          ...noticeQuery,
          priority: 'urgent'
        }).select('title _id');

        const summary = {
          totalNotices: weekNotices.length,
          acknowledged: acknowledgedCount,
          pending: weekNotices.length - acknowledgedCount,
          urgentNotices
        };

        if (weekNotices.length > 0) {
          const html = weeklyDigestTemplate(summary, user.name);
          
          await sendEmail({
            to: user.email,
            subject: `📊 Weekly Summary - ${weekNotices.length} Notice${weekNotices.length !== 1 ? 's' : ''} This Week`,
            html
          });
        }
      } catch (error) {
        console.error(`Failed to send weekly digest to ${user.email}:`, error.message);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('✅ Weekly digest job completed');
  } catch (error) {
    console.error('❌ Weekly digest job failed:', error);
  }
}, {
  scheduled: false
});

/**
 * Send acknowledgment reminders
 * Runs every day at 5:00 PM
 */
const sendAcknowledgmentReminders = cron.schedule('0 17 * * *', async () => {
  console.log('📧 Running acknowledgment reminder job...');
  
  try {
    // Get notices that need acknowledgment (posted in last 7 days, priority high/urgent)
    const notices = await Notice.find({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      priority: { $in: ['high', 'urgent'] },
      status: 'published'
    }).populate('postedBy', 'name');

    for (const notice of notices) {
      try {
        // Find users who should acknowledge but haven't
        let userQuery = { isActive: true };
        if (notice.department) {
          userQuery.department = notice.department;
        }
        if (notice.targetAudience?.year) {
          userQuery.year = notice.targetAudience.year;
        }

        const targetUsers = await User.find(userQuery).select('email name');
        
        // Get users who already acknowledged
        const acknowledgedUserIds = await Acknowledgment.find({
          notice: notice._id,
          isAcknowledged: true
        }).distinct('user');

        // Send reminder to users who haven't acknowledged
        const usersNeedingReminder = targetUsers.filter(
          user => !acknowledgedUserIds.some(id => id.toString() === user._id.toString())
        );

        for (const user of usersNeedingReminder) {
          const html = acknowledgmentReminderTemplate(notice, user.name);
          
          await sendEmail({
            to: user.email,
            subject: `⚠️ Acknowledgment Required: ${notice.title}`,
            html
          });

          await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`Sent ${usersNeedingReminder.length} reminder(s) for notice: ${notice.title}`);
      } catch (error) {
        console.error(`Failed to send reminders for notice ${notice._id}:`, error.message);
      }
    }

    console.log('✅ Acknowledgment reminder job completed');
  } catch (error) {
    console.error('❌ Acknowledgment reminder job failed:', error);
  }
}, {
  scheduled: false
});

/**
 * Auto-publish scheduled notices
 * Runs every hour
 */
const autoPublishNotices = cron.schedule('0 * * * *', async () => {
  console.log('🔄 Running auto-publish job...');
  
  try {
    const now = new Date();
    
    // Find notices scheduled to be published
    const noticesToPublish = await Notice.find({
      status: 'scheduled',
      publishDate: { $lte: now }
    });

    for (const notice of noticesToPublish) {
      notice.status = 'published';
      await notice.save();
      console.log(`✅ Auto-published notice: ${notice.title}`);
    }

    console.log(`✅ Auto-publish job completed. Published ${noticesToPublish.length} notice(s)`);
  } catch (error) {
    console.error('❌ Auto-publish job failed:', error);
  }
}, {
  scheduled: false
});

/**
 * Start all cron jobs
 */
const startCronJobs = () => {
  console.log('🚀 Starting cron jobs...');
  
  if (process.env.ENABLE_DAILY_DIGEST === 'true') {
    sendDailyDigest.start();
    console.log('✅ Daily digest job started (8:00 AM daily)');
  }
  
  if (process.env.ENABLE_WEEKLY_DIGEST === 'true') {
    sendWeeklyDigest.start();
    console.log('✅ Weekly digest job started (9:00 AM Mondays)');
  }
  
  if (process.env.ENABLE_ACK_REMINDERS === 'true') {
    sendAcknowledgmentReminders.start();
    console.log('✅ Acknowledgment reminder job started (5:00 PM daily)');
  }
  
  // Always enable auto-publish
  autoPublishNotices.start();
  console.log('✅ Auto-publish job started (every hour)');
};

/**
 * Stop all cron jobs
 */
const stopCronJobs = () => {
  sendDailyDigest.stop();
  sendWeeklyDigest.stop();
  sendAcknowledgmentReminders.stop();
  autoPublishNotices.stop();
  console.log('🛑 All cron jobs stopped');
};

module.exports = {
  startCronJobs,
  stopCronJobs,
  sendDailyDigest,
  sendWeeklyDigest,
  sendAcknowledgmentReminders,
  autoPublishNotices
};
