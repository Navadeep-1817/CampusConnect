import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { NoticeProvider } from './contexts/NoticeContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfileEdit from './pages/ProfileEdit';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import NoticeList from './pages/Notices/NoticeList';
import NoticeForm from './pages/Notices/NoticeForm';
import NoticeDetail from './pages/Notices/NoticeDetail';
import Chat from './pages/Chat/Chat';
import Users from './pages/CentralAdmin/Users';
import Departments from './pages/CentralAdmin/Departments';
import Analytics from './pages/CentralAdmin/Analytics';
import { ROLES } from './utils/constants';

// Placeholder pages
const ProfilePage = () => {
  const { user } = useAuth();
  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Profile</h1>
          <div className="flex gap-3">
            <Link
              to="/profile/change-password"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              Change Password
            </Link>
            <Link
              to="/profile/edit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Edit Profile
            </Link>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="text-sm text-gray-600">Name</label>
            <p className="font-medium">{user?.name}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">Email</label>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600">Role</label>
            <p className="font-medium">{user?.role}</p>
          </div>
          {user?.department && (
            <div>
              <label className="text-sm text-gray-600">Department</label>
              <p className="font-medium">{user.department.name}</p>
            </div>
          )}
          {user?.rollNumber && (
            <div>
              <label className="text-sm text-gray-600">Roll Number</label>
              <p className="font-medium">{user.rollNumber}</p>
            </div>
          )}
          {user?.employeeId && (
            <div>
              <label className="text-sm text-gray-600">Employee ID</label>
              <p className="font-medium">{user.employeeId}</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};



const UsersPage = () => (
  <MainLayout>
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">User Management</h2>
      <p className="text-gray-600">Create and manage users based on role hierarchy.</p>
    </div>
  </MainLayout>
);

const DepartmentsPage = () => (
  <MainLayout>
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Department Management</h2>
      <p className="text-gray-600">Manage departments, batches, and assignments.</p>
    </div>
  </MainLayout>
);

const Unauthorized = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">403</h1>
      <p className="text-xl text-gray-600 mb-4">Unauthorized Access</p>
      <a href="/dashboard" className="text-blue-600 hover:text-blue-800">
        Go to Dashboard
      </a>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <NoticeProvider>
            <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Dashboard />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile/edit"
                element={
                  <ProtectedRoute>
                    <ProfileEdit />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile/change-password"
                element={
                  <ProtectedRoute>
                    <ChangePassword />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/notices"
                element={
                  <ProtectedRoute>
                    <NoticeList />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/notices/create"
                element={
                  <ProtectedRoute>
                    <NoticeForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/notices/:id"
                element={
                  <ProtectedRoute>
                    <NoticeDetail />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/notices/:id/edit"
                element={
                  <ProtectedRoute>
                    <NoticeForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/users"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.CENTRAL_ADMIN, ROLES.LOCAL_ADMIN]}>
                    <Users />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/departments"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.CENTRAL_ADMIN]}>
                    <Departments />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/analytics"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.CENTRAL_ADMIN, ROLES.LOCAL_ADMIN]}>
                    <Analytics />
                  </ProtectedRoute>
                }
              />

              {/* Default Route */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>

            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
            </div>
          </NoticeProvider>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
