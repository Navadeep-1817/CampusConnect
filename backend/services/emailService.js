const nodemailer = require('nodemailer');

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Verify connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email server connection failed:', error.message);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (optional)
 */
const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME || 'Campus Connect'} <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || '',
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send bulk emails (with delay to prevent rate limiting)
 * @param {Array} recipients - Array of email addresses
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 */
const sendBulkEmails = async (recipients, subject, html) => {
  const results = {
    success: [],
    failed: [],
  };

  for (const email of recipients) {
    const result = await sendEmail({ to: email, subject, html });
    
    if (result.success) {
      results.success.push(email);
    } else {
      results.failed.push({ email, error: result.error });
    }

    // Add delay to prevent rate limiting (adjust as needed)
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
};

module.exports = {
  sendEmail,
  sendBulkEmails,
};
