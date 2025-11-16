/**
 * Email Templates for Campus Connect
 */

// Base template wrapper
const baseTemplate = (content, footer = true) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Campus Connect</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .email-container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      padding: 30px;
    }
    .notice-card {
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .notice-title {
      font-size: 20px;
      font-weight: 600;
      color: #2d3748;
      margin: 0 0 10px 0;
    }
    .notice-meta {
      display: flex;
      gap: 15px;
      margin: 10px 0;
      font-size: 14px;
      color: #718096;
    }
    .notice-content {
      color: #4a5568;
      line-height: 1.8;
      margin: 15px 0;
    }
    .btn {
      display: inline-block;
      padding: 12px 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .btn:hover {
      opacity: 0.9;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      color: #718096;
      font-size: 14px;
      border-top: 1px solid #e2e8f0;
    }
    .priority-high {
      color: #e53e3e;
      font-weight: 600;
    }
    .priority-urgent {
      color: #c53030;
      font-weight: 700;
      text-transform: uppercase;
    }
    .stats-row {
      display: flex;
      justify-content: space-around;
      margin: 20px 0;
    }
    .stat-item {
      text-align: center;
    }
    .stat-number {
      font-size: 24px;
      font-weight: 700;
      color: #667eea;
    }
    .stat-label {
      font-size: 12px;
      color: #718096;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>🎓 Campus Connect</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    ${footer ? `
    <div class="footer">
      <p>© ${new Date().getFullYear()} Campus Connect. All rights reserved.</p>
      <p>Smart College Notice Board & Communication Portal</p>
      <p style="font-size: 12px; margin-top: 10px;">
        You are receiving this email because you are registered on Campus Connect platform.
      </p>
    </div>
    ` : ''}
  </div>
</body>
</html>
`;

/**
 * New Notice Email Template
 */
const noticeEmailTemplate = (notice, recipientName) => {
  const priorityClass = notice.priority === 'urgent' ? 'priority-urgent' : 
                       notice.priority === 'high' ? 'priority-high' : '';
  
  const content = `
    <h2>Hello ${recipientName},</h2>
    <p>A new notice has been posted that requires your attention:</p>
    
    <div class="notice-card">
      <h3 class="notice-title">${notice.title}</h3>
      <div class="notice-meta">
        <span><strong>Category:</strong> ${notice.category}</span>
        <span class="${priorityClass}"><strong>Priority:</strong> ${notice.priority}</span>
      </div>
      <div class="notice-content">
        ${notice.content.substring(0, 300)}${notice.content.length > 300 ? '...' : ''}
      </div>
      ${notice.attachments && notice.attachments.length > 0 ? `
        <p><strong>📎 Attachments:</strong> ${notice.attachments.length} file(s) attached</p>
      ` : ''}
      ${notice.expiryDate ? `
        <p><strong>⏰ Valid Until:</strong> ${new Date(notice.expiryDate).toLocaleDateString()}</p>
      ` : ''}
    </div>
    
    <center>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/notices/${notice._id}" class="btn">
        View Full Notice
      </a>
    </center>
    
    <p style="color: #718096; font-size: 14px; margin-top: 20px;">
      Please acknowledge this notice after reading to confirm receipt.
    </p>
  `;
  
  return baseTemplate(content);
};

/**
 * Acknowledgment Reminder Email Template
 */
const acknowledgmentReminderTemplate = (notice, recipientName) => {
  const content = `
    <h2>Hello ${recipientName},</h2>
    <p style="color: #e53e3e; font-weight: 600;">⚠️ Acknowledgment Required</p>
    <p>You have not yet acknowledged the following important notice:</p>
    
    <div class="notice-card">
      <h3 class="notice-title">${notice.title}</h3>
      <div class="notice-meta">
        <span><strong>Posted:</strong> ${new Date(notice.createdAt).toLocaleDateString()}</span>
        <span><strong>Priority:</strong> ${notice.priority}</span>
      </div>
    </div>
    
    <center>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/notices/${notice._id}" class="btn">
        Acknowledge Now
      </a>
    </center>
    
    <p style="color: #718096; font-size: 14px; margin-top: 20px;">
      Please acknowledge this notice as soon as possible to confirm you have read and understood it.
    </p>
  `;
  
  return baseTemplate(content);
};

/**
 * Daily Digest Email Template
 */
const dailyDigestTemplate = (notices, stats, recipientName) => {
  const noticesList = notices.map(notice => `
    <div class="notice-card" style="margin: 15px 0;">
      <h4 style="margin: 0 0 8px 0; color: #2d3748;">${notice.title}</h4>
      <p style="margin: 5px 0; font-size: 14px; color: #718096;">
        ${notice.category} • ${notice.priority} • ${new Date(notice.createdAt).toLocaleDateString()}
      </p>
      <p style="margin: 10px 0; color: #4a5568;">
        ${notice.content.substring(0, 150)}${notice.content.length > 150 ? '...' : ''}
      </p>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/notices/${notice._id}" 
         style="color: #667eea; text-decoration: none; font-weight: 600; font-size: 14px;">
        Read More →
      </a>
    </div>
  `).join('');

  const content = `
    <h2>Hello ${recipientName},</h2>
    <p>Here's your daily summary of campus activities:</p>
    
    <div class="stats-row">
      <div class="stat-item">
        <div class="stat-number">${stats.newNotices || 0}</div>
        <div class="stat-label">New Notices</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">${stats.unacknowledged || 0}</div>
        <div class="stat-label">Pending Acks</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">${stats.expiringNotices || 0}</div>
        <div class="stat-label">Expiring Soon</div>
      </div>
    </div>
    
    ${notices.length > 0 ? `
      <h3 style="color: #2d3748; margin-top: 30px;">Recent Notices</h3>
      ${noticesList}
    ` : `
      <p style="color: #718096; text-align: center; padding: 30px 0;">
        No new notices today. Check back later!
      </p>
    `}
    
    <center style="margin-top: 30px;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/notices" class="btn">
        View All Notices
      </a>
    </center>
  `;
  
  return baseTemplate(content);
};

/**
 * Weekly Digest Email Template
 */
const weeklyDigestTemplate = (summary, recipientName) => {
  const content = `
    <h2>Hello ${recipientName},</h2>
    <p>Your weekly Campus Connect summary:</p>
    
    <div class="stats-row">
      <div class="stat-item">
        <div class="stat-number">${summary.totalNotices || 0}</div>
        <div class="stat-label">Total Notices</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">${summary.acknowledged || 0}</div>
        <div class="stat-label">Acknowledged</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">${summary.pending || 0}</div>
        <div class="stat-label">Still Pending</div>
      </div>
    </div>
    
    ${summary.urgentNotices && summary.urgentNotices.length > 0 ? `
      <div style="background-color: #fff5f5; border-left: 4px solid #e53e3e; padding: 20px; margin: 20px 0; border-radius: 4px;">
        <h3 style="color: #c53030; margin-top: 0;">⚠️ Urgent Items Requiring Attention</h3>
        <ul style="margin: 10px 0; padding-left: 20px;">
          ${summary.urgentNotices.map(notice => `
            <li style="margin: 8px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/notices/${notice._id}" 
                 style="color: #2d3748; text-decoration: none; font-weight: 600;">
                ${notice.title}
              </a>
            </li>
          `).join('')}
        </ul>
      </div>
    ` : ''}
    
    <center style="margin-top: 30px;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" class="btn">
        Go to Dashboard
      </a>
    </center>
  `;
  
  return baseTemplate(content);
};

/**
 * Welcome Email Template
 */
const welcomeEmailTemplate = (userName, userRole) => {
  const content = `
    <h2>Welcome to Campus Connect! 🎉</h2>
    <p>Hello ${userName},</p>
    <p>Your account has been successfully created. You can now access all features available for ${userRole}s.</p>
    
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #2d3748;">Getting Started</h3>
      <ul style="color: #4a5568; line-height: 1.8;">
        <li>Complete your profile information</li>
        <li>Check out the latest notices on your dashboard</li>
        <li>Enable notification preferences</li>
        <li>Connect with your department members</li>
      </ul>
    </div>
    
    <center>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="btn">
        Login to Campus Connect
      </a>
    </center>
    
    <p style="color: #718096; font-size: 14px; margin-top: 30px;">
      If you have any questions, feel free to reach out to your administrator.
    </p>
  `;
  
  return baseTemplate(content);
};

module.exports = {
  noticeEmailTemplate,
  acknowledgmentReminderTemplate,
  dailyDigestTemplate,
  weeklyDigestTemplate,
  welcomeEmailTemplate,
};
