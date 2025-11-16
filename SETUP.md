# Campus Connect - Quick Setup Guide

## 🚀 Quick Start (5 Minutes)

### Step 1: Install MongoDB
```bash
# Windows - Download and install from mongodb.com
# Mac
brew install mongodb-community

# Linux
sudo apt-get install mongodb

# Start MongoDB
mongod
```

### Step 2: Backend Setup
```bash
# Navigate to backend folder
cd backend

# Install dependencies (already done)
npm install

# Start the server
npm run dev
```

You should see:
```
✅ MongoDB Connected: localhost
🎓 Campus Connect Server Running on Port: 5000
```

### Step 3: Frontend Setup
```bash
# Open new terminal, navigate to frontend
cd campusConnect

# Install dependencies (already done)
npm install

# Start development server
npm run dev
```

Frontend will open at: `http://localhost:5173`

### Step 4: Create Initial Admin User

**Option 1: Using MongoDB Compass or Shell**
```javascript
// Connect to 'campus_connect' database
use campus_connect

// Insert admin user
db.users.insertOne({
  name: "System Admin",
  email: "admin@campus.com",
  password: "$2a$10$rOzW1J1zFJ1zFJ1zFJ1zFOE5jZJ5jZJ5jZJ5jZJ5jZJ5jZJ5jZJ5u",
  role: "central_admin",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

**Option 2: Using Node.js Script**

Create `backend/scripts/createAdmin.js`:
```javascript
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const password = await bcrypt.hash('admin123', 10);
    
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@campus.com',
      password: password,
      role: 'central_admin',
      isActive: true
    });
    
    console.log('✅ Admin created:', admin.email);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createAdmin();
```

Run: `node scripts/createAdmin.js`

### Step 5: Login

1. Go to `http://localhost:5173/login`
2. Login with:
   - Email: `admin@campus.com`
   - Password: `admin123` (or `password` if using hashed version)

## 📊 Creating Demo Data

### 1. Create a Department

**API Request:**
```bash
POST http://localhost:5000/api/departments
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Computer Science",
  "code": "CS",
  "description": "Department of Computer Science and Engineering",
  "batches": [
    { "batchName": "A", "year": 1 },
    { "batchName": "B", "year": 1 },
    { "batchName": "A", "year": 2 }
  ]
}
```

### 2. Create Local Admin

```bash
POST http://localhost:5000/api/auth/register
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john.doe@campus.com",
  "password": "password123",
  "role": "local_admin",
  "department": "DEPARTMENT_ID_HERE",
  "employeeId": "EMP001",
  "phone": "1234567890"
}
```

### 3. Create Faculty

```bash
POST http://localhost:5000/api/auth/register
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Prof. Smith",
  "email": "prof.smith@campus.com",
  "password": "password123",
  "role": "faculty",
  "department": "DEPARTMENT_ID_HERE",
  "employeeId": "FAC001",
  "phone": "1234567890"
}
```

### 4. Create Students

```bash
POST http://localhost:5000/api/auth/register
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Alice Student",
  "email": "alice@campus.com",
  "password": "password123",
  "role": "student",
  "department": "DEPARTMENT_ID_HERE",
  "year": 1,
  "batch": "A",
  "rollNumber": "CS001",
  "phone": "1234567890"
}
```

### 5. Create a Notice

```bash
POST http://localhost:5000/api/notices
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data

{
  "title": "Welcome to Campus Connect",
  "content": "This is your first notice!",
  "category": "Academic",
  "priority": "high",
  "visibility": "global",
  "allowComments": true
}
```

## 🧪 Testing the System

### Test Real-Time Features

1. **Open two browser windows**
2. **Login as different users**
3. **Send a message in chat** - See real-time delivery
4. **Create a notice** - See real-time notification
5. **Add a comment** - See real-time update

### Test Socket.io Connection

Open browser console and check for:
```
✅ Socket connected
✅ User joined room: ...
```

### Test File Upload

1. Create a notice
2. Attach a PDF or image
3. Submit
4. View the notice and download attachment

## 🐛 Troubleshooting

### MongoDB Connection Error
```bash
# Check if MongoDB is running
mongod --version

# Start MongoDB service
# Windows: Start MongoDB service from Services
# Mac/Linux: 
sudo systemctl start mongod
```

### Port Already in Use
```bash
# Backend (5000)
# Find and kill process
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Frontend (5173)
# Vite will automatically use next available port
```

### Socket.io Not Connecting
- Check CORS settings in `backend/server.js`
- Verify CLIENT_URL in `.env`
- Check browser console for errors
- Ensure both servers are running

### JWT Token Issues
- Clear localStorage: `localStorage.clear()`
- Login again
- Check token expiry in `.env`

### File Upload Errors
- Check uploads folder exists
- Verify file permissions
- Check MAX_FILE_SIZE in `.env`
- Ensure correct content-type

## 📝 Environment Variables

### Backend `.env`
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/campus_connect
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,doc,docx,jpg,jpeg,png,gif
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## 🎯 Next Steps

1. ✅ Create initial admin user
2. ✅ Create departments
3. ✅ Create local admins for departments
4. ✅ Create faculty members
5. ✅ Create student accounts
6. ✅ Post some test notices
7. ✅ Create chat rooms
8. ✅ Test real-time features

## 🔧 Development Tools

### Recommended VS Code Extensions
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- MongoDB for VS Code
- Thunder Client (API testing)
- GitLens

### Recommended Browser Extensions
- React Developer Tools
- Redux DevTools
- Socket.io Client Tool

## 📚 Additional Resources

- MongoDB Documentation: https://docs.mongodb.com/
- Express.js Guide: https://expressjs.com/
- React Documentation: https://react.dev/
- Socket.io Documentation: https://socket.io/docs/
- Tailwind CSS: https://tailwindcss.com/

## 🤝 Need Help?

- Check console logs (backend and frontend)
- Review API responses in Network tab
- Check MongoDB data using Compass
- Verify environment variables
- Ensure all services are running

---

**Happy Coding! 🚀**
