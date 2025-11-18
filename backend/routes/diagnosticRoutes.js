const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Check if S3 is configured
const isS3Configured = () => !!(
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_BUCKET_NAME
);

/**
 * Email diagnostics
 * Tests email server connection and configuration
 */
router.get('/email-status', async (req, res) => {
  try {
    const nodemailer = require('nodemailer');
    
    const status = {
      timestamp: new Date().toISOString(),
      configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD),
      host: process.env.EMAIL_HOST || 'Not set',
      port: process.env.EMAIL_PORT || 'Not set',
      user: process.env.EMAIL_USER ? '***' + process.env.EMAIL_USER.slice(-15) : 'Not set',
      fromName: process.env.EMAIL_FROM_NAME || 'Not set',
      frontendUrl: process.env.FRONTEND_URL || 'Not set (will use localhost fallback)',
      clientUrl: process.env.CLIENT_URL || 'Not set',
      notificationsEnabled: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
      cronJobsEnabled: process.env.ENABLE_CRON_JOBS === 'true'
    };
    
    // Test SMTP connection
    if (status.configured) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: parseInt(process.env.EMAIL_PORT),
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
          }
        });
        
        await transporter.verify();
        status.connectionTest = '✅ SUCCESS - SMTP server is reachable';
        status.canSendEmails = true;
      } catch (error) {
        status.connectionTest = '❌ FAILED - Cannot connect to SMTP server';
        status.canSendEmails = false;
        status.error = error.message;
        status.errorCode = error.code;
        
        // Provide helpful error messages
        if (error.message.includes('Invalid login')) {
          status.hint = 'Check EMAIL_USER and EMAIL_PASSWORD. For Gmail, use App Password (not regular password).';
        } else if (error.message.includes('ECONNREFUSED')) {
          status.hint = 'SMTP server is not reachable. Check EMAIL_HOST and EMAIL_PORT.';
        } else if (error.message.includes('ETIMEDOUT')) {
          status.hint = 'Connection timed out. Check firewall settings or network connectivity.';
        }
      }
    } else {
      status.connectionTest = '⚠️ SKIPPED - Email credentials not configured';
      status.canSendEmails = false;
      status.hint = 'Set EMAIL_USER and EMAIL_PASSWORD environment variables on Render.';
    }
    
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking email status',
      error: error.message
    });
  }
});

/**
 * Storage diagnostics
 * Checks file storage configuration and status
 */
router.get('/storage-status', async (req, res) => {
  try {
    const { getStorageType, isGoogleDriveConfigured } = require('../services/fileStorage');
    const googleDriveService = require('../services/googleDriveService');
    
    const uploadDir = path.join(__dirname, '../uploads');
    const dirExists = fs.existsSync(uploadDir);
    
    let files = [];
    let totalSize = 0;
    
    if (dirExists) {
      files = fs.readdirSync(uploadDir);
      
      // Calculate total size
      files.forEach(file => {
        const filePath = path.join(uploadDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      });
    }
    
    const s3Configured = isS3Configured();
    const driveConfigured = isGoogleDriveConfigured();
    const storageType = getStorageType();
    
    let storageTypeDisplay;
    let recommendation;
    
    if (storageType === 'google-drive') {
      storageTypeDisplay = 'Google Drive (Cloud Storage)';
      recommendation = '✅ Using Google Drive - files persist across restarts (15GB free)';
    } else if (storageType === 's3') {
      storageTypeDisplay = 'AWS S3 (Cloud Storage)';
      recommendation = '✅ Using AWS S3 - files persist across restarts';
    } else {
      storageTypeDisplay = 'Local Disk (Ephemeral)';
      recommendation = '⚠️ WARNING: Using local storage - files WILL BE DELETED on server restart/redeploy!';
    }
    
    const responseData = {
      success: true,
      timestamp: new Date().toISOString(),
      storageType: storageTypeDisplay,
      recommendation,
      googleDrive: {
        configured: driveConfigured,
        serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'Not set',
        folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || 'Not set',
        privateKeyConfigured: !!process.env.GOOGLE_PRIVATE_KEY
      },
      s3: {
        configured: s3Configured,
        bucket: process.env.AWS_BUCKET_NAME || 'Not set',
        region: process.env.AWS_REGION || 'Not set',
        accessKeyConfigured: !!process.env.AWS_ACCESS_KEY_ID
      },
      local: {
        directory: uploadDir,
        directoryExists: dirExists,
        filesCount: files.length,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        recentFiles: files.slice(-10).map(f => ({
          name: f,
          sizeMB: (fs.statSync(path.join(uploadDir, f)).size / (1024 * 1024)).toFixed(2)
        }))
      },
      routes: {
        staticUpload: '/uploads/:filename',
        apiUpload: '/api/uploads/:filename',
        apiDownload: '/api/download/:filename',
        apiFiles: '/api/files/:filename (streaming)'
      }
    };
    
    // Add Google Drive quota if configured
    if (driveConfigured) {
      try {
        const quota = await googleDriveService.getStorageQuota();
        responseData.googleDrive.quota = {
          limitMB: quota.limitMB,
          usageMB: quota.usageMB,
          availableMB: quota.availableMB,
          usagePercent: quota.usagePercent
        };
        
        const driveFiles = await googleDriveService.listFiles(10);
        responseData.googleDrive.filesCount = driveFiles.length;
        responseData.googleDrive.recentFiles = driveFiles.map(f => ({
          name: f.name,
          sizeMB: f.size ? (f.size / (1024 * 1024)).toFixed(2) : 'N/A'
        }));
      } catch (error) {
        responseData.googleDrive.error = `Failed to fetch Drive data: ${error.message}`;
      }
    }
    
    res.json(responseData);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking storage status',
      error: error.message
    });
  }
});

/**
 * Environment configuration check
 * Shows all critical environment variables status
 */
router.get('/env-check', (req, res) => {
  try {
    const config = {
      success: true,
      timestamp: new Date().toISOString(),
      server: {
        nodeEnv: process.env.NODE_ENV || 'Not set',
        port: process.env.PORT || '5000 (default)',
        isProduction: process.env.NODE_ENV === 'production'
      },
      urls: {
        clientUrl: process.env.CLIENT_URL || '❌ Not set (using localhost fallback)',
        frontendUrl: process.env.FRONTEND_URL || '❌ Not set (using localhost fallback)',
        warning: (!process.env.CLIENT_URL || !process.env.FRONTEND_URL) 
          ? 'CRITICAL: Set CLIENT_URL and FRONTEND_URL to your Vercel URL in production!'
          : null
      },
      database: {
        mongoConfigured: !!process.env.MONGODB_URI,
        mongoUri: process.env.MONGODB_URI ? '***' + process.env.MONGODB_URI.slice(-30) : 'Not set'
      },
      email: {
        emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD),
        host: process.env.EMAIL_HOST || 'Not set',
        port: process.env.EMAIL_PORT || 'Not set',
        user: process.env.EMAIL_USER ? '***' + process.env.EMAIL_USER.slice(-15) : 'Not set',
        notificationsEnabled: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true'
      },
      storage: {
        s3Configured: isS3Configured(),
        bucket: process.env.AWS_BUCKET_NAME || 'Not set',
        region: process.env.AWS_REGION || 'Not set',
        storageType: isS3Configured() ? 'Cloud (AWS S3)' : 'Local (Ephemeral)'
      },
      features: {
        cronJobsEnabled: process.env.ENABLE_CRON_JOBS === 'true',
        dailyDigest: process.env.ENABLE_DAILY_DIGEST === 'true',
        weeklyDigest: process.env.ENABLE_WEEKLY_DIGEST === 'true',
        ackReminders: process.env.ENABLE_ACK_REMINDERS === 'true'
      },
      jwt: {
        secretConfigured: !!process.env.JWT_SECRET,
        expiry: process.env.JWT_EXPIRE || '7d (default)'
      }
    };
    
    // Add warnings array
    const warnings = [];
    
    if (!process.env.CLIENT_URL || process.env.CLIENT_URL.includes('localhost')) {
      warnings.push('CLIENT_URL should be set to Vercel URL in production');
    }
    
    if (!process.env.FRONTEND_URL || process.env.FRONTEND_URL.includes('localhost')) {
      warnings.push('FRONTEND_URL should be set to Vercel URL (email links will point to localhost)');
    }
    
    if (!config.email.emailConfigured) {
      warnings.push('Email not configured - notifications will not be sent');
    }
    
    if (!config.storage.s3Configured && config.server.isProduction) {
      warnings.push('CRITICAL: Using local storage in production - files will be deleted on restart!');
    }
    
    if (warnings.length > 0) {
      config.warnings = warnings;
    }
    
    res.json(config);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking environment',
      error: error.message
    });
  }
});

/**
 * Complete system health check
 * Tests all critical systems
 */
router.get('/health-check', async (req, res) => {
  try {
    const health = {
      success: true,
      timestamp: new Date().toISOString(),
      status: 'operational',
      checks: {}
    };
    
    // Check database
    try {
      const mongoose = require('mongoose');
      health.checks.database = {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        message: mongoose.connection.readyState === 1 ? '✅ MongoDB connected' : '❌ MongoDB disconnected'
      };
    } catch (error) {
      health.checks.database = {
        status: 'error',
        message: '❌ Error checking database',
        error: error.message
      };
    }
    
    // Check email (quick test)
    health.checks.email = {
      status: (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) ? 'configured' : 'not_configured',
      message: (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) 
        ? '✅ Email credentials configured' 
        : '⚠️ Email not configured'
    };
    
    // Check storage
    health.checks.storage = {
      status: isS3Configured() ? 'cloud' : 'local',
      message: isS3Configured() 
        ? '✅ Using cloud storage (persistent)' 
        : '⚠️ Using local storage (ephemeral)'
    };
    
    // Check upload directory
    const uploadDir = path.join(__dirname, '../uploads');
    health.checks.uploadDirectory = {
      status: fs.existsSync(uploadDir) ? 'exists' : 'missing',
      message: fs.existsSync(uploadDir) ? '✅ Upload directory exists' : '❌ Upload directory missing'
    };
    
    // Overall status
    const hasErrors = Object.values(health.checks).some(c => c.status === 'error' || c.status === 'disconnected' || c.status === 'missing');
    const hasWarnings = Object.values(health.checks).some(c => c.status === 'not_configured' || c.status === 'local');
    
    if (hasErrors) {
      health.status = 'degraded';
      health.message = '⚠️ Some systems are not operational';
    } else if (hasWarnings) {
      health.status = 'operational_with_warnings';
      health.message = '✅ Operational but some features may not work optimally';
    } else {
      health.status = 'fully_operational';
      health.message = '✅ All systems operational';
    }
    
    res.json(health);
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Error performing health check',
      error: error.message
    });
  }
});

/**
 * Test email sending
 * Sends a test email to verify configuration
 * Protected endpoint - only for testing
 */
router.post('/test-email', async (req, res) => {
  try {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({
        success: false,
        message: 'Please provide "to" email address in request body'
      });
    }
    
    const { sendEmail } = require('../services/emailService');
    
    const result = await sendEmail({
      to,
      subject: '🧪 CampusConnect Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4F46E5;">✅ Email System Working!</h1>
            <p>This is a test email from CampusConnect to verify email configuration.</p>
            <p><strong>Server:</strong> ${process.env.EMAIL_HOST}</p>
            <p><strong>From:</strong> ${process.env.EMAIL_USER}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            <p style="color: green; font-weight: bold;">If you received this, email notifications are working correctly! 🎉</p>
          </div>
        </div>
      `
    });
    
    res.json({
      success: result.success,
      message: result.success 
        ? `✅ Test email sent successfully to ${to}` 
        : `❌ Failed to send test email`,
      messageId: result.messageId,
      error: result.error
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending test email',
      error: error.message
    });
  }
});

module.exports = router;
