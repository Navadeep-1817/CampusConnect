# ✅ Production Deployment Checklist

## 🔧 Backend (Render) - Required Actions

### Environment Variables to Set
```
✅ MONGODB_URI=your_mongodb_connection_string
✅ JWT_SECRET=your_secret_key
✅ CLIENT_URL=https://campus-connect-hazel-xi.vercel.app
✅ FRONTEND_URL=https://campus-connect-hazel-xi.vercel.app
✅ NODE_ENV=production
✅ PORT=5000
```

### After Setting Env Vars
- [ ] Save changes on Render dashboard
- [ ] Wait for service to restart (auto)
- [ ] Check logs for successful startup
- [ ] Test health endpoint: `https://campusconnect-fz1i.onrender.com/api/health`

---

## 🌐 Frontend (Vercel) - Required Actions

### Environment Variables to Set
```
✅ VITE_API_URL=https://campusconnect-fz1i.onrender.com/api
✅ VITE_SOCKET_URL=https://campusconnect-fz1i.onrender.com
✅ VITE_BASE_URL=https://campusconnect-fz1i.onrender.com
```

### After Setting Env Vars
- [ ] Trigger new deployment (required!)
- [ ] Wait for build to complete
- [ ] Visit: https://campus-connect-hazel-xi.vercel.app
- [ ] Check browser console for errors

---

## 🧪 Quick Test Script

Open browser console on https://campus-connect-hazel-xi.vercel.app and run:

```javascript
// Test 1: Check environment variables
console.log('API URL:', import.meta.env.VITE_API_URL);
console.log('Socket URL:', import.meta.env.VITE_SOCKET_URL);

// Test 2: Test API connection
fetch('https://campusconnect-fz1i.onrender.com/api/health')
  .then(r => r.json())
  .then(d => console.log('✅ Backend health:', d))
  .catch(e => console.error('❌ Backend error:', e));

// Test 3: Check CORS
fetch('https://campusconnect-fz1i.onrender.com/api/health', {
  credentials: 'include'
})
  .then(() => console.log('✅ CORS working'))
  .catch(e => console.error('❌ CORS error:', e));
```

---

## 📋 Manual Testing

1. **Login Test**
   - [ ] Go to login page
   - [ ] Enter credentials
   - [ ] Should redirect to dashboard
   - [ ] Check localStorage for token

2. **File Upload Test**
   - [ ] Create a new notice with attachment
   - [ ] Verify file uploads successfully
   - [ ] Check URL format: `/api/uploads/filename`

3. **File Download Test**
   - [ ] Click download button on any attachment
   - [ ] File should download instantly
   - [ ] No CORS errors in console
   - [ ] URL should be: `https://campusconnect-fz1i.onrender.com/api/uploads/filename`

4. **WebSocket Test**
   - [ ] Open chat
   - [ ] Send a message
   - [ ] Should appear instantly
   - [ ] Check console for socket connection: "Socket connected"

---

## 🚨 Common Issues

### Issue: "CORS Error"
**Fix:** Set `CLIENT_URL` on Render to `https://campus-connect-hazel-xi.vercel.app`

### Issue: "Environment variables not working"
**Fix:** Redeploy Vercel after setting env vars

### Issue: "File downloads return 404"
**Fix:** Check backend logs, ensure uploads directory exists

### Issue: "Socket.io not connecting"
**Fix:** Verify `VITE_SOCKET_URL` is set correctly

---

## ✅ Deployment Complete When:

- [x] Backend CORS updated (server.js)
- [x] Socket.io CORS updated (server.js)
- [x] Frontend .env updated
- [x] Vercel config updated (vercel.json)
- [x] .env.production created
- [ ] Backend env vars set on Render
- [ ] Frontend env vars set on Vercel
- [ ] Both services redeployed
- [ ] All tests passing
- [ ] No console errors

---

**Next Steps:**
1. Set environment variables on Render
2. Set environment variables on Vercel
3. Redeploy both services
4. Run tests above
5. Done! 🎉
