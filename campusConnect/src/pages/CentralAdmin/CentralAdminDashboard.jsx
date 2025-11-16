import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userAPI, departmentAPI, noticeAPI } from '../../services/api';
import { FaUsers, FaBuilding, FaBell, FaChartLine, FaPlus, FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import { toast } from 'react-toastify';

const CentralAdminDashboard = () => {
  const [stats, setStats] = useState({
    totalLocalAdmins: 0,
    totalDepartments: 0,
    totalFaculty: 0,
    totalStudents: 0,
    totalNotices: 0,
    activeUsers: 0
  });
  
  const [localAdmins, setLocalAdmins] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [recentNotices, setRecentNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'localAdmin' or 'department'

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [usersRes, deptsRes, noticesRes] = await Promise.all([
        userAPI.getUsers(),
        departmentAPI.getDepartments(),
        noticeAPI.getNotices({ limit: 5 })
      ]);

      // Calculate statistics
      const users = usersRes.data.data || [];
      const localAdmins = users.filter(u => u.role === 'local_admin');
      const faculty = users.filter(u => u.role === 'faculty');
      const students = users.filter(u => u.role === 'student');
      const activeUsers = users.filter(u => u.isActive).length;

      setStats({
        totalLocalAdmins: localAdmins.length,
        totalDepartments: deptsRes.data.data?.length || 0,
        totalFaculty: faculty.length,
        totalStudents: students.length,
        totalNotices: noticesRes.data.pagination?.total || 0,
        activeUsers
      });

      setLocalAdmins(localAdmins);
      setDepartments(deptsRes.data.data || []);
      setRecentNotices(noticesRes.data.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLocalAdmin = async (userId) => {
    if (!window.confirm('Are you sure you want to deactivate this Local Admin?')) return;
    
    try {
      await userAPI.deleteUser(userId);
      toast.success('Local Admin deactivated successfully');
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to deactivate Local Admin');
    }
  };

  const handleDeleteDepartment = async (deptId) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    
    try {
      await departmentAPI.deleteDepartment(deptId);
      toast.success('Department deleted successfully');
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete department');
    }
  };

  const openCreateModal = (type) => {
    setModalType(type);
    setShowCreateModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Central Admin Dashboard</h1>
        <p className="text-gray-600">Manage university-wide operations and monitor system health</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<FaUsers className="text-blue-600" />}
          title="Local Admins"
          value={stats.totalLocalAdmins}
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={<FaBuilding className="text-green-600" />}
          title="Departments"
          value={stats.totalDepartments}
          bgColor="bg-green-50"
        />
        <StatCard
          icon={<FaUsers className="text-purple-600" />}
          title="Faculty"
          value={stats.totalFaculty}
          bgColor="bg-purple-50"
        />
        <StatCard
          icon={<FaUsers className="text-orange-600" />}
          title="Students"
          value={stats.totalStudents}
          bgColor="bg-orange-50"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <StatCard
          icon={<FaBell className="text-red-600" />}
          title="Total Notices"
          value={stats.totalNotices}
          bgColor="bg-red-50"
        />
        <StatCard
          icon={<FaChartLine className="text-indigo-600" />}
          title="Active Users"
          value={stats.activeUsers}
          bgColor="bg-indigo-50"
        />
      </div>

      {/* Local Admins Management */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Local Admins (DEOs)</h2>
          <Link
            to="/users?role=local_admin&action=create"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <FaPlus /> Add Local Admin
          </Link>
        </div>

        {localAdmins.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No Local Admins found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {localAdmins.map((admin) => (
                  <tr key={admin._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {admin.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{admin.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {admin.department?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {admin.employeeId || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        admin.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <Link
                          to={`/users/${admin._id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="View"
                        >
                          <FaEye />
                        </Link>
                        <Link
                          to={`/users/${admin._id}/edit`}
                          className="text-green-600 hover:text-green-900"
                          title="Edit"
                        >
                          <FaEdit />
                        </Link>
                        <button
                          onClick={() => handleDeleteLocalAdmin(admin._id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Departments Overview */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Departments</h2>
          <Link
            to="/departments/create"
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            <FaPlus /> Add Department
          </Link>
        </div>

        {departments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No departments found</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <div key={dept._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-800">{dept.name}</h3>
                  <div className="flex gap-2">
                    <Link
                      to={`/departments/${dept._id}`}
                      className="text-blue-600 hover:text-blue-900"
                      title="View"
                    >
                      <FaEye />
                    </Link>
                    <Link
                      to={`/departments/${dept._id}/edit`}
                      className="text-green-600 hover:text-green-900"
                      title="Edit"
                    >
                      <FaEdit />
                    </Link>
                    <button
                      onClick={() => handleDeleteDepartment(dept._id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">{dept.description}</p>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Faculty: {dept.faculty?.length || 0}</span>
                  <span>Students: {dept.students?.length || 0}</span>
                </div>
                <div className="mt-2">
                  <span className="text-xs text-gray-500">
                    Local Admin: {dept.localAdmin?.name || 'Not assigned'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent University Notices */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Recent University Notices</h2>
          <Link
            to="/notices/create"
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
          >
            <FaPlus /> Post Notice
          </Link>
        </div>

        {recentNotices.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No notices found</p>
        ) : (
          <div className="space-y-4">
            {recentNotices.map((notice) => (
              <div key={notice._id} className="border-l-4 border-blue-500 bg-gray-50 p-4 rounded">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">{notice.title}</h3>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{notice.content}</p>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>Category: {notice.category}</span>
                      <span>Priority: {notice.priority}</span>
                      <span>Views: {notice.viewCount || 0}</span>
                    </div>
                  </div>
                  <Link
                    to={`/notices/${notice._id}`}
                    className="text-blue-600 hover:text-blue-900 ml-4"
                  >
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon, title, value, bgColor }) => {
  return (
    <div className={`${bgColor} rounded-lg p-6 shadow-md hover:shadow-lg transition`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
};

export default CentralAdminDashboard;
