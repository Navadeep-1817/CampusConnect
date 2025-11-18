const { google } = require('googleapis');
const stream = require('stream');

/**
 * Check if Google Drive is properly configured
 * @returns {boolean}
 */
const isGoogleDriveConfigured = () => {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_DRIVE_FOLDER_ID
  );
};

// Initialize Google Drive API
let drive = null;
let auth = null;

if (isGoogleDriveConfigured()) {
  try {
    // Parse the private key (handle escaped newlines from environment variables)
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    
    // Create JWT auth client
    auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
    
    // Initialize Drive API
    drive = google.drive({ version: 'v3', auth });
    
    console.log('✅ Google Drive configured for cloud storage');
    console.log(`   Service Account: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`);
    console.log(`   Folder ID: ${process.env.GOOGLE_DRIVE_FOLDER_ID}`);
  } catch (error) {
    console.error('❌ Failed to initialize Google Drive:', error.message);
    drive = null;
  }
} else {
  console.log('⚠️  Google Drive not configured - using local/S3 storage');
  console.log('   Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_DRIVE_FOLDER_ID to enable');
}

/**
 * Upload file to Google Drive
 * @param {Buffer} fileBuffer - File buffer from multer memory storage
 * @param {string} fileName - Original file name
 * @param {string} mimeType - File MIME type
 * @returns {Promise<string>} - Public Google Drive URL
 */
const uploadToGoogleDrive = async (fileBuffer, fileName, mimeType) => {
  if (!drive) {
    throw new Error('Google Drive not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_DRIVE_FOLDER_ID.');
  }
  
  try {
    // Generate unique file name to avoid conflicts
    const timestamp = Date.now();
    const randomString = Math.round(Math.random() * 1E9);
    const uniqueFileName = `${timestamp}-${randomString}-${fileName}`;
    
    // Create readable stream from buffer
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileBuffer);
    
    // Upload file to Google Drive
    const fileMetadata = {
      name: uniqueFileName,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
    };
    
    const media = {
      mimeType: mimeType,
      body: bufferStream,
    };
    
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink',
    });
    
    const fileId = response.data.id;
    
    // Make file publicly accessible
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
    
    // Get the public URL
    const publicUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    
    console.log('✅ File uploaded to Google Drive:', publicUrl);
    console.log(`   File ID: ${fileId}`);
    console.log(`   File Name: ${uniqueFileName}`);
    
    return publicUrl;
  } catch (error) {
    console.error('❌ Google Drive upload failed:', error.message);
    throw new Error(`Failed to upload to Google Drive: ${error.message}`);
  }
};

/**
 * Delete file from Google Drive
 * @param {string} fileUrl - Google Drive URL or file ID
 * @returns {Promise<void>}
 */
const deleteFromGoogleDrive = async (fileUrl) => {
  if (!drive) {
    throw new Error('Google Drive not configured');
  }
  
  try {
    // Extract file ID from URL
    let fileId;
    if (fileUrl.includes('drive.google.com')) {
      // URL format: https://drive.google.com/uc?export=download&id=FILE_ID
      const match = fileUrl.match(/[?&]id=([^&]+)/);
      if (match) {
        fileId = match[1];
      } else {
        throw new Error('Could not extract file ID from URL');
      }
    } else {
      // Assume it's already a file ID
      fileId = fileUrl;
    }
    
    await drive.files.delete({
      fileId: fileId,
    });
    
    console.log('✅ File deleted from Google Drive:', fileId);
  } catch (error) {
    console.error('❌ Google Drive delete failed:', error.message);
    throw new Error(`Failed to delete from Google Drive: ${error.message}`);
  }
};

/**
 * Get public URL for a file (if you have the file ID)
 * @param {string} fileId - Google Drive file ID
 * @returns {string} - Public download URL
 */
const getPublicUrl = (fileId) => {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
};

/**
 * Get file metadata from Google Drive
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<Object>} - File metadata
 */
const getFileMetadata = async (fileId) => {
  if (!drive) {
    throw new Error('Google Drive not configured');
  }
  
  try {
    const response = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink',
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Google Drive metadata fetch failed:', error.message);
    throw new Error(`Failed to get file metadata: ${error.message}`);
  }
};

/**
 * List files in the configured folder
 * @param {number} maxResults - Maximum number of files to return (default 100)
 * @returns {Promise<Array>} - Array of file objects
 */
const listFiles = async (maxResults = 100) => {
  if (!drive) {
    throw new Error('Google Drive not configured');
  }
  
  try {
    const response = await drive.files.list({
      q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, size, createdTime, webViewLink)',
      pageSize: maxResults,
      orderBy: 'createdTime desc',
    });
    
    return response.data.files.map(file => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      createdTime: file.createdTime,
      url: getPublicUrl(file.id),
      webViewLink: file.webViewLink,
    }));
  } catch (error) {
    console.error('❌ Google Drive list failed:', error.message);
    throw new Error(`Failed to list files: ${error.message}`);
  }
};

/**
 * Check if file exists in Google Drive
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<boolean>}
 */
const fileExists = async (fileId) => {
  if (!drive) {
    return false;
  }
  
  try {
    await drive.files.get({
      fileId: fileId,
      fields: 'id',
    });
    return true;
  } catch (error) {
    if (error.code === 404) {
      return false;
    }
    throw error;
  }
};

/**
 * Upload multiple files to Google Drive
 * @param {Array} files - Array of file objects with buffer, originalname, mimetype
 * @returns {Promise<Array>} - Array of Google Drive URLs
 */
const uploadMultipleToGoogleDrive = async (files) => {
  if (!drive) {
    throw new Error('Google Drive not configured');
  }
  
  const uploadPromises = files.map(file =>
    uploadToGoogleDrive(file.buffer, file.originalname, file.mimetype)
  );
  
  return Promise.all(uploadPromises);
};

/**
 * Get storage quota information
 * @returns {Promise<Object>} - Storage quota details
 */
const getStorageQuota = async () => {
  if (!drive) {
    throw new Error('Google Drive not configured');
  }
  
  try {
    const response = await drive.about.get({
      fields: 'storageQuota',
    });
    
    const quota = response.data.storageQuota;
    
    return {
      limit: quota.limit,
      usage: quota.usage,
      usageInDrive: quota.usageInDrive,
      usageInDriveTrash: quota.usageInDriveTrash,
      limitMB: Math.round(quota.limit / (1024 * 1024)),
      usageMB: Math.round(quota.usage / (1024 * 1024)),
      availableMB: Math.round((quota.limit - quota.usage) / (1024 * 1024)),
      usagePercent: Math.round((quota.usage / quota.limit) * 100),
    };
  } catch (error) {
    console.error('❌ Failed to get storage quota:', error.message);
    throw new Error(`Failed to get storage quota: ${error.message}`);
  }
};

/**
 * Extract file ID from Google Drive URL
 * @param {string} url - Google Drive URL
 * @returns {string|null} - File ID or null if not found
 */
const extractFileIdFromUrl = (url) => {
  if (!url) return null;
  
  // Handle different Google Drive URL formats
  const patterns = [
    /[?&]id=([^&]+)/,                    // uc?export=download&id=FILE_ID
    /\/file\/d\/([^\/]+)/,               // /file/d/FILE_ID/view
    /\/open\?id=([^&]+)/,                // /open?id=FILE_ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  // If no pattern matches, might already be a file ID
  if (url.length === 33 || url.length === 44) {
    return url;
  }
  
  return null;
};

module.exports = {
  uploadToGoogleDrive,
  deleteFromGoogleDrive,
  getPublicUrl,
  getFileMetadata,
  listFiles,
  fileExists,
  uploadMultipleToGoogleDrive,
  getStorageQuota,
  extractFileIdFromUrl,
  isGoogleDriveConfigured,
  drive, // Export drive instance for advanced usage
};
