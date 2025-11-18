# Google Drive Integration - Complete Implementation

## ✅ Implementation Status

All components have been successfully implemented:

### 1. Environment Configuration ✅
- **Local (.env)**: Configured with service account credentials
  - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: zoro-990@campusconnect-478614.iam.gserviceaccount.com
  - `GOOGLE_PRIVATE_KEY`: Full private key from JSON file
  - `GOOGLE_DRIVE_FOLDER_ID`: 1qj85IPSTZXakKoXjVOKRFBBAm69xpz_V

### 2. Google Drive Service ✅
**File**: `backend/services/googleDriveService.js`
- Service account authentication
- Upload files with automatic public permissions
- Delete files by URL or file ID
- Generate public download URLs
- Storage quota monitoring
- File listing and metadata

### 3. Unified Storage Service ✅
**File**: `backend/services/fileStorage.js`
- Auto-detects storage: Google Drive > S3 > Local
- Unified `uploadFile()` and `deleteFile()` interface
- Works seamlessly with any storage backend

### 4. Notice Controller Integration ✅
**File**: `backend/controllers/noticeController.js`
- `createNotice`: Uploads attachments to Google Drive
- `updateNotice`: Uploads new attachments to Google Drive
- Stores Google Drive public URLs in database
- Maintains backward compatibility with local storage

### 5. Chat Controller Integration ✅
**File**: `backend/controllers/chatController.js`
- `sendMessage`: Uploads chat files to Google Drive
- `deleteMessage`: Removes files from Google Drive when message deleted
- Stores Google Drive public URLs in chat messages
- Auto-detects file type (image/file) for proper display

### 6. Upload Middleware ✅
**File**: `backend/middleware/upload.js`
- Uses memory storage when cloud configured
- Uses disk storage for local development fallback
- Automatic detection based on environment variables

### 7. Chat Message Model ✅
**File**: `backend/models/ChatMessage.js`
- Updated attachment schema to support cloud URLs
- Compatible with both Google Drive and local paths

### 8. Diagnostic Endpoint ✅
**File**: `backend/routes/diagnosticRoutes.js`
- `/api/diagnostics/storage-status`: Shows Google Drive status
- Displays quota, recent files, and configuration
- Helps verify setup is working correctly

---

## 🚀 How It Works

### File Upload Flow (Both Chat & Notices)

1. **User uploads file** via chat or notice form
2. **Multer receives file** in memory (RAM buffer)
3. **Controller checks** if cloud storage is configured
4. **Storage service** detects Google Drive is available
5. **Google Drive service** uploads file to shared folder
6. **Public permissions** automatically set for the file
7. **Download URL generated**: `https://drive.google.com/uc?export=download&id=FILE_ID`
8. **Database updated** with Google Drive URL
9. **Users can download** directly from Google Drive (no authentication needed)

### File Deletion Flow

1. **User/Moderator deletes** message or notice
2. **Controller retrieves** file URLs from attachments
3. **Storage service** detects URL is from Google Drive
4. **Google Drive service** extracts file ID and deletes file
5. **Database record** marked as deleted
6. **File removed** from both database and Google Drive

### Public Accessibility

All files uploaded are automatically made publicly accessible:
```javascript
await drive.permissions.create({
  fileId: fileId,
  requestBody: {
    role: 'reader',      // Can view/download
    type: 'anyone'       // No authentication required
  }
});
```

Direct download URL format:
```
https://drive.google.com/uc?export=download&id={FILE_ID}
```

Anyone with this URL can download the file without:
- Google account
- Login credentials
- Authentication tokens

---

## 🧪 Testing Procedures

### 1. Verify Configuration

**Check startup logs** when running `npm run dev`:
```
✅ Google Drive configured for cloud storage
   Service Account: zoro-990@campusconnect-478614.iam.gserviceaccount.com
   Folder ID: 1qj85IPSTZXakKoXjVOKRFBBAm69xpz_V
🚀 Using Google Drive for file storage (15GB free)
```

**Test diagnostic endpoint**:
```bash
curl http://localhost:5000/api/diagnostics/storage-status
```

Expected response:
```json
{
  "success": true,
  "storageType": "Google Drive (Cloud Storage)",
  "recommendation": "✅ Using Google Drive - files persist across restarts (15GB free)",
  "googleDrive": {
    "configured": true,
    "serviceAccount": "zoro-990@...",
    "quota": {
      "limitMB": 15360,
      "usageMB": 0,
      "availableMB": 15360
    }
  }
}
```

### 2. Test Notice File Upload

1. Login as Faculty or Admin
2. Navigate to Create Notice
3. Fill in notice details
4. Attach a PDF file (e.g., assignment.pdf)
5. Click Submit
6. **Verify**:
   - Notice created successfully
   - Check backend logs for: `☁️ Uploading 1 files to google-drive...`
   - Check logs for: `✅ All files uploaded to cloud storage`
   - Open notice detail page
   - Click download link - file should download
   - Check Google Drive folder - file should appear there

### 3. Test Chat File Upload

1. Login as any user
2. Navigate to Chat
3. Open any chat room (Department/Class/Private)
4. Click attach file icon
5. Select an image (e.g., photo.jpg)
6. Send message
7. **Verify**:
   - Message sent with image attachment
   - Check backend logs for: `☁️ Uploading 1 chat files to google-drive...`
   - Image displays inline in chat
   - Click image - opens/downloads from Google Drive
   - Check Google Drive folder - image should appear there

### 4. Test File Persistence

1. Upload files via both notice and chat
2. Restart backend server (`npm run dev`)
3. Try downloading the same files again
4. **Success**: Files still download (proves persistence) ✅

### 5. Test File Deletion

**For Chat**:
1. Send message with file attachment
2. Delete the message
3. Check backend logs for: `🗑️ Deleting 1 files from google-drive...`
4. Check Google Drive folder - file should be removed

**For Notices**:
- Notices use soft delete (isActive = false)
- Files remain in Google Drive even after notice deletion
- This is intentional for archive purposes

### 6. Test Public Accessibility

1. Upload any file (notice or chat)
2. Copy the Google Drive URL from database or logs
3. Open **incognito/private browser window** (not logged in)
4. Paste the URL
5. **Success**: File downloads without login ✅

### 7. Test Error Handling

**Missing credentials**:
1. Comment out `GOOGLE_SERVICE_ACCOUNT_EMAIL` in .env
2. Restart server
3. Try uploading file
4. **Expected**: Falls back to local storage with warning log

**Invalid folder ID**:
1. Change `GOOGLE_DRIVE_FOLDER_ID` to wrong value
2. Restart server
3. Try uploading file
4. **Expected**: Upload fails with clear error message

---

## 🔧 Render Production Deployment

### Step 1: Add Environment Variables

Go to [Render Dashboard](https://dashboard.render.com/) → Your service → **Environment** tab

**Add these 3 variables**:

#### Variable 1: GOOGLE_SERVICE_ACCOUNT_EMAIL
```
Key: GOOGLE_SERVICE_ACCOUNT_EMAIL
Value: zoro-990@campusconnect-478614.iam.gserviceaccount.com
```

#### Variable 2: GOOGLE_PRIVATE_KEY
```
Key: GOOGLE_PRIVATE_KEY
Value: -----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC+6n4O/40NZ5Se
fPQf4B39oAHvhw0EgnD1LUBR6nxFvybhrjjjLoNZP79vNB8XqEZe0yRXxeF7nlXM
UZVtPKGRZuwpjDGLr4bcfkE8YWvrM70+lnNaWu+8C0we63JEVkVBOasydfg+3ZDx
eo6rJhXJtlezEu3v10ojhPQAtI71OML7EkzCu7zueRbgu87/tLu6+G1igw7pFQTS
30YXDNFnTNS57Fz4NVYaaW7WEydDRFBRYMKe9YkF4AYuO47WaUnS6pp5t773rRHB
IyXDL/bvlXuivfo11Efokf34izo1f4eB0wLNZLvJVh/MYUUxHkRWNEFAPumqaZpP
kVEHSoulAgMBAAECggEACH5e4gSaiOMifd6UmdUbCyKS6M4lqnKx2yaKkFpnRvnB
yBPmh1eVaQ4TUpDgupO2SxeyVo6rgRgX5xbQwrhffnGJcNvCLzMS7pJWDVKkPiWM
y3u0DBa0SGBpoDfcsI+fVc8z/523T/dZhcoXDiQ2n0UT0m1gKpB1xZjE+5cM2SSm
nBM8uta3i2lFmUeHykOrbLkHqce7TePWMkqWfvAfTSxa4gDnN9e3WFM4VtP3yvaA
ih4mozP2RRjZNWacmGJxwgv+k3BrsedHbEdQqQHu3sLPI310Onu69nLL9mE3oLKE
oAsp1v8cajcy9oyNsLVV1naYK0EjBhoBjQBfYL1XAQKBgQDt3eiFA1IJ8br7lKLT
Yp0CFzoqgEKTcSTLVBU9CviHwqxMQzsyEFTjU7WErpYxB8pM1L5DCzxWRUnliGvo
Ktaqxfz/rGIKWMlwm1gRzL5eFCF8yBaugfROpX81CfoXfS4ecuEQzpyXPS5BbCW9
ezOBZuRlRxgciJ5BVCXphV3a5QKBgQDNeFCMELUHS3VJ/RCbOb+wAWqy5+yf2gAU
bokcM0Wy66FRf2c4IKks6WwuV7GHm8TdPR92Hzd5T23buxqpxdnnU5nRDfx8x5oj
5Mjb6r5Jr+cGO4FNZ9em43MJr0aIblFaUSMB347cK5uiSIKR32Lp77aIE9h8ttH2
lc+F9v0hwQKBgBLKOcjwFzXz43pmJmqeWprErPKYiSnOgUKSlM7qo/FNfoDTusRc
p+gBP9CIXhLnc6KYF6OCKrUB6jF4klWXtLduxmqH+oKoutjrXIyjaNJTssWBpNEK
MPtZdXACJsBeQhtjpcXHHHWR/qpqWZzbM5lgQGCDujLe0+mDNS96OozFAoGAJXpW
ptW9T3FSGYbRap7j+gSoI63uGVI4RYHL/JrVkcctC6KDf1dlxE1ncCSKu0OMaxZl
ELSs97GnRjcgq+rszicPnXRBo7j8wqNOh96Piv1M1HQyJ55TVZuTNicEZIpKyICY
NBVFB5/kqXs0ZcsrTaRt1PBZwpXOQn4c9kCQ94ECgYBQtWpHEbpn9kWS33i4eBaI
t7ZswaeFT3I7hl6tBvRkrDTXed369iZdlFVb0laqe63CBhg28FBLoYDtz/hCkux1
Ejv10wslRpM1pz5uZAiFkmToi5LqifrnxkGR4XN9oWhIGOdO24AuKXlIen8fFjYH
CLuX6PXDAGjij8JZ2s2IXw==
-----END PRIVATE KEY-----
```

**⚠️ CRITICAL**: Paste the entire private key including:
- `-----BEGIN PRIVATE KEY-----` at the start
- `-----END PRIVATE KEY-----` at the end
- All newlines (`\n`) between lines
- Render will preserve the formatting automatically

#### Variable 3: GOOGLE_DRIVE_FOLDER_ID
```
Key: GOOGLE_DRIVE_FOLDER_ID
Value: 1qj85IPSTZXakKoXjVOKRFBBAm69xpz_V
```

### Step 2: Deploy and Verify

1. Click **Save Changes** - Render will auto-restart (2-3 minutes)
2. Check logs in Render dashboard for:
   ```
   ✅ Google Drive configured for cloud storage
   🚀 Using Google Drive for file storage
   ```
3. Test diagnostic endpoint:
   ```
   https://campusconnect-fz1i.onrender.com/api/diagnostics/storage-status
   ```
4. Upload test file through production app
5. Verify file appears in Google Drive folder
6. Download file to confirm public access works

---

## 📊 File Organization in Google Drive

All files are uploaded to your shared folder:
```
Google Drive
└── CampusConnect Uploads (1qj85IPSTZXakKoXjVOKRFBBAm69xpz_V)
    ├── 1699999999999-123456789-assignment.pdf (Notice attachment)
    ├── 1700000000000-987654321-photo.jpg (Chat image)
    ├── 1700000000001-111111111-document.docx (Notice attachment)
    └── ...
```

**File naming convention**:
- Timestamp (milliseconds)
- Random number (9 digits)
- Original file name
- Example: `1699999999999-123456789-assignment.pdf`

This ensures:
- No file name conflicts
- Chronological sorting by upload time
- Original file name preserved for downloads

---

## 🔒 Security & Permissions

### Service Account Permissions

Your service account (`zoro-990@campusconnect-478614.iam.gserviceaccount.com`) has:
- **Editor** access to the shared folder
- Can upload, delete, and modify files
- Can set file permissions

### File Permissions

All uploaded files automatically get:
```javascript
{
  role: 'reader',    // Can view and download
  type: 'anyone'     // No authentication required
}
```

This means:
- ✅ Any website visitor can download files
- ✅ No Google login required
- ✅ No authentication tokens needed
- ✅ Direct browser downloads work
- ❌ Files cannot be edited by public
- ❌ Files cannot be deleted by public

### Folder Permissions

Your shared folder permissions:
- **You** (folder owner): Full control
- **Service account**: Editor (can upload/delete)
- **Public**: No access to folder (only individual files)

### Security Best Practices

✅ **DO**:
- Keep JSON credentials file secure (not in git)
- Use environment variables for production
- Regularly monitor storage usage
- Review uploaded files periodically

❌ **DON'T**:
- Commit credentials to git
- Share private key publicly
- Make the entire folder public
- Store sensitive data without encryption

---

## 📈 Storage Monitoring

### Current Usage

Check via diagnostic endpoint:
```bash
curl http://localhost:5000/api/diagnostics/storage-status
```

Response includes:
```json
{
  "googleDrive": {
    "quota": {
      "limitMB": 15360,      // 15GB total
      "usageMB": 125,        // Current usage
      "availableMB": 15235,  // Available space
      "usagePercent": 1      // Percentage used
    },
    "filesCount": 8,
    "recentFiles": [...]
  }
}
```

### Manual Check

1. Go to [Google Drive](https://drive.google.com/)
2. Open "CampusConnect Uploads" folder
3. View all uploaded files
4. Check file sizes and total storage used

### Storage Limits

- **Free tier**: 15GB (shared with Gmail and Photos)
- **Files**: No individual file size limit (backend limits to 10MB)
- **Upgrade**: Google One ($1.99/month for 100GB)

### When to Clean Up

Consider cleaning old files when:
- Storage usage > 80% (12GB)
- Old semester files no longer needed
- Archive important files to local backup first

---

## 🛠️ Troubleshooting

### Issue 1: "Google Drive not configured"

**Symptoms**: Startup logs show warning, files saved locally

**Causes**:
- Missing environment variables
- Invalid service account email
- Wrong folder ID

**Solutions**:
1. Check all 3 env vars are set correctly
2. Verify no extra spaces in values
3. Restart server after adding env vars
4. Check Render environment tab (for production)

### Issue 2: "Failed to upload to Google Drive: invalid_grant"

**Symptoms**: Upload fails with authentication error

**Causes**:
- Malformed private key
- Missing BEGIN/END markers
- Incorrect newline characters

**Solutions**:
1. Re-copy private key from JSON file
2. Ensure `\n` characters are preserved
3. Include `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
4. For Render: Paste entire key without additional formatting

### Issue 3: "insufficientPermissions"

**Symptoms**: Upload fails with permission error

**Causes**:
- Service account not shared with folder
- Folder doesn't exist
- Wrong folder ID

**Solutions**:
1. Go to Google Drive folder
2. Right-click → Share
3. Add service account email with **Editor** permission
4. Verify folder ID matches `GOOGLE_DRIVE_FOLDER_ID`

### Issue 4: Files upload but can't download

**Symptoms**: Files in Drive but download fails with 403

**Causes**:
- Public permissions not set
- Service account lacks permission to change sharing

**Solutions**:
1. Check service account has **Editor** (not Viewer) on folder
2. Manually make one file public to test
3. Check console logs for permission errors during upload

### Issue 5: Storage quota error

**Symptoms**: Upload fails with quota exceeded error

**Causes**:
- 15GB limit reached
- Other Google services using space (Gmail, Photos)

**Solutions**:
1. Check quota via diagnostic endpoint
2. Delete old files from Google Drive
3. Clear Gmail trash and Google Photos
4. Upgrade to Google One if needed

---

## 🎯 What's Next?

### Immediate Testing (30 minutes)

1. ✅ Start backend: `npm run dev`
2. ✅ Check startup logs for Google Drive confirmation
3. ✅ Test notice file upload
4. ✅ Test chat file upload
5. ✅ Verify files in Google Drive folder
6. ✅ Test public download (incognito mode)
7. ✅ Test file deletion

### Production Deployment (1 hour)

1. ✅ Add 3 environment variables to Render
2. ✅ Wait for auto-restart
3. ✅ Check production logs
4. ✅ Test diagnostic endpoint
5. ✅ Upload test files via production app
6. ✅ Verify persistence after Render restart

### Additional Tasks (Optional)

1. **Email Notifications**: Follow QUICK_FIX_GUIDE.md to enable emails
2. **Security Audit**: Follow SECURITY_ALERT.md to secure credentials
3. **Frontend Updates**: Update file display components if needed
4. **Monitoring**: Set up Sentry for error tracking
5. **Backup Strategy**: Implement automated MongoDB backups

---

## 📞 Support

### Diagnostic Tools

1. **Storage Status**: `/api/diagnostics/storage-status`
2. **Email Status**: `/api/diagnostics/email-status`
3. **Environment Check**: `/api/diagnostics/env-check`
4. **Health Check**: `/api/diagnostics/health-check`

### Useful Links

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Drive Folder](https://drive.google.com/drive/folders/1qj85IPSTZXakKoXjVOKRFBBAm69xpz_V)
- [Render Dashboard](https://dashboard.render.com/)
- [Vercel App](https://campus-connect-hazel-xi.vercel.app)

### Documentation

- `GOOGLE_DRIVE_SETUP.md` - Original setup guide
- `GOOGLE_DRIVE_IMPLEMENTATION.md` - Technical implementation details
- `QUICK_FIX_GUIDE.md` - Production fixes
- `SECURITY_ALERT.md` - Security best practices

---

**Implementation Date**: November 18, 2025  
**Status**: ✅ Complete and Ready for Testing  
**Next Action**: Test locally then deploy to Render
