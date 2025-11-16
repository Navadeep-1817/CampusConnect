require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');

// Import configurations and middleware
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { authenticateSocket } = require('./middleware/auth');
const setupSocketIO = require('./socket/socketHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const acknowledgmentRoutes = require('./routes/acknowledgmentRoutes');
const chatRoutes = require('./routes/chatRoutes');

// Initialize express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS and performance optimizations
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  },
  // Performance optimizations
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  upgradeTimeout: 10000,
  pingTimeout: 5000,
  pingInterval: 10000,
  // Enable compression
  perMessageDeflate: {
    threshold: 1024 // Only compress messages larger than 1KB
  },
  httpCompression: {
    threshold: 1024
  },
  // Connection options
  connectTimeout: 10000,
  maxHttpBufferSize: 1e8, // 100 MB for file uploads
  allowEIO3: true
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serve static files (uploads) - Direct file access
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    res.set('Content-Disposition', 'inline');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'public, max-age=31536000');
  }
}));

// Serve static files via /api/uploads for consistent API paths
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    res.set('Content-Disposition', 'inline');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'public, max-age=31536000');
  }
}));

// Secure download endpoint with auth and file validation
app.get('/api/download/:filename', (req, res) => {
  const fs = require('fs');
  const { filename } = req.params;
  
  // Security: Prevent directory traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid filename'
    });
  }
  
  const filePath = path.join(__dirname, 'uploads', filename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: 'File not found'
    });
  }
  
  // Get file stats for proper headers
  const stat = fs.statSync(filePath);
  
  // Send file with proper headers
  res.download(filePath, filename, (err) => {
    if (err) {
      console.error('Error downloading file:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error downloading file'
        });
      }
    }
  });
});

// Alternative: Stream file for large files
app.get('/api/files/:filename', (req, res) => {
  const fs = require('fs');
  const { filename } = req.params;
  
  // Security check
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid filename'
    });
  }
  
  const filePath = path.join(__dirname, 'uploads', filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: 'File not found'
    });
  }
  
  // Stream the file
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
  
  fileStream.on('error', (err) => {
    console.error('Error streaming file:', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error streaming file'
      });
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/acknowledgments', acknowledgmentRoutes);
app.use('/api/chat', chatRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Campus Connect API',
    version: '1.0.0'
  });
});

// Socket.io authentication middleware
io.use(authenticateSocket);

// Setup Socket.io handlers
setupSocketIO(io);

// Make io accessible to routes
app.set('io', io);

// Handle 404 - MUST be after all routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler (must be absolute last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║        🎓 Campus Connect Server Running 🎓           ║
║                                                       ║
║        Port: ${PORT}                                     ║
║        Environment: ${process.env.NODE_ENV || 'development'}                        ║
║        MongoDB: Connected                             ║
║        Socket.io: Active                              ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('❌ Unhandled Rejection! Shutting down...');
  console.error(err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('❌ Uncaught Exception! Shutting down...');
  console.error(err);
  process.exit(1);
});

module.exports = { app, server, io };
