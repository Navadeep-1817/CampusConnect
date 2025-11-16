import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { userAPI, departmentAPI, noticeAPI, acknowledgmentAPI } from '../../services/api';
import { FaUsers, FaChalkboardTeacher, FaBell, FaCheckCircle, FaPlus, FaEdit, FaTrash, FaEye, FaDownload } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/dateUtils';

const LocalAdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalFaculty: 0,
    totalStudents: 0,
    totalNotices: 0,
    acknowledgmentRate: 0
  });
  
  const [faculty, setFaculty] = useState([]);
  const [students, setStudents] = useState([]);
  const [recentNotices, setRecentNotices] = useState([]);
  const [ackStats, setAckStats] = useState([]);
  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('faculty'); // 'faculty' or 'students'

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch department details
      if (user.department) {
        const deptRes = await departmentAPI.getDepartment(user.department._id || user.department);
        setDepartment(deptRes.data.data);
      }

      // Fetch users in the department
      const usersRes = await userAPI.getUsers({ 
        department: user.department._id || user.department 
      });
      
      const users = usersRes.data.data || [];
      const facultyList = users.filter(u => u.role === 'faculty');
      const studentList = users.filter(u => u.role === 'student');

      // Fetch department notices
      const noticesRes = await noticeAPI.getNotices({ 
        department: user.department._id || user.department,
        limit: 5 
      });

      // Fetch acknowledgment statistics
      const ackStatsRes = await acknowledgmentAPI.getDepartmentAckStats(
        user.department._id || user.department
      );

      setStats({
        totalFaculty: facultyList.length,
        totalStudents: studentList.length,
        totalNotices: noticesRes.data.pagination?.total || 0,
        acknowledgmentRate: ackStatsRes.data.data?.overallAckRate || 0
      });

      setFaculty(facultyList);
      setStudents(studentList);
      setRecentNotices(noticesRes.data.data || []);
      setAckStats(ackStatsRes.data.data?.noticeStats || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, role) => {
    if (!window.confirm(`Are you sure you want to deactivate this ${role}?`)) return;
    
    try {
      await userAPI.deleteUser(userId);
      toast.success(`${role} deactivated successfully`);
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to deactivate ${role}`);
    }
  };

  const exportAckReport = () => {
    // Convert acknowledgment stats to CSV
    const csvContent = [
      ['Notice Title', 'Total Students', 'Viewed', 'Acknowledged', 'Ack Rate'],
      ...ackStats.map(stat => [
        stat.noticeTitle,
        stat.totalStudents,
        stat.viewedCount,
        stat.acknowledgedCount,
        `${stat.acknowledgmentRate.toFixed(2)}%`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `acknowledgment_report_${formatDate(new Date())}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<FaChalkboardTeacher className="text-blue-600" />}
          title="Faculty Members"
          value={stats.totalFaculty}
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={<FaUsers className="text-green-600" />}
          title="Students"
          value={stats.totalStudents}
          bgColor="bg-green-50"
        />
        <StatCard
          icon={<FaBell className="text-purple-600" />}
          title="Dept Notices"
          value={stats.totalNotices}
          bgColor="bg-purple-50"
        />
        <StatCard
          icon={<FaCheckCircle className="text-orange-600" />}
          title="Ack Rate"
          value={`${stats.acknowledgmentRate.toFixed(1)}%`}
          bgColor="bg-orange-50"
        />
      </div>

      {/* User Management Tabs */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('faculty')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'faculty'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Faculty ({stats.totalFaculty})
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'students'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Students ({stats.totalStudents})
            </button>
          </div>
          <Link
            to={`/users?role=${activeTab === 'faculty' ? 'faculty' : 'student'}&action=create`}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            <FaPlus /> Add {activeTab === 'faculty' ? 'Faculty' : 'Student'}
          </Link>
        </div>

        {/* Faculty Table */}
        {activeTab === 'faculty' && (
          <div className="overflow-x-auto">
            {faculty.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No faculty members found</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {faculty.map((fac) => (
                    <tr key={fac._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {fac.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{fac.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fac.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {fac.employeeId || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          fac.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {fac.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <Link
                            to={`/users/${fac._id}`}
                            className="text-blue-600 hover:text-blue-900"
                            title="View"
                          >
                            <FaEye />
                          </Link>
                          <Link
                            to={`/users/${fac._id}/edit`}
                            className="text-green-600 hover:text-green-900"
                            title="Edit"
                          >
                            <FaEdit />
                          </Link>
                          <button
                            onClick={() => handleDeleteUser(fac._id, 'faculty')}
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
            )}
          </div>
        )}

        {/* Students Table */}
        {activeTab === 'students' && (
          <div className="overflow-x-auto">
            {students.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No students found</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Section</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-green-600 font-semibold">
                              {student.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{student.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.rollNumber || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.year || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.section || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          student.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {student.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <Link
                            to={`/users/${student._id}`}
                            className="text-blue-600 hover:text-blue-900"
                            title="View"
                          >
                            <FaEye />
                          </Link>
                          <Link
                            to={`/users/${student._id}/edit`}
                            className="text-green-600 hover:text-green-900"
                            title="Edit"
                          >
                            <FaEdit />
                          </Link>
                          <button
                            onClick={() => handleDeleteUser(student._id, 'student')}
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
            )}
          </div>
        )}
      </div>

      {/* Acknowledgment Statistics */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Acknowledgment Statistics</h2>
          <button
            onClick={exportAckReport}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            <FaDownload /> Export Report
          </button>
        </div>

        {ackStats.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No acknowledgment data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Students</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Viewed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acknowledged</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ack Rate</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ackStats.map((stat, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{stat.noticeTitle}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{stat.totalStudents}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{stat.viewedCount}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{stat.acknowledgedCount}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${stat.acknowledgmentRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {stat.acknowledgmentRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Department Notices */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Recent Department Notices</h2>
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
              <div key={notice._id} className="border-l-4 border-purple-500 bg-gray-50 p-4 rounded">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">{notice.title}</h3>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{notice.content}</p>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>Category: {notice.category}</span>
                      <span>Priority: {notice.priority}</span>
                      <span>Views: {notice.viewCount || 0}</span>
                      <span>Acks: {notice.acknowledgmentCount || 0}</span>
                    </div>
                  </div>
                  <Link
                    to={`/notices/${notice._id}`}
                    className="text-purple-600 hover:text-purple-900 ml-4"
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

export default LocalAdminDashboard;
