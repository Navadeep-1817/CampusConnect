# 🔍 Production Deployment Diagnostic Report

**Date:** November 18, 2025  
**Frontend:** https://campus-connect-hazel-xi.vercel.app  
**Backend:** https://campusconnect-fz1i.onrender.com  
**Status:** ⚠️ Critical Issues Identified

---

## 🚨 CRITICAL ISSUES FOUND

### 1. **EMAIL NOTIFICATIONS NOT WORKING** ❌

#### Root Cause Analysis:
Your backend is configured for Gmail SMTP locally, but **Render environment variables are NOT set**.

#### Evidence:
```javascript
// Local .env (working):
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=navadeep1817@gmail.com
EMAIL_PASSWORD=krst hmhk yabz vxtc  // App password
ENABLE_EMAIL_NOTIFICATIONS=true
FRONTEND_URL=http://localhost:5173  // ⚠️ Wrong for production!
```

#### What Happens in Production:
1. `transporter.verify()` runs on server startup
2. If `EMAIL_USER` or `EMAIL_PASSWORD` is undefined → **Connection fails**
3. Logs show: `❌ Email server connection failed`
4. All `sendEmail()` calls return `{ success: false }`
5. Users never receive notifications

#### Diagnosis Test:
```bash
# Check Render logs for this on startup:
curl https://campusconnect-fz1i.onrender.com/api/health

# Look for:
"❌ Email server connection failed: Invalid login"
# or
"❌ Email server connection failed: Missing credentials"
```

---

### 2. **FILE DOWNLOADS NOT WORKING** ❌

#### Root Cause: Render Ephemeral File System

**THE PROBLEM:** Render uses **ephemeral storage** - ALL uploaded files are DELETED when:
- Service restarts
- New deployment
- Server scales/crashes
- Container is replaced

#### Current File Storage:
```javascript
// backend/middleware/upload.js
const uploadDir = path.join(__dirname, '../uploads');
// This creates: /opt/render/project/src/backend/uploads/
// ⚠️ This directory is WIPED on every restart!
```

#### What Happens:
1. User uploads file → Saved to `backend/uploads/`
2. Database stores: `fileUrl: "/api/uploads/filename.pdf"`
3. Render restarts (every 24h or on deploy)
4. **ALL FILES DELETED** 🗑️
5. User clicks download → 404 Not Found

#### Evidence of Ephemeral Storage:
```bash
# Test this on Render:
curl https://campusconnect-fz1i.onrender.com/api/test-upload

# Response will show:
{
  "uploadDirectory": "/opt/render/project/src/backend/uploads",
  "directoryExists": true,
  "filesCount": 0,  // ⚠️ Always 0 after restart!
  "files": []
}
```

---

### 3. **EMAIL LINKS POINT TO LOCALHOST** ❌

#### Issue:
Email templates use `FRONTEND_URL` for notice links, but it's not set in production.

#### Current Code:
```javascript
// backend/templates/emailTemplates.js
<a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/notices/${notice._id}">
  View Notice
</a>
```

#### What Users See:
Email says: "Click here to view notice"  
Link: `http://localhost:5173/notices/abc123` ❌  
**This link doesn't work from their browser!**

---

### 4. **CORS Configuration Issues** ⚠️

#### Current CORS Setup:
```javascript
// backend/server.js
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',  // ⚠️ Defaults to localhost!
  'https://campus-connect-hazel-xi.vercel.app',
  'http://localhost:5173',
  'http://localhost:5000'
];
```

#### Issue:
If `CLIENT_URL` is not set on Render, socket connections may fail or be unstable.

---

## ✅ VERIFIED WORKING COMPONENTS

### Frontend Configuration ✅
- `VITE_API_URL`: Correctly set to Render backend
- `VITE_SOCKET_URL`: Correctly set
- `VITE_BASE_URL`: Correctly set
- Vercel routing: Fixed for SPA

### Backend Code ✅
- Email service logic: Correct
- File upload logic: Correct (but storage is ephemeral)
- CORS: Includes Vercel URL
- Routes: All properly configured
- Error handling: Good

### Database ✅
- MongoDB Atlas: Cloud-hosted (persistent)
- Connection string: Correct

---

## 🔧 REQUIRED FIXES

### Fix #1: Configure Email on Render

**Action Required:**
1. Go to Render Dashboard → Your Service → Environment
2. Add these variables:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=navadeep1817@gmail.com
EMAIL_PASSWORD=krst hmhk yabz vxtc
EMAIL_FROM_NAME=CampusConnect
ENABLE_EMAIL_NOTIFICATIONS=true
FRONTEND_URL=https://campus-connect-hazel-xi.vercel.app
CLIENT_URL=https://campus-connect-hazel-xi.vercel.app
```

3. Click "Save Changes" → Service auto-restarts
4. Check logs for: `✅ Email server is ready to send messages`

**Security Note:** The Gmail App Password in your local `.env` is now exposed in your repository. You should:
- Delete it from the repo
- Generate a new App Password
- Use Render's environment variables (encrypted)

---

### Fix #2: Migrate to Cloud Storage (CRITICAL)

**Current:** Files stored locally → **DELETED on restart**  
**Solution:** Use AWS S3, Cloudinary, or Firebase Storage

#### Option A: AWS S3 (Recommended for Production)

**Step 1:** Install AWS SDK (already in package.json ✅)

**Step 2:** Create new file storage service:

```javascript
// backend/services/fileStorage.js
const AWS = require('aws-sdk');
const path = require('path');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - File name
 * @param {string} mimeType - MIME type
 * @returns {Promise<string>} - S3 file URL
 */
const uploadToS3 = async (fileBuffer, fileName, mimeType) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `uploads/${Date.now()}-${fileName}`,
    Body: fileBuffer,
    ContentType: mimeType,
    ACL: 'public-read' // Make files publicly accessible
  };

  const result = await s3.upload(params).promise();
  return result.Location; // Returns full S3 URL
};

/**
 * Delete file from S3
 * @param {string} fileUrl - S3 file URL
 */
const deleteFromS3 = async (fileUrl) => {
  const key = fileUrl.split('.com/')[1]; // Extract key from URL
  
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key
  };

  await s3.deleteObject(params).promise();
};

/**
 * Get signed URL for temporary access
 * @param {string} key - S3 object key
 * @param {number} expiresIn - Expiration in seconds (default 1 hour)
 */
const getSignedUrl = (key, expiresIn = 3600) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Expires: expiresIn
  };

  return s3.getSignedUrl('getObject', params);
};

module.exports = {
  uploadToS3,
  deleteFromS3,
  getSignedUrl,
  isS3Configured: () => !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_BUCKET_NAME
  )
};
```

**Step 3:** Update upload middleware:

```javascript
// backend/middleware/upload.js
const multer = require('multer');
const { isS3Configured } = require('../services/fileStorage');

// Use memory storage for cloud upload
const storage = isS3Configured() 
  ? multer.memoryStorage() // Store in memory, then upload to S3
  : multer.diskStorage({    // Fallback to local (dev only)
      destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads'));
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    });
```

**Step 4:** Update notice controller:

```javascript
// backend/controllers/noticeController.js
const { uploadToS3, isS3Configured } = require('../services/fileStorage');

// In createNotice function:
if (req.files && req.files.length > 0) {
  if (isS3Configured()) {
    // Upload to S3
    const uploadPromises = req.files.map(file =>
      uploadToS3(file.buffer, file.originalname, file.mimetype)
    );
    const s3Urls = await Promise.all(uploadPromises);
    
    noticeData.attachments = req.files.map((file, index) => ({
      fileName: file.originalname,
      fileUrl: s3Urls[index], // Full S3 URL
      fileType: file.mimetype,
      fileSize: file.size,
      uploadedAt: new Date()
    }));
  } else {
    // Local storage (development only)
    noticeData.attachments = req.files.map(file => ({
      fileName: file.originalname,
      fileUrl: `/api/uploads/${file.filename}`,
      fileType: file.mimetype,
      fileSize: file.size,
      uploadedAt: new Date()
    }));
  }
}
```

**Step 5:** Add Render environment variables:

```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=campusconnect-uploads
```

**Step 6:** Create S3 bucket:
1. Go to AWS Console → S3
2. Create bucket: `campusconnect-uploads`
3. Enable public access (or use signed URLs)
4. Set CORS policy:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": [
      "https://campus-connect-hazel-xi.vercel.app",
      "https://campusconnect-fz1i.onrender.com"
    ],
    "ExposeHeaders": []
  }
]
```

#### Option B: Cloudinary (Easier Setup)

1. Sign up at cloudinary.com
2. Get API credentials
3. Install: `npm install cloudinary`
4. Similar implementation to S3 above

---

### Fix #3: Enhanced Logging & Diagnostics

**Create diagnostic endpoints:**

```javascript
// backend/routes/diagnosticRoutes.js
const express = require('express');
const router = express.Router();
const { isS3Configured } = require('../services/fileStorage');

// Email diagnostics
router.get('/email-status', async (req, res) => {
  const nodemailer = require('nodemailer');
  
  const status = {
    configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD),
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER ? '***' + process.env.EMAIL_USER.slice(-10) : 'Not set',
    frontendUrl: process.env.FRONTEND_URL || 'Using default (localhost)',
    notificationsEnabled: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true'
  };
  
  // Test connection
  if (status.configured) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
      
      await transporter.verify();
      status.connectionTest = 'SUCCESS';
    } catch (error) {
      status.connectionTest = 'FAILED';
      status.error = error.message;
    }
  }
  
  res.json(status);
});

// Storage diagnostics
router.get('/storage-status', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  const uploadDir = path.join(__dirname, '../uploads');
  const dirExists = fs.existsSync(uploadDir);
  
  let files = [];
  if (dirExists) {
    files = fs.readdirSync(uploadDir);
  }
  
  res.json({
    storageType: isS3Configured() ? 'AWS S3 (Cloud)' : 'Local (Ephemeral)',
    s3Configured: isS3Configured(),
    localDirectory: uploadDir,
    localDirectoryExists: dirExists,
    localFilesCount: files.length,
    warning: isS3Configured() 
      ? 'Using cloud storage - files persist across restarts ✅'
      : 'Using local storage - files WILL BE DELETED on restart! ⚠️'
  });
});

// Environment check
router.get('/env-check', (req, res) => {
  res.json({
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    clientUrl: process.env.CLIENT_URL,
    frontendUrl: process.env.FRONTEND_URL,
    mongoConfigured: !!process.env.MONGODB_URI,
    emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD),
    s3Configured: isS3Configured(),
    cronJobsEnabled: process.env.ENABLE_CRON_JOBS === 'true',
    emailNotificationsEnabled: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true'
  });
});

module.exports = router;
```

**Add to server.js:**

```javascript
// backend/server.js
const diagnosticRoutes = require('./routes/diagnosticRoutes');
app.use('/api/diagnostics', diagnosticRoutes);
```

**Test endpoints:**
```bash
curl https://campusconnect-fz1i.onrender.com/api/diagnostics/email-status
curl https://campusconnect-fz1i.onrender.com/api/diagnostics/storage-status
curl https://campusconnect-fz1i.onrender.com/api/diagnostics/env-check
```

---

## 📋 DEPLOYMENT CHECKLIST

### Pre-Deployment

- [ ] Remove sensitive credentials from code
- [ ] Update `.gitignore` to exclude `.env`
- [ ] Generate new Gmail App Password
- [ ] Create AWS S3 bucket (or Cloudinary account)
- [ ] Test locally with production-like environment

### Render Configuration

- [ ] Set all email environment variables
- [ ] Set `FRONTEND_URL` to Vercel URL
- [ ] Set `CLIENT_URL` to Vercel URL
- [ ] Set AWS S3 credentials (if using cloud storage)
- [ ] Set `NODE_ENV=production`
- [ ] Enable auto-deploy from GitHub

### Vercel Configuration

- [ ] Environment variables already set ✅
- [ ] Routing fixed for SPA ✅

### Post-Deployment Testing

- [ ] Check diagnostic endpoints
- [ ] Test email sending (create test notice)
- [ ] Test file upload and download
- [ ] Check Render logs for errors
- [ ] Test from different devices/networks

---

## 🔍 DEBUGGING COMMANDS

### Test Email from Render Console:

```bash
# SSH into Render (if available) or use Render Shell
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});
transporter.verify().then(() => console.log('✅ Email working')).catch(e => console.error('❌', e.message));
"
```

### Check File Storage:

```bash
curl https://campusconnect-fz1i.onrender.com/api/test-upload
```

### Monitor Render Logs:

```bash
# Look for these patterns:
"✅ Email server is ready to send messages"  # Email working
"❌ Email server connection failed"          # Email broken
"📧 Sending email notifications"              # Email triggered
"✅ Email notifications sent: X success"      # Email sent
```

---

## 🎯 IMMEDIATE ACTION PLAN

### Priority 1: Fix Email (15 minutes)

1. Go to Render dashboard
2. Add environment variables (copy from local `.env`)
3. Save and wait for restart
4. Check logs for `✅ Email server is ready`
5. Create test notice and verify email sent

### Priority 2: Fix File Storage (2-3 hours)

**Quick Fix (Temporary):**
- Accept that files will be deleted on restart
- Document this limitation to users
- Plan migration to cloud storage

**Permanent Fix:**
- Set up AWS S3 (or Cloudinary)
- Implement file storage service
- Update upload/download logic
- Migrate existing files (if any)
- Test thoroughly

### Priority 3: Monitor & Verify (ongoing)

- Set up monitoring alerts
- Check logs daily for errors
- Test key workflows regularly

---

## 📊 COST ESTIMATES

### AWS S3:
- **Storage:** $0.023/GB/month (first 50TB)
- **Requests:** $0.0004 per 1,000 GET requests
- **Estimate:** ~$1-5/month for typical college usage

### Cloudinary:
- **Free tier:** 25GB storage, 25GB bandwidth
- **Paid:** Starts at $89/month
- **Recommendation:** Start with free tier

### Gmail SMTP:
- **Free tier:** 500 emails/day
- **Paid (Google Workspace):** $6/user/month for unlimited
- **Recommendation:** Use free tier, monitor usage

---

## ✅ SUCCESS CRITERIA

Deployment is fully functional when:

1. **Email Notifications:**
   - [ ] Diagnostic endpoint shows `connectionTest: 'SUCCESS'`
   - [ ] Creating notice sends emails to target users
   - [ ] Email links point to Vercel URL (not localhost)
   - [ ] Logs show: `✅ Email notifications sent: X success`

2. **File Downloads:**
   - [ ] Files uploaded are stored in cloud (S3/Cloudinary)
   - [ ] Downloads work immediately after upload
   - [ ] Downloads still work after server restart
   - [ ] No 404 errors on file access

3. **General:**
   - [ ] No errors in Render logs
   - [ ] Frontend connects via WebSocket
   - [ ] All routes return expected responses
   - [ ] CORS errors resolved

---

**Next Steps:** Follow the immediate action plan above, starting with Priority 1 (email fix).
