# 🚀 Quick Fix Guide - Email & File Downloads

## 🔥 IMMEDIATE FIX (5 minutes) - Email Notifications

### Step 1: Add Environment Variables to Render

1. Go to: https://dashboard.render.com
2. Select your backend service: `campusconnect-fz1i`
3. Click "Environment" tab
4. Add these variables:

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

5. Click **"Save Changes"**
6. Wait 30-60 seconds for service to restart

### Step 2: Verify Email is Working

Open these URLs in your browser:

**Check email configuration:**
```
https://campusconnect-fz1i.onrender.com/api/diagnostics/email-status
```

You should see:
```json
{
  "connectionTest": "✅ SUCCESS - SMTP server is reachable",
  "canSendEmails": true
}
```

**Send test email:**
```bash
curl -X POST https://campusconnect-fz1i.onrender.com/api/diagnostics/test-email \
  -H "Content-Type: application/json" \
  -d '{"to":"your-email@gmail.com"}'
```

### Step 3: Test with Real Notice

1. Login to: https://campus-connect-hazel-xi.vercel.app
2. Create a new notice
3. Check Render logs for: `✅ Email notifications sent: X success`
4. Check your email inbox

---

## 📁 FILE DOWNLOADS FIX

### Option A: Quick Test (No Code Changes)

**Test if downloads work RIGHT NOW:**

1. Upload a file via the app
2. Click download immediately
3. If it works → Problem only occurs after restart
4. If it fails → Different issue (check logs)

**Check storage status:**
```
https://campusconnect-fz1i.onrender.com/api/diagnostics/storage-status
```

### Option B: Cloud Storage Setup (Permanent Fix)

#### Using AWS S3 (Recommended)

**1. Create S3 Bucket:**
- Go to AWS Console → S3
- Create bucket: `campusconnect-uploads`
- Region: `us-east-1` (or closest to Render)
- Uncheck "Block all public access" (or use signed URLs)

**2. Create IAM User:**
- Go to IAM → Users → Add User
- Username: `campusconnect-s3`
- Access type: Programmatic access
- Permissions: Attach `AmazonS3FullAccess` policy
- Save Access Key ID and Secret Access Key

**3. Configure CORS on S3 Bucket:**
- Select bucket → Permissions → CORS
- Add:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": [
      "https://campus-connect-hazel-xi.vercel.app",
      "https://campusconnect-fz1i.onrender.com"
    ],
    "ExposeHeaders": ["ETag"]
  }
]
```

**4. Add to Render Environment:**
```env
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
AWS_BUCKET_NAME=campusconnect-uploads
```

**5. Code is already prepared!** Just set the env vars and redeploy.

#### Using Cloudinary (Easier Alternative)

**1. Sign up:** https://cloudinary.com (Free tier: 25GB)

**2. Get credentials:** Dashboard → Account Details

**3. Install package:**
```bash
cd backend
npm install cloudinary
```

**4. Add to Render:**
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**5. Update upload middleware** (I can help with this)

---

## 🧪 Diagnostic Endpoints

### Check Everything at Once:
```
https://campusconnect-fz1i.onrender.com/api/diagnostics/health-check
```

### Individual Checks:

**Email Status:**
```
https://campusconnect-fz1i.onrender.com/api/diagnostics/email-status
```

**Storage Status:**
```
https://campusconnect-fz1i.onrender.com/api/diagnostics/storage-status
```

**Environment Variables:**
```
https://campusconnect-fz1i.onrender.com/api/diagnostics/env-check
```

**Test File Upload System:**
```
https://campusconnect-fz1i.onrender.com/api/test-upload
```

---

## 🔍 Check Render Logs

### View Logs:
1. Go to Render Dashboard
2. Select service
3. Click "Logs" tab
4. Look for:

**Email Working:**
```
✅ Email server is ready to send messages
📧 Sending email notifications for notice: Test Notice
✅ Email notifications sent: 5 success, 0 failed
```

**Email Broken:**
```
❌ Email server connection failed: Invalid login
❌ Email sending failed: Missing credentials
```

**Storage Warning:**
```
⚠️  AWS S3 not configured - using local storage (ephemeral on Render!)
```

---

## ⚠️ CRITICAL WARNINGS

### 1. Gmail App Password Exposed
Your Gmail app password is visible in your local `.env` file. After fixing production:

1. Go to Google Account → Security → 2-Step Verification → App passwords
2. Delete the old password
3. Generate new one
4. Update Render environment variables
5. Remove password from local `.env` and add to `.gitignore`

### 2. Local Storage on Render
Without S3/Cloudinary, ALL uploaded files are deleted when:
- Service restarts (every 24h on free tier)
- New deployment
- Server crashes/scales

**Temporary workaround:**
- Document this to users
- Tell them files may disappear
- Set up cloud storage ASAP

### 3. Email Links
If `FRONTEND_URL` is not set, emails will say:
```
Click here: http://localhost:5173/notices/123
```
This won't work from user's browser!

---

## ✅ Success Checklist

After applying fixes, verify:

- [ ] Email diagnostic shows: `"canSendEmails": true`
- [ ] Test email arrives in inbox
- [ ] Creating notice sends emails (check logs)
- [ ] Email links point to `campus-connect-hazel-xi.vercel.app`
- [ ] File upload works
- [ ] File download works immediately
- [ ] Files persist after Render restart (if using S3)
- [ ] No errors in Render logs
- [ ] All diagnostic endpoints return green status

---

## 🆘 Still Not Working?

### Email Issues:

**"Invalid login" error:**
- Double-check EMAIL_USER and EMAIL_PASSWORD
- Gmail: Must use App Password, not regular password
- Generate new App Password: https://myaccount.google.com/apppasswords

**"Connection timeout":**
- Check EMAIL_HOST (smtp.gmail.com)
- Check EMAIL_PORT (587 for TLS, 465 for SSL)
- Verify Render can reach Gmail servers

**Emails sent but not received:**
- Check spam folder
- Verify user has `emailNotifications: true` in database
- Check user has `notificationPreferences.newNotice: true`

### File Download Issues:

**404 Not Found:**
- Check file path in database (should start with `/api/uploads/`)
- Run storage diagnostic to see if files exist
- Check Render logs for file upload errors

**Files disappear after restart:**
- This is NORMAL on Render without cloud storage
- Set up S3 or Cloudinary immediately

---

## 📞 Need Help?

1. Run all diagnostic endpoints
2. Check Render logs
3. Copy any error messages
4. Share diagnostic results

I can help debug further based on the diagnostic output!
