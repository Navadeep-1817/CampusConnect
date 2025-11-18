const AWS = require('aws-sdk');
const path = require('path');

/**
 * Check if S3 is properly configured
 * @returns {boolean}
 */
const isS3Configured = () => {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_BUCKET_NAME
  );
};

// Configure AWS S3 (only if credentials are provided)
let s3 = null;
if (isS3Configured()) {
  s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    signatureVersion: 'v4'
  });
  
  console.log('✅ AWS S3 configured for cloud storage');
  console.log(`   Bucket: ${process.env.AWS_BUCKET_NAME}`);
  console.log(`   Region: ${process.env.AWS_REGION || 'us-east-1'}`);
} else {
  console.log('⚠️  AWS S3 not configured - using local storage (ephemeral on Render!)');
  console.log('   Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_BUCKET_NAME to enable cloud storage');
}

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File buffer from multer memory storage
 * @param {string} fileName - Original file name
 * @param {string} mimeType - File MIME type
 * @returns {Promise<string>} - S3 file URL
 */
const uploadToS3 = async (fileBuffer, fileName, mimeType) => {
  if (!s3) {
    throw new Error('S3 not configured. Set AWS credentials in environment variables.');
  }
  
  // Generate unique file key
  const timestamp = Date.now();
  const randomString = Math.round(Math.random() * 1E9);
  const fileExt = path.extname(fileName);
  const baseName = path.basename(fileName, fileExt);
  const key = `uploads/${timestamp}-${randomString}-${baseName}${fileExt}`;
  
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
    ACL: 'public-read', // Make files publicly accessible
    CacheControl: 'max-age=31536000', // Cache for 1 year
  };
  
  try {
    const result = await s3.upload(params).promise();
    console.log('✅ File uploaded to S3:', result.Location);
    return result.Location; // Returns full S3 URL
  } catch (error) {
    console.error('❌ S3 upload failed:', error.message);
    throw new Error(`Failed to upload to S3: ${error.message}`);
  }
};

/**
 * Delete file from S3
 * @param {string} fileUrl - Full S3 URL or key
 * @returns {Promise<void>}
 */
const deleteFromS3 = async (fileUrl) => {
  if (!s3) {
    throw new Error('S3 not configured');
  }
  
  try {
    // Extract key from URL if full URL is provided
    let key;
    if (fileUrl.startsWith('http')) {
      // URL format: https://bucket.s3.region.amazonaws.com/uploads/filename
      const urlParts = fileUrl.split('.com/');
      key = urlParts[1];
    } else {
      key = fileUrl;
    }
    
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key
    };
    
    await s3.deleteObject(params).promise();
    console.log('✅ File deleted from S3:', key);
  } catch (error) {
    console.error('❌ S3 delete failed:', error.message);
    throw new Error(`Failed to delete from S3: ${error.message}`);
  }
};

/**
 * Get signed URL for temporary secure access
 * Useful for private files that should expire after certain time
 * @param {string} key - S3 object key
 * @param {number} expiresIn - Expiration in seconds (default 1 hour)
 * @returns {string} - Signed URL
 */
const getSignedUrl = (key, expiresIn = 3600) => {
  if (!s3) {
    throw new Error('S3 not configured');
  }
  
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Expires: expiresIn
  };
  
  return s3.getSignedUrl('getObject', params);
};

/**
 * Upload multiple files to S3
 * @param {Array} files - Array of file objects with buffer, originalname, mimetype
 * @returns {Promise<Array>} - Array of S3 URLs
 */
const uploadMultipleToS3 = async (files) => {
  if (!s3) {
    throw new Error('S3 not configured');
  }
  
  const uploadPromises = files.map(file =>
    uploadToS3(file.buffer, file.originalname, file.mimetype)
  );
  
  return Promise.all(uploadPromises);
};

/**
 * Check if file exists in S3
 * @param {string} key - S3 object key
 * @returns {Promise<boolean>}
 */
const fileExistsInS3 = async (key) => {
  if (!s3) {
    return false;
  }
  
  try {
    await s3.headObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key
    }).promise();
    return true;
  } catch (error) {
    if (error.code === 'NotFound') {
      return false;
    }
    throw error;
  }
};

/**
 * List all files in S3 bucket
 * @param {string} prefix - Optional prefix to filter files
 * @param {number} maxKeys - Maximum number of files to return
 * @returns {Promise<Array>} - Array of file objects
 */
const listS3Files = async (prefix = 'uploads/', maxKeys = 1000) => {
  if (!s3) {
    throw new Error('S3 not configured');
  }
  
  try {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: maxKeys
    };
    
    const result = await s3.listObjectsV2(params).promise();
    
    return result.Contents.map(item => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified,
      url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${item.Key}`
    }));
  } catch (error) {
    console.error('❌ S3 list failed:', error.message);
    throw new Error(`Failed to list S3 files: ${error.message}`);
  }
};

/**
 * Get file metadata from S3
 * @param {string} key - S3 object key
 * @returns {Promise<Object>} - File metadata
 */
const getS3FileMetadata = async (key) => {
  if (!s3) {
    throw new Error('S3 not configured');
  }
  
  try {
    const result = await s3.headObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key
    }).promise();
    
    return {
      contentType: result.ContentType,
      contentLength: result.ContentLength,
      lastModified: result.LastModified,
      etag: result.ETag
    };
  } catch (error) {
    console.error('❌ S3 metadata fetch failed:', error.message);
    throw new Error(`Failed to get S3 file metadata: ${error.message}`);
  }
};

module.exports = {
  uploadToS3,
  deleteFromS3,
  getSignedUrl,
  uploadMultipleToS3,
  fileExistsInS3,
  listS3Files,
  getS3FileMetadata,
  isS3Configured,
  s3 // Export S3 instance for advanced usage
};
