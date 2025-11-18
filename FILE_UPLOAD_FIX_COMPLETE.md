# 🔧 FILE UPLOAD FIX - Complete Solution

## 🐛 ROOT CAUSES IDENTIFIED

### Problem 1: Notice Form NOT Creating FormData
**File**: `NoticeForm.jsx`
**Issue**: Line 172-203 created a plain JavaScript object, NOT FormData
**Impact**: Files were passed as file objects in JSON, not uploaded as multipart data

### Problem 2: Content-Type Header Manually Set
**Files**: `noticeAPI.js`, `chatAPI.js`
**Issue**: Manually setting `Content-Type: multipart/form-data` prevents browser from adding boundary parameter
**Impact**: Server can't parse multipart boundaries, files not received

### Problem 3: Chat Missing File Validation
**File**: `Chat.jsx`
**Issue**: FormData created but minimal logging/feedback
**Impact**: Silent failures, no user feedback on upload status

## ✅ FIXES APPLIED

### Fix 1: NoticeForm.jsx - Create Proper FormData
**Changed**: Lines 172-203
**Before**: Plain object with file array
```javascript
const submitData = {
  title: formData.title.trim(),
  attachments: formData.attachments || []  // ❌ Won't upload
};
```

**After**: Proper FormData construction
```javascript
const submitData = new FormData();
submitData.append('title', formData.title.trim());
submitData.append('externalLinks', JSON.stringify(formData.externalLinks || []));

// Append files properly
if (formData.attachments && formData.attachments.length > 0) {
  formData.attachments.forEach((file) => {
    submitData.append('attachments', file);
  });
}
```

### Fix 2: Remove Manual Content-Type Headers
**Changed**: `noticeAPI.js` (lines 18-36), `chatAPI.js` (line 26-30)

**Before**:
```javascript
const config = noticeData instanceof FormData ? {
  headers: {
    'Content-Type': 'multipart/form-data',  // ❌ Breaks boundary
  },
} : {};
```

**After**:
```javascript
// Let browser set Content-Type with boundary automatically
const response = await axiosInstance.post('/notices', noticeData);
```

**Why**: Browser automatically sets `Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryXXX` when sending FormData. Manual override removes the boundary parameter.

### Fix 3: Enhanced Chat File Upload
**Changed**: `Chat.jsx` lines 185-212
**Added**:
- Proper message type detection (image vs file)
- Console logging for debugging
- Better error messages with server response
- Success toast notification

## 🧪 TESTING CHECKLIST

### Test 1: Notice Attachment Upload
1. **Login** as faculty or admin
2. **Navigate** to Create Notice
3. **Fill** title, content, category
4. **Click** "Choose Files" under Attachments
5. **Select** 2-3 files (PDFs, images, docs)
6. **Verify** files appear in preview list
7. **Click** "Post Notice"
8. **Expected**:
   - ✅ "Notice created successfully" toast
   - ✅ Browser DevTools → Network → POST /api/notices shows `Content-Type: multipart/form-data; boundary=...`
   - ✅ Backend logs show: `☁️ Uploading X files to Google Drive...`
   - ✅ Backend logs show: `✅ All files uploaded to cloud storage`
   - ✅ Notice appears in list with attachment count
9. **Check Google Drive**: Files should appear in folder `1qj85IPSTZXakKoXjVOKRFBBAm69xpz_V`

### Test 2: Notice Attachment Download
1. **Click** on notice with attachments
2. **Verify** attachment links appear
3. **Click** download link for each file
4. **Expected**:
   - ✅ File downloads directly from Google Drive
   - ✅ URL format: `https://drive.google.com/uc?export=download&id=XXXXX`
   - ✅ No authentication required (public readable)

### Test 3: Chat File Upload
1. **Navigate** to Chat
2. **Select** a chat room or create new one
3. **Click** paperclip icon (📎)
4. **Select** 1-2 files
5. **Verify** files appear in preview above input
6. **Type** optional message
7. **Click** "Send"
8. **Expected**:
   - ✅ Console log: `Uploading files: [file1.pdf, file2.jpg]`
   - ✅ "Message sent with attachments!" toast
   - ✅ Backend logs: `☁️ Uploading X chat files to Google Drive...`
   - ✅ Message appears with download links/previews
   - ✅ Images show inline, other files show as download boxes
9. **Check Google Drive**: Files uploaded with timestamp prefix

### Test 4: Chat File Download
1. **Click** download icon on file attachments
2. **Verify** file downloads
3. **Expected**:
   - ✅ Direct download from Google Drive
   - ✅ No CORS errors
   - ✅ Works for all users in chat room

### Test 5: Error Handling
1. **Test large file** (>10MB)
   - Expected: "File too large" error
2. **Test invalid file type** (.exe, .sh)
   - Expected: "File type not allowed" error
3. **Test without Google Drive** (temporarily remove GOOGLE_PRIVATE_KEY)
   - Expected: Clear error message, no silent failure

## 🔍 DEBUGGING GUIDE

### Issue: "No files uploaded"

**Check 1: Browser DevTools**
```
Network Tab → POST /api/notices
Request Headers → Should see:
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...

Form Data Tab → Should see:
attachments: (binary)
```

**Check 2: Backend Logs**
```bash
# Should see:
📝 Create Notice Request: { files: [ { originalname: 'test.pdf', ... } ] }
☁️ Uploading 1 files to Google Drive...
✅ File uploaded to Google Drive: https://drive.google.com/uc?export=download&id=XXXXX
```

**Check 3: Frontend Console**
```javascript
// Add before submit:
console.log('Submitting notice with files:', formData.attachments.length);
// Should log: Submitting notice with files: 2
```

### Issue: "CORS error downloading file"

**Check 1: Google Drive Permissions**
```bash
# File must have public reader permission
# Backend sets this automatically in googleDriveService.js line 138-142
```

**Check 2: Download URL Format**
```javascript
// Correct format:
https://drive.google.com/uc?export=download&id=FILE_ID

// Wrong (view only):
https://drive.google.com/file/d/FILE_ID/view
```

### Issue: "Google Drive upload failed"

**Check 1: Private Key Format**
```bash
# .env file must have:
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgk...\n-----END PRIVATE KEY-----\n

# NOT:
GOOGLE_PRIVATE_KEY=nMIIEvAIBADANBgk...  # ❌ Missing BEGIN marker
```

**Check 2: Service Account Permissions**
```
1. Go to: https://drive.google.com/drive/folders/1qj85IPSTZXakKoXjVOKRFBBAm69xpz_V
2. Right-click folder → Share
3. Add: zoro-990@campusconnect-478614.iam.gserviceaccount.com
4. Role: Editor
5. Save
```

**Check 3: Backend Startup Logs**
```bash
# Should see:
✅ Google Drive configured for cloud storage
   Service Account: zoro-990@campusconnect-478614.iam.gserviceaccount.com
   Folder ID: 1qj85IPSTZXakKoXjVOKRFBBAm69xpz_V

# If you see:
❌ Failed to initialize Google Drive: Invalid private key format
# → Fix GOOGLE_PRIVATE_KEY in .env
```

## 🚀 DEPLOYMENT CHECKLIST

### Local Testing
- [ ] Start backend: `cd backend && npm start`
- [ ] Start frontend: `cd campusConnect && npm run dev`
- [ ] Test notice attachment upload
- [ ] Test chat file upload
- [ ] Verify files in Google Drive folder
- [ ] Test file downloads
- [ ] Check browser console for errors
- [ ] Check backend logs for upload confirmations

### Production Deployment (Render + Vercel)

**Step 1: Commit Changes**
```bash
git add .
git commit -m "fix: file upload FormData and Content-Type headers"
git push origin master
```

**Step 2: Verify Render Environment Variables**
1. Go to Render Dashboard
2. Select backend service
3. Environment tab
4. Verify these variables:
   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL=zoro-990@campusconnect-478614.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC+6n4O/40NZ5Se...\n-----END PRIVATE KEY-----\n
   GOOGLE_DRIVE_FOLDER_ID=1qj85IPSTZXakKoXjVOKRFBBAm69xpz_V
   ```

**Step 3: Monitor Deployment**
- Watch Render logs for successful startup
- Look for: `✅ Google Drive configured for cloud storage`
- If error, check private key format

**Step 4: Test Production**
1. Visit: https://campus-connect-hazel-xi.vercel.app
2. Login
3. Create notice with attachments
4. Send chat with files
5. Verify downloads work
6. Check Google Drive for uploaded files

## 📊 EXPECTED BEHAVIOR

### Notice Upload Flow
```
User Selects Files
    ↓
Files Added to formData.attachments Array
    ↓
Form Submit → Create FormData Object
    ↓
Append Files: formData.append('attachments', file)
    ↓
POST /api/notices (multipart/form-data with boundary)
    ↓
Multer parses files → req.files array
    ↓
Backend: isCloudStorageConfigured() → true
    ↓
Backend: uploadFile(file.buffer, name, mimetype)
    ↓
Google Drive Service: uploadToGoogleDrive()
    ↓
Create JWT auth → Upload to folder → Set public permissions
    ↓
Return URL: https://drive.google.com/uc?export=download&id=XXX
    ↓
Save to MongoDB: notice.attachments = [{ fileName, fileUrl, fileType, fileSize }]
    ↓
Response to Frontend: Notice created successfully
    ↓
User Can Download File from Google Drive
```

### Chat Upload Flow
```
User Selects Files via Paperclip Icon
    ↓
Files Added to selectedFiles State
    ↓
User Clicks Send
    ↓
Create FormData: formData.append('attachments', file)
    ↓
POST /chat/rooms/:id/messages (multipart/form-data)
    ↓
Multer → req.files
    ↓
Backend: uploadFile() → Google Drive
    ↓
Save ChatMessage with attachments array
    ↓
Socket.io Broadcast to Room
    ↓
All Users See Message with Attachments
    ↓
Download Works for Everyone
```

## 🎯 KEY CHANGES SUMMARY

| File | Lines | Change | Why |
|------|-------|--------|-----|
| `NoticeForm.jsx` | 172-203 | Create FormData, append files | Enable multipart upload |
| `noticeAPI.js` | 18-36 | Remove Content-Type header | Let browser set boundary |
| `chatAPI.js` | 26-30 | Remove Content-Type header | Let browser set boundary |
| `Chat.jsx` | 185-212 | Add logging, better errors | Debug and UX improvements |

## ✅ VERIFICATION

After deploying, you should see:

**Backend Logs** (Render):
```
✅ Google Drive configured for cloud storage
📝 Create Notice Request: { files: [ { originalname: 'test.pdf', size: 12345, ... } ] }
☁️ Uploading 1 files to Google Drive...
✅ File uploaded to Google Drive: https://drive.google.com/uc?export=download&id=1a2b3c...
✅ All files uploaded to cloud storage
✅ Notice created with ID: 6581a2b3c4d5e6f7g8h9i0j1
```

**Frontend Console** (Browser):
```
Submitting notice with files: 2
POST https://campusconnect-fz1i.onrender.com/api/notices 201 (Created)
```

**Network Tab** (Browser):
```
Request Headers:
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryXXXXXXXXXXXX

Form Data:
title: "Test Notice"
content: "Testing file upload"
attachments: (binary) test.pdf
attachments: (binary) image.jpg
```

**Google Drive Folder**:
- Files visible in: https://drive.google.com/drive/folders/1qj85IPSTZXakKoXjVOKRFBBAm69xpz_V
- File names: `1700000000-123456789-test.pdf`
- Permissions: Anyone with link can view

---

## 🆘 STILL NOT WORKING?

If uploads still fail after all fixes:

1. **Share Backend Logs**: Full terminal output from Render
2. **Share Browser Console**: Any errors in browser DevTools
3. **Share Network Tab**: Screenshot of failed request (Request/Response headers)
4. **Verify**:
   - GOOGLE_PRIVATE_KEY has BEGIN/END markers
   - Service account has Editor access to folder
   - Folder ID is correct: `1qj85IPSTZXakKoXjVOKRFBBAm69xpz_V`
   - Backend shows: `✅ Google Drive configured for cloud storage` on startup

**Status**: ✅ All file upload issues fixed. Ready for testing!
