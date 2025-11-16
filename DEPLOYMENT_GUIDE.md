# 🚀 Production Deployment Guide - CampusConnect

**Frontend:** https://campus-connect-hazel-xi.vercel.app  
**Backend:** https://campusconnect-fz1i.onrender.com  
**Date:** November 16, 2025

---

## ✅ Changes Made for Production

### 1. Backend (Render) Configuration

#### CORS Setup
- ✅ Updated to accept requests from Vercel frontend
- ✅ Added multiple origin support
- ✅ Enabled credentials for authentication
- ✅ Configured Socket.io CORS for WebSocket connections

#### File Downloads
- ✅ Static file serving at `/uploads` and `/api/uploads`
- ✅ Secure download endpoint `/api/download/:filename`
- ✅ CORS headers set to allow all origins for files
- ✅ Cache headers for optimal performance

### 2. Frontend (Vercel) Configuration

#### Environment Variables
- ✅ `VITE_API_URL` - API endpoint with `/api` prefix
- ✅ `VITE_SOCKET_URL` - WebSocket connection URL
- ✅ `VITE_BASE_URL` - Base URL for file downloads

#### Build Configuration
- ✅ Updated `vercel.json` with proper routes
- ✅ Added environment variables for build
- ✅ Configured security headers

---

## 🔧 Backend Setup on Render

### Required Environment Variables

Set these in your Render dashboard (https://dashboard.render.com):

```env
# MongoDB
MONGODB_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRE=7d

# Client URLs (CRITICAL)
CLIENT_URL=https://campus-connect-hazel-xi.vercel.app
FRONTEND_URL=https://campus-connect-hazel-xi.vercel.app

# Server
PORT=5000
NODE_ENV=production

# Email (Optional - for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM_NAME=Campus Connect
ENABLE_EMAIL_NOTIFICATIONS=true

# Cron Jobs (Optional)
ENABLE_CRON_JOBS=true
ENABLE_DAILY_DIGEST=true
ENABLE_WEEKLY_DIGEST=true
ENABLE_ACK_REMINDERS=true

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,doc,docx,txt,xls,xlsx,ppt,pptx,jpg,jpeg,png,gif,webp
```

### Build Configuration on Render

**Build Command:**
```bash
npm install
```

**Start Command:**
```bash
node server.js
```

**Auto-Deploy:** Enable for `master` branch

---

## 🌐 Frontend Setup on Vercel

### Deploy via Vercel CLI

```bash
cd campusConnect
npm install -g vercel
vercel --prod
```

### Or Deploy via Git

1. Connect your GitHub repository to Vercel
2. Set root directory to: `campusConnect`
3. Framework preset: Vite
4. Build command: `npm run build`
5. Output directory: `dist`

### Environment Variables on Vercel

Set these in Vercel dashboard → Settings → Environment Variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_API_URL` | `https://campusconnect-fz1i.onrender.com/api` | Production |
| `VITE_SOCKET_URL` | `https://campusconnect-fz1i.onrender.com` | Production |
| `VITE_BASE_URL` | `https://campusconnect-fz1i.onrender.com` | Production |

**Important:** After adding environment variables, redeploy your application!

---

## 🧪 Testing Checklist

### Backend Health Check
```bash
curl https://campusconnect-fz1i.onrender.com/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-11-16T..."
}
```

### Frontend Tests

1. **Authentication**
   - [ ] Login with valid credentials
   - [ ] Register new user
   - [ ] JWT token stored in localStorage
   - [ ] Auto-redirect on 401 errors

2. **File Downloads**
   - [ ] Download PDF from Notice Detail page
   - [ ] Download DOCX from Chat
   - [ ] View images inline
   - [ ] Test URL format: `https://campusconnect-fz1i.onrender.com/api/uploads/filename`

3. **Real-Time Features**
   - [ ] WebSocket connection established
   - [ ] Chat messages send/receive instantly
   - [ ] Notice updates appear in real-time
   - [ ] Check browser console for Socket.io connection

4. **CORS Validation**
   - [ ] No CORS errors in browser console
   - [ ] API calls return data (not blocked)
   - [ ] File downloads don't trigger CORS errors

---

## 🔍 Common Issues & Solutions

### Issue 1: CORS Errors

**Symptom:** "Access to fetch at '...' has been blocked by CORS policy"

**Solution:**
1. Verify `CLIENT_URL` is set correctly on Render:
   ```
   CLIENT_URL=https://campus-connect-hazel-xi.vercel.app
   ```
2. Restart Render service after changing env vars
3. Clear browser cache and hard reload (Ctrl+Shift+R)

### Issue 2: File Downloads Return 404

**Symptom:** Downloads fail with "Route not found"

**Solution:**
1. Check file URL format in database (should be `/api/uploads/filename`)
2. Verify uploads directory exists on Render
3. Test direct URL: `https://campusconnect-fz1i.onrender.com/api/uploads/filename`

### Issue 3: Socket.io Not Connecting

**Symptom:** Real-time features not working, console shows connection errors

**Solution:**
1. Verify `VITE_SOCKET_URL` is set in Vercel env vars
2. Check browser console for WebSocket errors
3. Ensure Socket.io CORS allows your Vercel domain
4. Test with: `https://campusconnect-fz1i.onrender.com/socket.io/socket.io.js`

### Issue 4: Environment Variables Not Working

**Symptom:** Default localhost URLs are being used

**Solution:**
1. Rebuild and redeploy on Vercel after adding env vars
2. Check Vercel deployment logs for env var values
3. Use Vercel CLI: `vercel env ls` to list variables
4. Clear browser cache after redeployment

### Issue 5: MongoDB Connection Fails

**Symptom:** Backend crashes on startup, "MongoDB connection error"

**Solution:**
1. Verify `MONGODB_URI` is correct on Render
2. Check MongoDB Atlas network access (allow 0.0.0.0/0)
3. Verify MongoDB username/password are correct
4. Check Render logs: `https://dashboard.render.com/web/[service]/logs`

---

## 📊 Performance Optimization

### Backend (Render)

1. **Enable Compression**
   - ✅ Already configured in `server.js`
   - Reduces response size by ~70%

2. **Cache Headers**
   - ✅ Set on static files (1 year cache)
   - Browser caches files for faster loading

3. **Database Indexing**
   - Add indexes to frequently queried fields
   - Example: `noticeId`, `userId`, `departmentId`

### Frontend (Vercel)

1. **Lazy Loading**
   - Consider code-splitting large components
   - Load routes on-demand with React.lazy()

2. **Image Optimization**
   - Compress images before upload
   - Use WebP format when possible

3. **Bundle Analysis**
   ```bash
   npm run build -- --mode=analyze
   ```

---

## 🔒 Security Checklist

### Backend Security

- [x] Helmet.js enabled (security headers)
- [x] CORS configured correctly
- [x] JWT tokens for authentication
- [x] Password hashing with bcrypt
- [x] File upload validation
- [x] Directory traversal protection
- [ ] Rate limiting (TODO: Add express-rate-limit)
- [ ] Input sanitization (TODO: Add express-validator)

### Frontend Security

- [x] Environment variables for sensitive data
- [x] Token stored in localStorage (consider httpOnly cookies)
- [x] Auto-logout on 401 errors
- [x] HTTPS enforced on production
- [ ] Content Security Policy headers
- [ ] XSS protection in user inputs

---

## 📝 Deployment Commands

### Quick Redeploy

**Backend (Render):**
- Automatic on git push to `master`
- Manual: Click "Deploy Latest Commit" in Render dashboard

**Frontend (Vercel):**
```bash
cd campusConnect
vercel --prod
```

Or automatic on git push if connected to GitHub.

### Update Environment Variables

**Render:**
1. Dashboard → Your Service → Environment
2. Add/Edit variables
3. Click "Save Changes"
4. Service will auto-restart

**Vercel:**
```bash
vercel env add VARIABLE_NAME production
# Then redeploy
vercel --prod
```

### View Logs

**Render:**
```
https://dashboard.render.com/web/[service-id]/logs
```

**Vercel:**
```bash
vercel logs [deployment-url]
```

---

## 🎯 Final Verification

Run this checklist before marking deployment as complete:

### Backend Verification
```bash
# Health check
curl https://campusconnect-fz1i.onrender.com/api/health

# Test auth endpoint
curl -X POST https://campusconnect-fz1i.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Test file download
curl -I https://campusconnect-fz1i.onrender.com/api/uploads/test.pdf
```

### Frontend Verification
1. Open: https://campus-connect-hazel-xi.vercel.app
2. Check browser console (no errors)
3. Test login flow
4. Upload and download a file
5. Send a chat message
6. Create a notice

---

## 🆘 Support

### Render Support
- Docs: https://render.com/docs
- Status: https://status.render.com
- Dashboard: https://dashboard.render.com

### Vercel Support
- Docs: https://vercel.com/docs
- Status: https://www.vercel-status.com
- Dashboard: https://vercel.com/dashboard

### MongoDB Atlas
- Docs: https://www.mongodb.com/docs/atlas
- Dashboard: https://cloud.mongodb.com

---

## 🎉 Success Criteria

✅ **Deployment is successful when:**

1. Frontend loads at https://campus-connect-hazel-xi.vercel.app
2. Backend API responds at https://campusconnect-fz1i.onrender.com/api
3. No CORS errors in browser console
4. Login/authentication works
5. File uploads work
6. File downloads work
7. WebSocket connects for real-time features
8. All dashboards load correctly
9. No 404 errors on page refresh
10. Mobile responsive design works

---

**Last Updated:** November 16, 2025  
**Status:** ✅ Ready for Production  
**Deployed By:** GitHub Copilot Assistant
