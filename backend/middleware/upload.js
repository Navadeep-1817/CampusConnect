const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { isCloudStorageConfigured } = require('../services/fileStorage');

// Ensure uploads directory exists (for local fallback)
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage based on cloud storage availability
let storage;
if (isCloudStorageConfigured()) {
  // Use memory storage for cloud uploads (Google Drive or S3)
  console.log('📁 Using memory storage for cloud file uploads');
  storage = multer.memoryStorage();
} else {
  // Use disk storage for local development
  console.log('📁 Using disk storage for local file uploads');
  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
}

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,jpg,jpeg,png,gif').split(',');
  const ext = path.extname(file.originalname).toLowerCase().substring(1);
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type .${ext} is not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || 10485760) // Default 10MB
  },
  fileFilter: fileFilter
});

module.exports = upload;
