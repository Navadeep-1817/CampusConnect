# Production CORS & Google Drive Fix

## Issues Fixed

### 1. ✅ Corrupted GOOGLE_PRIVATE_KEY
**Problem**: Missing `-----BEGIN PRIVATE KEY-----` header in .env file
**Solution**: Added proper PEM format with BEGIN/END markers

### 2. ✅ Google Drive Initialization Validation
**Problem**: Silent failures during auth, causing crashes later
**Solution**: Added private key validation before JWT creation

### 3. ✅ CORS Headers on Errors
**Problem**: Backend crashes before sending CORS headers
**Solution**: Enhanced error middleware that always sets CORS headers

### 4. ✅ Graceful Fallback for File Uploads
**Problem**: Unhandled errors when Google Drive fails
**Solution**: Try/catch blocks with automatic fallback to local storage

## Deployment Steps for Render

### Step 1: Update Environment Variables on Render Dashboard

1. Go to your Render dashboard: https://dashboard.render.com/
2. Select your backend service (`campusconnect-fz1i`)
3. Click **Environment** tab
4. Update the following variables:

#### Critical Fix: GOOGLE_PRIVATE_KEY Format

**IMPORTANT**: Render preserves newlines automatically. Copy the ENTIRE key including markers:

```
-----BEGIN PRIVATE KEY-----
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

**Alternative Method** (if newlines are an issue):
1. Use the `\n` notation in a single line:
```
-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC+6n4O/40NZ5Se\nfPQf4B39oAHvhw0EgnD1LUBR6nxFvybhrjjjLoNZP79vNB8XqEZe0yRXxeF7nlXM\nUZVtPKGRZuwpjDGLr4bcfkE8YWvrM70+lnNaWu+8C0we63JEVkVBOasydfg+3ZDx\neo6rJhXJtlezEu3v10ojhPQAtI71OML7EkzCu7zueRbgu87/tLu6+G1igw7pFQTS\n30YXDNFnTNS57Fz4NVYaaW7WEydDRFBRYMKe9YkF4AYuO47WaUnS6pp5t773rRHB\nIyXDL/bvlXuivfo11Efokf34izo1f4eB0wLNZLvJVh/MYUUxHkRWNEFAPumqaZpP\nkVEHSoulAgMBAAECggEACH5e4gSaiOMifd6UmdUbCyKS6M4lqnKx2yaKkFpnRvnB\nyBPmh1eVaQ4TUpDgupO2SxeyVo6rgRgX5xbQwrhffnGJcNvCLzMS7pJWDVKkPiWM\ny3u0DBa0SGBpoDfcsI+fVc8z/523T/dZhcoXDiQ2n0UT0m1gKpB1xZjE+5cM2SSm\nnBM8uta3i2lFmUeHykOrbLkHqce7TePWMkqWfvAfTSxa4gDnN9e3WFM4VtP3yvaA\nih4mozP2RRjZNWacmGJxwgv+k3BrsedHbEdQqQHu3sLPI310Onu69nLL9mE3oLKE\noAsp1v8cajcy9oyNsLVV1naYK0EjBhoBjQBfYL1XAQKBgQDt3eiFA1IJ8br7lKLT\nYp0CFzoqgEKTcSTLVBU9CviHwqxMQzsyEFTjU7WErpYxB8pM1L5DCzxWRUnliGvo\nKtaqxfz/rGIKWMlwm1gRzL5eFCF8yBaugfROpX81CfoXfS4ecuEQzpyXPS5BbCW9\nezOBZuRlRxgciJ5BVCXphV3a5QKBgQDNeFCMELUHS3VJ/RCbOb+wAWqy5+yf2gAU\nbokcM0Wy66FRf2c4IKks6WwuV7GHm8TdPR92Hzd5T23buxqpxdnnU5nRDfx8x5oj\n5Mjb6r5Jr+cGO4FNZ9em43MJr0aIblFaUSMB347cK5uiSIKR32Lp77aIE9h8ttH2\nlc+F9v0hwQKBgBLKOcjwFzXz43pmJmqeWprErPKYiSnOgUKSlM7qo/FNfoDTusRc\np+gBP9CIXhLnc6KYF6OCKrUB6jF4klWXtLduxmqH+oKoutjrXIyjaNJTssWBpNEK\nMPtZdXACJsBeQhtjpcXHHHWR/qpqWZzbM5lgQGCDujLe0+mDNS96OozFAoGAJXpW\nptW9T3FSGYbRap7j+gSoI63uGVI4RYHL/JrVkcctC6KDf1dlxE1ncCSKu0OMaxZl\nELSs97GnRjcgq+rszicPnXRBo7j8wqNOh96Piv1M1HQyJ55TVZuTNicEZIpKyICY\nNBVFB5/kqXs0ZcsrTaRt1PBZwpXOQn4c9kCQ94ECgYBQtWpHEbpn9kWS33i4eBaI\nt7ZswaeFT3I7hl6tBvRkrDTXed369iZdlFVb0laqe63CBhg28FBLoYDtz/hCkux1\nEjv10wslRpM1pz5uZAiFkmToi5LqifrnxkGR4XN9oWhIGOdO24AuKXlIen8fFjYH\nCLuX6PXDAGjij8JZ2s2IXw==\n-----END PRIVATE KEY-----\n
```

4. Verify other Google Drive variables:
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=zoro-990@campusconnect-478614.iam.gserviceaccount.com
GOOGLE_DRIVE_FOLDER_ID=1qj85IPSTZXakKoXjVOKRFBBAm69xpz_V
```

5. Save changes and trigger a new deployment

### Step 2: Verify Email Configuration (Optional)

If you're seeing email timeout errors, either:

**Option A: Fix Email Settings**
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=your-email@gmail.com
ENABLE_EMAIL_NOTIFICATIONS=true
```

**Option B: Disable Email Notifications**
```
ENABLE_EMAIL_NOTIFICATIONS=false
```

### Step 3: Deploy Code Changes

```powershell
# Commit and push the fixes
git add .
git commit -m "fix: CORS headers, Google Drive validation, graceful error handling"
git push origin main
```

Render will automatically deploy the new code.

### Step 4: Monitor Deployment

1. Watch Render logs for successful startup:
```
✅ Google Drive configured for cloud storage
   Service Account: zoro-990@campusconnect-478614.iam.gserviceaccount.com
   Folder ID: 1qj85IPSTZXakKoXjVOKRFBBAm69xpz_V
```

2. If you see this error, the private key is still wrong:
```
❌ Failed to initialize Google Drive: Invalid private key format: Private key must include -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY----- markers
```

3. Check for CORS errors - should now see proper headers even on errors

## Testing Production

### Test 1: API Health Check
```bash
curl https://campusconnect-fz1i.onrender.com/
# Should return: {"success":true,"message":"Welcome to Campus Connect API",...}
```

### Test 2: Notices Endpoint (with auth)
```bash
curl https://campusconnect-fz1i.onrender.com/api/notices?limit=5 \
  -H "Authorization: Bearer YOUR_TOKEN"
# Should return notices or 401 error WITH CORS headers
```

### Test 3: Frontend CORS
1. Open https://campus-connect-hazel-xi.vercel.app
2. Open browser DevTools → Network tab
3. Refresh page
4. Check notice requests - should see proper CORS headers even on errors:
   - `Access-Control-Allow-Origin: https://campus-connect-hazel-xi.vercel.app`
   - `Access-Control-Allow-Credentials: true`

### Test 4: Google Drive Upload
1. Login to frontend
2. Create a notice with file attachment
3. Check Render logs for:
```
☁️ Uploading 1 files to Google Drive...
✅ All files uploaded to cloud storage
```
4. Check Google Drive folder: https://drive.google.com/drive/folders/1qj85IPSTZXakKoXjVOKRFBBAm69xpz_V

## Troubleshooting

### Issue: Still seeing CORS errors

**Check 1**: Verify Vercel URL is correct
- Frontend should be: `https://campus-connect-hazel-xi.vercel.app`
- Backend allowedOrigins includes this URL (server.js line 64-68)

**Check 2**: Check browser console
- Look for exact error message
- If "401 Unauthorized", authentication is failing (not CORS)
- If "Access-Control-Allow-Origin header is not present", backend crashed before sending headers

**Check 3**: Render logs
```bash
# Look for these patterns:
❌ Unhandled Rejection!  # Backend crash
❌ Failed to initialize Google Drive  # Private key issue
❌ Error caught by middleware  # Expected - error handler working
```

### Issue: Google Drive still failing

**Check 1**: Private key format in Render dashboard
- Must start with `-----BEGIN PRIVATE KEY-----`
- Must end with `-----END PRIVATE KEY-----`
- Can use `\n` between lines OR actual newlines

**Check 2**: Service account permissions
- Go to: https://drive.google.com/drive/folders/1qj85IPSTZXakKoXjVOKRFBBAm69xpz_V
- Right-click folder → Share
- Verify `zoro-990@campusconnect-478614.iam.gserviceaccount.com` has Editor access

**Check 3**: Test locally first
```powershell
cd backend
npm start
# Look for: ✅ Google Drive configured for cloud storage
```

### Issue: Email timeouts

**Quick Fix**: Disable email notifications
```
ENABLE_EMAIL_NOTIFICATIONS=false
```

**Proper Fix**: Use Gmail App Password
1. Enable 2FA on Gmail account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use app password (not your regular password)
4. Set correct SMTP settings:
   - Host: `smtp.gmail.com`
   - Port: `587`
   - TLS: Enabled (default)

## Expected Behavior After Fix

✅ Backend starts without errors
✅ Google Drive authentication succeeds
✅ Frontend can fetch notices (with valid auth)
✅ CORS headers sent even on errors
✅ File uploads to Google Drive work
✅ Graceful fallback to local storage if Google Drive fails
✅ Clear error messages in logs

## Rollback Plan

If issues persist, you can disable Google Drive temporarily:

On Render dashboard, set:
```
GOOGLE_PRIVATE_KEY=
```

Server will start with local storage fallback.

## Support

If problems continue:
1. Check Render logs for specific errors
2. Test endpoints with curl to isolate CORS vs other issues
3. Verify all environment variables are set correctly
4. Try the diagnostic endpoint: https://campusconnect-fz1i.onrender.com/api/diagnostics

---

**Changes Summary**:
- ✅ Fixed `.env` - Added proper private key format
- ✅ Enhanced `googleDriveService.js` - Added validation and better error messages
- ✅ Updated `server.js` - CORS headers guaranteed on all errors
- ✅ Updated `chatController.js` - Graceful fallback for cloud storage failures
- ✅ Updated `noticeController.js` - Graceful fallback for cloud storage failures
