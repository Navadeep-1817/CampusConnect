# Campus Connect - Smart College Notice Board & Communication Portal

## 🎓 Overview

Campus Connect is a comprehensive MERN-based platform for college communication with hierarchical role management, real-time notifications, and instant messaging.

## 📋 Features

### Role Hierarchy
- **Central Admin** → **Local Admin (DEO)** → **Faculty** → **Students**

### Core Features

#### 1. **Hierarchical User Management**
- Central Admin manages Local Admins
- Local Admin manages Faculty & Students in their department
- Role-based access control (RBAC)
- JWT-based authentication with bcrypt password hashing

#### 2. **Smart Notice Board**
- Full CRUD operations with role-based permissions
- Notice categories: Academic, Events, Exams, Circulars, Others
- Priority levels: Low, Medium, High, Urgent
- Visibility control: Global, Department, Batch, Class
- File attachments (PDF, DOC, images) with cloud storage
- External links support
- Expiry dates and pinning
- Comments and replies
- Student acknowledgment tracking
- Search and filter by category, date, department

#### 3. **Real-Time Communication (Socket.io)**
- Live push notifications for new/updated notices
- Department-level chat rooms
- Class-specific chat rooms
- Private 1-on-1 messaging (Faculty ↔ Student)
- Typing indicators
- Message seen/delivered status
- Emoji support
- Message moderation (Admin/Faculty can delete)

#### 4. **Analytics & Tracking**
- Student acknowledgment logs
- View statistics
- Department-wise analytics
- Acknowledgment rates

## 🏗️ Technology Stack

### Backend
- **Node.js** + **Express.js**
- **MongoDB** with Mongoose ODM
- **Socket.io** for real-time features
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Multer** for file uploads
- **AWS S3/Firebase** for cloud storage

### Frontend
- **React 19** with Vite
- **React Router** for navigation
- **Axios** for API calls
- **Socket.io-client** for real-time features
- **Tailwind CSS** for styling
- **React Toastify** for notifications
- **React Icons** for UI icons
- **Moment.js** for date handling

## 📁 Project Structure

```
CampusConnect/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── departmentController.js
│   │   ├── noticeController.js
│   │   ├── acknowledgmentController.js
│   │   └── chatController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── upload.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Department.js
│   │   ├── Notice.js
│   │   ├── Acknowledgment.js
│   │   ├── ChatRoom.js
│   │   └── ChatMessage.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── departmentRoutes.js
│   │   ├── noticeRoutes.js
│   │   ├── acknowledgmentRoutes.js
│   │   └── chatRoutes.js
│   ├── socket/
│   │   └── socketHandler.js
│   ├── uploads/
│   ├── .env
│   ├── .gitignore
│   ├── package.json
│   └── server.js
│
└── campusConnect/
    ├── src/
    │   ├── components/
    │   │   ├── dashboards/
    │   │   └── ProtectedRoute.jsx
    │   ├── contexts/
    │   │   ├── AuthContext.jsx
    │   │   └── NotificationContext.jsx
    │   ├── layouts/
    │   │   └── MainLayout.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   └── Dashboard.jsx
    │   ├── services/
    │   │   ├── api.js
    │   │   └── socket.js
    │   ├── utils/
    │   │   ├── constants.js
    │   │   ├── helpers.js
    │   │   └── dateUtils.js
    │   ├── App.jsx
    │   └── main.jsx
    ├── .env
    └── package.json
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v16+)
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
Edit `.env` file with your settings:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/campus_connect
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
```

4. **Start MongoDB:**
```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas connection string
```

5. **Run the server:**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd campusConnect
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
`.env` file:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

4. **Start development server:**
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

## 📊 Database Schema

### Users Collection
- name, email, password (hashed)
- role: central_admin | local_admin | faculty | student
- department reference
- year, batch, rollNumber (for students)
- employeeId (for faculty/admin)
- isActive, lastLogin

### Departments Collection
- name, code, description
- localAdmin reference
- faculty array, students array
- batches array
- isActive

### Notices Collection
- title, content, category, priority
- visibility, department, targetYear, targetBatch
- attachments array, externalLinks array
- createdBy, expiryDate, isPinned
- allowComments, comments array
- viewCount, acknowledgmentCount

### Acknowledgments Collection
- notice reference, user reference
- viewedAt, acknowledgedAt
- isAcknowledged

### ChatRooms Collection
- name, type (department/class/private)
- department, year, batch
- participants array, moderators array
- lastMessage, lastMessageAt

### ChatMessages Collection
- chatRoom reference, sender reference
- message, messageType
- readBy array, deliveredTo array
- isDeleted, deletedBy

## 🔐 API Endpoints

### Authentication
```
POST   /api/auth/login          - User login
POST   /api/auth/register       - Create new user (Admin only)
GET    /api/auth/me             - Get current user
PUT    /api/auth/updatepassword - Update password
PUT    /api/auth/updateprofile  - Update profile
```

### Users
```
GET    /api/users               - Get all users (with filters)
GET    /api/users/:id           - Get single user
PUT    /api/users/:id           - Update user
DELETE /api/users/:id           - Deactivate user
PUT    /api/users/:id/activate  - Activate user
GET    /api/users/stats/department - Get department statistics
```

### Departments
```
GET    /api/departments         - Get all departments
GET    /api/departments/:id     - Get single department
POST   /api/departments         - Create department (Central Admin)
PUT    /api/departments/:id     - Update department
DELETE /api/departments/:id     - Deactivate department
POST   /api/departments/:id/batches - Add batch
GET    /api/departments/:id/stats - Get department stats
```

### Notices
```
GET    /api/notices             - Get all notices (filtered by role)
GET    /api/notices/:id         - Get single notice
POST   /api/notices             - Create notice
PUT    /api/notices/:id         - Update notice
DELETE /api/notices/:id         - Delete notice
POST   /api/notices/:id/comments - Add comment
POST   /api/notices/:id/comments/:commentId/reply - Reply to comment
```

### Acknowledgments
```
POST   /api/acknowledgments/:noticeId - Acknowledge notice
GET    /api/acknowledgments/notice/:noticeId - Get notice acknowledgments
GET    /api/acknowledgments/user - Get user acknowledgments
GET    /api/acknowledgments/notice/:noticeId/stats - Get stats
GET    /api/acknowledgments/department/:departmentId/stats - Dept stats
```

### Chat
```
GET    /api/chat/rooms          - Get user's chat rooms
GET    /api/chat/rooms/:id      - Get single chat room
POST   /api/chat/rooms          - Create chat room
GET    /api/chat/rooms/:id/messages - Get messages
POST   /api/chat/rooms/:id/messages - Send message
DELETE /api/chat/messages/:id   - Delete message
PUT    /api/chat/rooms/:id/read - Mark as read
POST   /api/chat/private        - Create private chat
```

## 🔌 Socket.io Events

### Chat Events
- `join-room` - Join a chat room
- `leave-room` - Leave a chat room
- `send-message` - Send a message
- `new-message` - Receive new message
- `typing` - Send typing indicator
- `user-typing` - Receive typing indicator
- `message-read` - Mark message as read
- `message-read-update` - Read status update
- `delete-message` - Delete a message
- `message-deleted` - Message deletion notification

### Notice Events
- `notice-created` - New notice created
- `new-notice` - Receive new notice notification
- `notice-updated` - Notice updated
- `comment-added` - New comment on notice
- `new-comment` - Receive comment notification

### System Events
- `online-users` - Get list of online users

## 👥 User Roles & Permissions

### Central Admin
✅ Create/manage Local Admin accounts
✅ Post global university-wide notifications
✅ View all departmental data
✅ Manage all departments
✅ Full system access

### Local Admin (DEO)
✅ Manage faculty and students in their department
✅ Create/edit/delete department-level notifications
✅ View acknowledgment statistics
✅ Moderate department chat rooms
✅ Manage batches

### Faculty
✅ Post class-specific/department notices
✅ Attach files and links to notices
✅ Track student views/acknowledgments
✅ Reply to student comments
✅ Access class chat rooms
✅ Create private chats with students

### Students
✅ View relevant notices (department, year, class)
✅ Acknowledge notices
✅ Comment on notices (if allowed)
✅ Download attachments
✅ Access department and class chats
✅ Receive real-time notifications

## 🎨 Frontend Features

### Authentication
- Login page with validation
- JWT token management
- Auto-redirect on unauthorized access
- Protected routes

### Dashboard
- Role-specific dashboards
- Statistics cards
- Recent notices
- Quick actions

### Notice Board
- List view with filters
- Create/edit forms with file upload
- Detail view with attachments
- Comment section
- Acknowledgment tracking
- Real-time updates

### Chat Interface
- Room list
- Message list with timestamps
- Input with emoji support
- Typing indicators
- Read receipts
- Message deletion (moderators)

### Real-time Notifications
- Toast notifications
- Notification bell with count
- Notification history
- Mark as read functionality

## 🔒 Security Features

- JWT-based authentication
- bcrypt password hashing
- Role-based access control (RBAC)
- Protected API routes
- Socket.io authentication
- File upload validation
- Input sanitization
- CORS protection
- Helmet.js security headers

## 📱 Responsive Design

- Mobile-friendly interface
- Tailwind CSS utilities
- Responsive navigation
- Adaptive layouts
- Touch-optimized controls

## 🧪 Testing

### Create Initial Admin User

First, you need to manually create a Central Admin in MongoDB:

```javascript
// Connect to MongoDB and run:
db.users.insertOne({
  name: "Admin User",
  email: "admin@campus.com",
  password: "$2a$10$5XJZ0YKZ6YkZ6YkZ6YkZ6u", // "password" hashed
  role: "central_admin",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});
```

Or use the registration endpoint with temporary bypass.

### Test User Accounts

After creating Central Admin, create test users:

1. **Central Admin**
   - Email: admin@campus.com
   - Password: password

2. **Local Admin (DEO)**
   - Create via Central Admin dashboard

3. **Faculty**
   - Create via Local Admin dashboard

4. **Student**
   - Create via Local Admin dashboard

## 🚀 Deployment

### Backend Deployment (Heroku/Railway/Render)

1. Set environment variables
2. Update MongoDB URI to Atlas
3. Configure AWS S3 or Firebase for file uploads
4. Deploy using Git or CLI

### Frontend Deployment (Vercel/Netlify)

1. Build the project: `npm run build`
2. Deploy dist folder
3. Update environment variables
4. Configure redirects for SPA

## 📝 Next Steps for Full Implementation

The current implementation provides the complete backend structure and frontend foundation. To complete the system:

1. **Complete UI Components:**
   - Notice list and detail pages
   - Notice creation/edit forms with file upload
   - Chat interface with message list
   - User management interface
   - Department management interface

2. **Add More Features:**
   - File preview for PDFs and images
   - Advanced search and filters
   - Email notifications
   - Push notifications
   - Analytics dashboard
   - Report generation

3. **Testing:**
   - Unit tests with Jest
   - Integration tests
   - E2E tests with Cypress

4. **Documentation:**
   - API documentation with Swagger
   - Component documentation
   - Deployment guides

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License

## 👨‍💻 Support

For issues and questions:
- Create an issue on GitHub
- Contact the development team

---

**Built with ❤️ using MERN Stack**
