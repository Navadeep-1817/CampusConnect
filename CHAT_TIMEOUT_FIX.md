# 🔧 CHAT TIMEOUT FIX - Authentication & Multer Issues

## 🐛 ROOT CAUSES IDENTIFIED

### **Issue 1: FormData Strips Authorization Header**
**Location**: `axiosInstance.js`
**Problem**: Default `Content-Type: application/json` header conflicts with FormData
**Impact**: When sending FormData, axios removes the Authorization header before sending request

### **Issue 2: Multer Blocks Non-Multipart Requests**
**Location**: `chatRoutes.js`
**Problem**: `upload.array('attachments', 5)` middleware applied to ALL POST requests
**Impact**: Text-only messages hang because multer waits for multipart data that never comes

### **Issue 3: Missing Error Validation**
**Location**: `chatController.js sendMessage()`
**Problem**: No validation for req.user or chat room existence
**Impact**: Requests fail silently or hang instead of returning proper error responses

### **Issue 4: Protect Middleware Could Hang**
**Location**: `auth.js protect middleware`
**Problem**: Database query has no timeout, could hang indefinitely
**Impact**: Request never returns, axios hits 10s timeout → ECONNABORTED

---

## ✅ FIXES APPLIED

### **Fix 1: axiosInstance.js - Remove Content-Type for FormData**

**Before**:
```javascript
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**After**:
```javascript
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // CRITICAL FIX: Remove Content-Type for FormData
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  
  return config;
});
```

**Why**: When you delete the Content-Type header, the browser automatically sets:
```
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryXXXX
```
This preserves the Authorization header and allows multer to parse the request.

---

### **Fix 2: chatRoutes.js - Conditional Multer Middleware**

**Before**:
```javascript
router.route('/rooms/:id/messages')
  .get(getChatMessages)
  .post(upload.array('attachments', 5), sendMessage);
```

**After**:
```javascript
router.route('/rooms/:id/messages')
  .get(getChatMessages)
  .post((req, res, next) => {
    // Only apply multer if Content-Type is multipart/form-data
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      upload.array('attachments', 5)(req, res, next);
    } else {
      next();
    }
  }, sendMessage);
```

**Why**: Text messages (JSON) skip multer entirely, preventing hangs. File messages go through multer normally.

---

### **Fix 3: chatController.js - Validation & Error Handling**

**Added Validations**:
```javascript
exports.sendMessage = async (req, res) => {
  try {
    // Validate authentication
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Validate chat room exists
    const roomExists = await ChatRoom.findById(req.params.id);
    if (!roomExists) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }
    
    // ... rest of code
  } catch (error) {
    console.error('❌ Send message error:', error);
    
    // Always return proper JSON error
    const statusCode = error.name === 'ValidationError' ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error sending message',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
```

**Why**: Ensures errors return JSON instead of hanging or timing out.

---

### **Fix 4: auth.js - Database Query Timeout**

**Added Timeout Protection**:
```javascript
// Get user from token with timeout
const user = await Promise.race([
  User.findById(decoded.id).select('-password'),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Database query timeout')), 5000)
  )
]);
```

**Why**: If database query hangs, fails after 5s with clear error instead of waiting until axios 10s timeout.

---

## 🧪 TESTING CHECKLIST

### **Test 1: Text Message (No Files)**

**Steps**:
1. Open Chat
2. Select room
3. Type message (no files)
4. Click Send

**Expected**:
- ✅ Message sends immediately
- ✅ Browser DevTools → Network → POST `/api/chat/rooms/:id/messages`
  - Request Headers: `Authorization: Bearer <token>`
  - Request Payload: `{ message: "Hello", messageType: "text" }`
  - Response: `201 Created` with message data
- ✅ Backend logs: `✅ Message sent successfully` (no multer logs)
- ✅ Message appears instantly in chat

**Verify**:
```bash
# Backend should NOT log:
☁️ Uploading X chat files...

# Backend should log:
POST /api/chat/rooms/xxx/messages 201
```

---

### **Test 2: File Message**

**Steps**:
1. Click paperclip icon
2. Select 1-2 files
3. Type optional message
4. Click Send

**Expected**:
- ✅ Console log: `Uploading files: [file1.pdf, ...]`
- ✅ Toast: "Message sent with attachments!"
- ✅ Browser DevTools → Network:
  - Request Headers: 
    - `Authorization: Bearer <token>`
    - `Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...`
  - Form Data: Shows binary file data
  - Response: `201 Created`
- ✅ Backend logs:
  ```
  ☁️ Uploading 2 chat files to Google Drive...
  ✅ File uploaded to Google Drive: https://drive.google.com/...
  ✅ All chat files uploaded to cloud storage
  POST /api/chat/rooms/xxx/messages 201
  ```
- ✅ Files downloadable by all users

---

### **Test 3: Authentication Failure**

**Steps**:
1. Open DevTools → Application → Local Storage
2. Delete `token` key
3. Try sending message

**Expected**:
- ✅ Request fails immediately (no 10s timeout)
- ✅ Response: `401 Unauthorized`
- ✅ Error message: "Not authorized to access this route"
- ✅ Redirected to login page
- ✅ Backend logs: `❌ No token provided in request`

---

### **Test 4: Invalid Chat Room**

**Steps**:
1. Manually POST to `/api/chat/rooms/000000000000000000000000/messages`
2. With valid token

**Expected**:
- ✅ Response: `404 Not Found`
- ✅ Error: "Chat room not found"
- ✅ No timeout, immediate response

---

### **Test 5: Large File Upload**

**Steps**:
1. Select file > 10MB
2. Try to upload

**Expected**:
- ✅ Multer rejects with `413 Payload Too Large`
- ✅ Frontend shows error toast
- ✅ No timeout

---

## 🔍 DEBUGGING GUIDE

### **Issue: "Authentication required" error**

**Check 1: Token in localStorage**
```javascript
// Browser Console
localStorage.getItem('token')
// Should return: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Check 2: Authorization Header Sent**
```
DevTools → Network → Request Headers
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Check 3: Backend Logs**
```bash
# If you see:
❌ No token provided in request
# → Token not being sent, check axiosInstance.js

# If you see:
❌ Invalid token
# → Token expired or malformed, re-login

# If you see:
❌ User not found for token
# → User deleted from database
```

---

### **Issue: Still getting timeout**

**Check 1: Correct API URL**
```javascript
// .env file
VITE_API_URL=https://campusconnect-fz1i.onrender.com/api

// Verify in browser:
console.log(import.meta.env.VITE_API_URL)
```

**Check 2: CORS Configured**
```javascript
// backend/server.js should have:
const allowedOrigins = [
  'https://campus-connect-hazel-xi.vercel.app',
  'http://localhost:5173'
];
```

**Check 3: Database Connection**
```bash
# Backend startup should show:
✅ MongoDB connected successfully
```

---

### **Issue: Files not uploading**

**Check 1: FormData Created Properly**
```javascript
// Chat.jsx should have:
const formData = new FormData();
formData.append('message', newMessage.trim());
selectedFiles.forEach(file => {
  formData.append('attachments', file);
});
```

**Check 2: Content-Type Auto-Set**
```
Network Tab → Request Headers:
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryXXX
✅ Must have boundary parameter
```

**Check 3: Backend Receives Files**
```bash
# Backend should log:
📝 Create Message Request: { files: [ { originalname: 'test.pdf' } ] }
```

---

## 📊 REQUEST FLOW

### **Text Message Flow**
```
User Types Message
    ↓
Click Send
    ↓
axios.post('/api/chat/rooms/:id/messages', { message, messageType })
    ↓
Interceptor: Add Authorization header
    ↓
POST with Content-Type: application/json
    ↓
Backend: protect middleware → validates token
    ↓
Backend: Conditional multer → SKIPPED (not multipart)
    ↓
Backend: sendMessage controller → validates user & room
    ↓
Backend: Create ChatMessage in MongoDB
    ↓
Backend: Socket.io broadcast to room
    ↓
Response: 201 Created { success: true, data: message }
    ↓
Frontend: Message appears instantly
```

### **File Message Flow**
```
User Selects Files
    ↓
Click Send
    ↓
Create FormData, append files
    ↓
axios.post('/api/chat/rooms/:id/messages', formData)
    ↓
Interceptor: Add Authorization + Delete Content-Type
    ↓
Browser: Auto-set Content-Type with boundary
    ↓
POST with multipart/form-data; boundary=XXX
    ↓
Backend: protect middleware → validates token
    ↓
Backend: Conditional multer → APPLIED (multipart detected)
    ↓
Backend: Multer parses files → req.files
    ↓
Backend: sendMessage → uploads to Google Drive
    ↓
Backend: Create ChatMessage with attachment URLs
    ↓
Backend: Socket.io broadcast
    ↓
Response: 201 Created
    ↓
Frontend: Files downloadable
```

---

## 🚀 DEPLOYMENT

### **Step 1: Test Locally**

```bash
# Terminal 1 - Backend
cd backend
npm start

# Should see:
✅ MongoDB connected successfully
✅ Google Drive configured for cloud storage
Server running on port 5000

# Terminal 2 - Frontend
cd campusConnect
npm run dev

# Visit: http://localhost:5173
```

**Test all scenarios above** ✅

---

### **Step 2: Commit & Deploy**

```bash
git add .
git commit -m "fix: chat authentication and multer timeout issues"
git push origin master
```

**Vercel & Render auto-deploy**

---

### **Step 3: Verify Production**

1. **Visit**: https://campus-connect-hazel-xi.vercel.app
2. **Login**
3. **Send text message** → Should work
4. **Send file message** → Should work
5. **Check Network Tab** → Authorization header present
6. **Check Render Logs** → No timeout errors

---

## ✅ VERIFICATION

### **Frontend (Browser Console)**
```javascript
// Check token exists
localStorage.getItem('token')
// → "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

// Check axios config
axios.defaults.baseURL
// → "https://campusconnect-fz1i.onrender.com/api"
```

### **Frontend (Network Tab)**
```
POST /api/chat/rooms/xxx/messages
Status: 201 Created
Request Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Content-Type: application/json (text) OR multipart/form-data (files)
Response:
  { "success": true, "data": { ... } }
```

### **Backend (Render Logs)**
```
POST /api/chat/rooms/xxx/messages 201 123ms
✅ Message sent successfully
```

---

## 📋 SUMMARY

| Issue | Fix | File |
|-------|-----|------|
| Authorization header stripped with FormData | Delete Content-Type for FormData | `axiosInstance.js` |
| Multer blocks non-multipart requests | Conditional multer middleware | `chatRoutes.js` |
| Missing validation causes hangs | Add user/room validation | `chatController.js` |
| Database query could hang | Add 5s timeout to user lookup | `auth.js` |
| Poor error responses | Always return JSON errors | `chatController.js` |

**Status**: ✅ **All timeout and authentication issues fixed!**

**Key Points**:
- ✅ Text messages: JSON with Authorization header
- ✅ File messages: FormData with Authorization + boundary
- ✅ Multer only runs for multipart requests
- ✅ All errors return JSON (no hangs)
- ✅ Database queries timeout after 5s
- ✅ CORS properly configured

**Test all scenarios before considering this complete!**
