# Google Drive API Setup Guide

Complete guide to configure Google Drive as persistent cloud storage for CampusConnect file uploads.

## 📋 Why Google Drive?

✅ **15GB Free Storage** - More than enough for college notice board files  
✅ **Persistent** - Files survive Render restarts/deployments  
✅ **No Costs** - Unlike AWS S3 ($1-5/month), Google Drive is completely free  
✅ **Simple Setup** - Service account authentication, no complex IAM policies  
✅ **Public Downloads** - Generate shareable download links automatically  

---

## 🚀 Setup Steps

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter project details:
   - **Project Name**: `CampusConnect Storage` (or any name you prefer)
   - **Organization**: Leave as "No organization" (unless you have one)
   - **Location**: Leave default
4. Click **Create**
5. Wait for project creation (usually takes 10-30 seconds)
6. Select your new project from the dropdown

### Step 2: Enable Google Drive API

1. In the Google Cloud Console, open the navigation menu (☰)
2. Go to **APIs & Services** → **Library**
3. Search for "**Google Drive API**"
4. Click on **Google Drive API** in the results
5. Click **Enable** button
6. Wait for API to be enabled (takes a few seconds)

### Step 3: Create Service Account

A service account is like a robot user that your backend will use to access Google Drive.

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **Service Account**
3. Fill in service account details:
   - **Service account name**: `campusconnect-storage`
   - **Service account ID**: Auto-generated (e.g., `campusconnect-storage@project-id.iam.gserviceaccount.com`)
   - **Description**: "Service account for CampusConnect file storage"
4. Click **Create and Continue**
5. Skip role assignment (click **Continue**)
6. Skip granting user access (click **Done**)

### Step 4: Generate Service Account Key (JSON)

1. In the **Credentials** page, find your new service account in the **Service Accounts** section
2. Click on the service account email (e.g., `campusconnect-storage@...`)
3. Go to the **Keys** tab
4. Click **Add Key** → **Create new key**
5. Select **JSON** format
6. Click **Create**
7. A JSON file will be downloaded automatically - **SAVE THIS FILE SECURELY!**

**⚠️ IMPORTANT**: This JSON file contains your private key. Anyone with this file can access your Google Drive. Do NOT commit it to git!

### Step 5: Create Folder in Your Personal Google Drive

Now you need to create a folder in your personal Google Drive where files will be stored.

1. Go to [Google Drive](https://drive.google.com/)
2. Click **+ New** → **New folder**
3. Name it: `CampusConnect Uploads` (or any name you prefer)
4. Click **Create**
5. Right-click on the new folder → **Share**
6. In the "Add people and groups" field, paste your **service account email** from Step 3
   - Example: `campusconnect-storage@project-id.iam.gserviceaccount.com`
7. Change permission to **Editor** (so it can upload files)
8. **Uncheck** "Notify people" (service accounts don't have email)
9. Click **Share**

### Step 6: Get Folder ID

1. Open the folder you just created in Google Drive
2. Look at the URL in your browser address bar:
   ```
   https://drive.google.com/drive/folders/1A2B3C4D5E6F7G8H9I0JKLMNOPQR
                                          ^^^^^^^^^^^^^^^^^^^^^^^^^
                                          This is your Folder ID
   ```
3. Copy the Folder ID (the long string after `/folders/`)

---

## 🔑 Extract Environment Variables

Open the downloaded JSON file (from Step 4) in a text editor. It looks like this:

```json
{
  "type": "service_account",
  "project_id": "campusconnect-storage-123456",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBAD...\n-----END PRIVATE KEY-----\n",
  "client_email": "campusconnect-storage@project-id.iam.gserviceaccount.com",
  ...
}
```

Extract the following values:

### 1. GOOGLE_SERVICE_ACCOUNT_EMAIL
Copy the value of `client_email`:
```
campusconnect-storage@project-id.iam.gserviceaccount.com
```

### 2. GOOGLE_PRIVATE_KEY
Copy the **entire** value of `private_key`, including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`:

```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
(many lines)
...xyz123
-----END PRIVATE KEY-----
```

**⚠️ IMPORTANT**: 
- Keep the `\n` characters (newlines) as-is
- In Render, you'll paste this directly with all newlines preserved
- Do NOT remove or modify anything

### 3. GOOGLE_DRIVE_FOLDER_ID
Use the Folder ID you copied in Step 6:
```
1A2B3C4D5E6F7G8H9I0JKLMNOPQR
```

---

## 🖥️ Add Environment Variables to Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select your **campusconnect-backend** service
3. Go to **Environment** tab
4. Click **Add Environment Variable** for each of the following:

### Variable 1: GOOGLE_SERVICE_ACCOUNT_EMAIL
```
Key: GOOGLE_SERVICE_ACCOUNT_EMAIL
Value: campusconnect-storage@project-id.iam.gserviceaccount.com
```

### Variable 2: GOOGLE_PRIVATE_KEY
```
Key: GOOGLE_PRIVATE_KEY
Value: -----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
(paste the entire private key with all lines)
...xyz123
-----END PRIVATE KEY-----
```

**⚠️ CRITICAL**: 
- Paste the private key exactly as it appears in the JSON file
- Include `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- Render will preserve the newlines automatically
- Do NOT add quotes around it

### Variable 3: GOOGLE_DRIVE_FOLDER_ID
```
Key: GOOGLE_DRIVE_FOLDER_ID
Value: 1A2B3C4D5E6F7G8H9I0JKLMNOPQR
```

5. Click **Save Changes**
6. Render will automatically restart your service with the new environment variables

---

## ✅ Verify Setup

### Test Locally First (Optional but Recommended)

1. Create a `.env` file in your `backend` directory:
```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=campusconnect-storage@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBAD...\n-----END PRIVATE KEY-----\n
GOOGLE_DRIVE_FOLDER_ID=1A2B3C4D5E6F7G8H9I0JKLMNOPQR
```

2. Install googleapis package:
```bash
cd backend
npm install googleapis
```

3. Start your backend server:
```bash
npm run dev
```

4. Check the startup logs. You should see:
```
✅ Google Drive configured for cloud storage
   Service Account: campusconnect-storage@project-id.iam.gserviceaccount.com
   Folder ID: 1A2B3C4D5E6F7G8H9I0JKLMNOPQR
🚀 Using Google Drive for file storage (15GB free)
```

### Test on Production (Render)

1. Wait for Render to finish restarting (2-3 minutes)

2. Open this URL in your browser:
```
https://campusconnect-fz1i.onrender.com/api/diagnostics/storage-status
```

3. You should see:
```json
{
  "success": true,
  "storageType": "Google Drive (Cloud Storage)",
  "recommendation": "✅ Using Google Drive - files persist across restarts (15GB free)",
  "googleDrive": {
    "configured": true,
    "serviceAccount": "campusconnect-storage@...",
    "folderId": "1A2B3C4D5E6F7G8H9I0JKLMNOPQR",
    "quota": {
      "limitMB": 15360,
      "usageMB": 125,
      "availableMB": 15235,
      "usagePercent": 1
    }
  }
}
```

### Test File Upload

1. Go to your production app: https://campus-connect-hazel-xi.vercel.app
2. Login as Faculty or Admin
3. Create a new notice with a file attachment (PDF, image, etc.)
4. Click **Submit**
5. Check the notice detail page - the file should be downloadable
6. Go to your Google Drive folder - you should see the uploaded file!

### Test Persistence (Most Important!)

1. Upload a file through the app
2. Download it to verify it works
3. Go to Render dashboard → **Manual Deploy** → **Clear build cache & deploy**
4. Wait for deployment to complete (this simulates a restart)
5. Try downloading the same file again
6. **SUCCESS**: If file still downloads, Google Drive integration is working! 🎉

---

## 🔍 Troubleshooting

### Error: "Google Drive not configured"

**Cause**: Environment variables not set correctly on Render

**Solution**:
1. Check all three environment variables are added to Render
2. Make sure there are no extra spaces in the values
3. Verify the private key includes `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
4. Restart the Render service manually

### Error: "Failed to upload to Google Drive: invalid_grant"

**Cause**: Private key is malformed or incorrect

**Solution**:
1. Re-download the JSON key file from Google Cloud Console
2. Copy the `private_key` value exactly as-is (with `\n` characters)
3. Update `GOOGLE_PRIVATE_KEY` on Render
4. Make sure you didn't accidentally add quotes around the key

### Error: "Failed to upload to Google Drive: insufficientPermissions"

**Cause**: Service account doesn't have access to the folder

**Solution**:
1. Go to your Google Drive folder
2. Right-click → **Share**
3. Make sure the service account email is listed with **Editor** permission
4. If not, add it again and click **Share**

### Error: "Failed to upload to Google Drive: notFound"

**Cause**: Folder ID is incorrect

**Solution**:
1. Open your Google Drive folder
2. Copy the Folder ID from the URL again
3. Update `GOOGLE_DRIVE_FOLDER_ID` on Render
4. Make sure you copied the correct part (after `/folders/`)

### Files upload but can't be downloaded

**Cause**: Files not set to public

**Solution**:
- The code automatically makes files public with `role: 'reader', type: 'anyone'`
- Check the file in Google Drive → Right-click → **Share** → "Anyone with the link" should be "Viewer"
- If not, the service account may not have permission to change sharing settings
- Try re-sharing the folder with the service account as **Editor** (not Viewer)

### Storage quota shows 0MB or error

**Cause**: Service account can't access quota API

**Solution**:
- This is cosmetic - file uploads will still work
- Quota API requires additional permissions
- You can ignore this error or grant the service account "Storage Admin" role in Google Cloud Console

---

## 📊 Monitoring Storage Usage

### Check Storage in Real-Time

Visit the diagnostic endpoint:
```
https://campusconnect-fz1i.onrender.com/api/diagnostics/storage-status
```

You'll see:
- Total storage limit (15GB = 15360MB)
- Current usage
- Available space
- Recent uploaded files

### Check Files in Google Drive

1. Go to [Google Drive](https://drive.google.com/)
2. Open your `CampusConnect Uploads` folder
3. You'll see all uploaded files with their original names
4. You can manually download, delete, or organize files here

### When to Upgrade

Google Drive free tier provides **15GB** of storage shared across:
- Gmail
- Google Drive
- Google Photos

If you're using Google Drive heavily for personal files, you might need to:
- Delete old notice attachments manually
- Upgrade to Google One ($1.99/month for 100GB)
- Consider AWS S3 instead (pay per use)

---

## 🔐 Security Best Practices

### Protect Your Service Account Key

❌ **NEVER**:
- Commit the JSON key file to git
- Share the key in chat/email
- Store the key in your codebase
- Push the key to GitHub

✅ **ALWAYS**:
- Keep the JSON file in a secure location (password manager)
- Use environment variables on Render
- Add `*.json` to `.gitignore`
- Regenerate key if compromised

### Compromised Key Recovery

If your service account key is exposed:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. Click on your service account
4. Go to **Keys** tab
5. Find the compromised key and click **Delete**
6. Create a new key (Step 4 of setup)
7. Update `GOOGLE_PRIVATE_KEY` on Render with the new key

### Folder Access Control

Your Google Drive folder should be:
- Shared ONLY with the service account email
- NOT shared with "Anyone with the link" (this would expose all files)
- Not publicly accessible

The code handles making individual files public after upload.

---

## 🎯 What's Next?

After Google Drive is working:

1. ✅ **Test thoroughly** - Upload various file types (PDF, images, docs)
2. ✅ **Monitor storage** - Check diagnostic endpoint regularly
3. ✅ **Fix email notifications** - Follow QUICK_FIX_GUIDE.md to enable emails
4. ✅ **Revoke old credentials** - Follow SECURITY_ALERT.md to secure exposed passwords
5. ✅ **Set up monitoring** - Consider Sentry or LogRocket for production errors

---

## 📚 Additional Resources

- [Google Drive API Documentation](https://developers.google.com/drive/api/v3/about-sdk)
- [Service Account Authentication](https://cloud.google.com/iam/docs/service-accounts)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Render Documentation](https://render.com/docs)

---

## 🆘 Need Help?

If you encounter issues not covered in this guide:

1. Check Render logs: Dashboard → Service → **Logs** tab
2. Check browser console for frontend errors
3. Test the diagnostic endpoint: `/api/diagnostics/storage-status`
4. Verify environment variables are set correctly
5. Make sure googleapis package is installed: `npm list googleapis`

Common startup log messages:

✅ **Success**:
```
✅ Google Drive configured for cloud storage
🚀 Using Google Drive for file storage (15GB free)
```

❌ **Not Configured**:
```
⚠️ Google Drive not configured - using local/S3 storage
   Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_DRIVE_FOLDER_ID to enable
```

❌ **Configuration Error**:
```
❌ Failed to initialize Google Drive: Error message here
```

---

**Last Updated**: November 18, 2024  
**Version**: 1.0  
**Author**: GitHub Copilot
