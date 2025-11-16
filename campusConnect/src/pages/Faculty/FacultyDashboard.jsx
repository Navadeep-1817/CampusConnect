import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotice } from '../../contexts/NoticeContext';
import { noticeAPI, acknowledgmentAPI, userAPI } from '../../services/api';
import { FaBell, FaCheckCircle, FaUsers, FaComments, FaPlus, FaEye, FaEdit, FaTrash, FaPaperclip } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { formatRelativeTime } from '../../utils/dateUtils';
import { getPriorityColor, getCategoryColor } from '../../utils/constants';

const FacultyDashboard = () => {
  const { user } = useAuth();
  const { myAcknowledgments, isAcknowledged, handleAcknowledge: acknowledgeNotice, setAcknowledgments, enrichNoticesWithAcknowledgments } = useNotice();
  const [stats, setStats] = useState({
    totalNotices: 0,
    totalAcknowledgments: 0,
    totalStudents: 0,
    pendingAcks: 0
  });
  
  const [myNotices, setMyNotices] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notices'); // 'notices' or 'students'

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch notices created by this faculty
      const noticesRes = await noticeAPI.getNotices({ createdBy: user._id });
      const notices = noticesRes.data.data || [];
      
      // Fetch user's acknowledgments
      const acksRes = await acknowledgmentAPI.getUserAcknowledgments(user._id);
      const acks = acksRes.data.data || [];
      
      // Set acknowledgments in context
      setAcknowledgments(acks);
      
      // Fetch students in the department
      const studentsRes = await userAPI.getUsers({ 
        role: 'student',
        department: user.department._id || user.department
      });
      const studentList = studentsRes.data.data || [];

      // Calculate stats
      const totalAcks = notices.reduce((sum, notice) => sum + (notice.acknowledgmentCount || 0), 0);
      const totalViews = notices.reduce((sum, notice) => sum + (notice.viewCount || 0), 0);
      const pendingAcks = (studentList.length * notices.length) - totalAcks;
      
      // Count faculty's own acknowledgments
      const myAcknowledgedCount = acks.filter(ack => ack.acknowledged || ack.isAcknowledged).length;

      setStats({
        totalNotices: notices.length,
        totalAcknowledgments: myAcknowledgedCount,
        totalStudents: studentList.length,
        pendingAcks: Math.max(0, pendingAcks)
      });

      // Enrich notices with acknowledgment status
      const enrichedNotices = enrichNoticesWithAcknowledgments(notices);
      setMyNotices(enrichedNotices);
      setStudents(studentList);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNotice = async (noticeId) => {
    if (!window.confirm('Are you sure you want to delete this notice?')) return;
    
    try {
      await noticeAPI.deleteNotice(noticeId);
      toast.success('Notice deleted successfully');
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete notice');
    }
  };

  const handleAcknowledge = async (noticeId) => {
    // Optimistically update local notices
    setMyNotices(prev =>
      prev.map(n =>
        n._id === noticeId ? { ...n, acknowledged: true } : n
      )
    );
    
    // Call shared acknowledge handler from context
    const success = await acknowledgeNotice(noticeId);
    
    if (!success) {
      // Revert local changes on error
      fetchDashboardData();
    }
  };

  const viewAcknowledgments = async (noticeId) => {
    try {
      const res = await acknowledgmentAPI.getNoticeAcknowledgments(noticeId);
      const acks = res.data.data || [];
      
      // Show acknowledgment details in a modal or navigate to details page
      console.log('Acknowledgments:', acks);
      toast.info(`${acks.length} acknowledgments received`);
    } catch (error) {
      toast.error('Failed to fetch acknowledgments');
    }
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
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Faculty Dashboard</h1>
        <p className="text-gray-600">Manage notices, track acknowledgments, and view class lists</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<FaBell className="text-blue-600" />}
          title="My Notices"
          value={stats.totalNotices}
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={<FaCheckCircle className="text-green-600" />}
          title="My Acknowledged"
          value={stats.totalAcknowledgments}
          bgColor="bg-green-50"
        />
        <StatCard
          icon={<FaUsers className="text-purple-600" />}
          title="Students"
          value={stats.totalStudents}
          bgColor="bg-purple-50"
        />
        <StatCard
          icon={<FaComments className="text-orange-600" />}
          title="Pending Acks"
          value={stats.pendingAcks}
          bgColor="bg-orange-50"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('notices')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'notices'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              My Notices ({stats.totalNotices})
            </button>
            <button
              onClick={() => setActiveTab('allNotices')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'allNotices'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Notices
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'students'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Class List ({stats.totalStudents})
            </button>
          </div>
          {activeTab === 'notices' && (
            <Link
              to="/notices/create"
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              <FaPlus /> Post Notice
            </Link>
          )}
        </div>

        {/* My Notices Tab */}
        {activeTab === 'notices' && (
          <div className="space-y-4">
            {myNotices.length === 0 ? (
              <div className="text-center py-12">
                <FaBell className="mx-auto text-6xl text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg mb-4">No notices posted yet</p>
                <Link
                  to="/notices/create"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                >
                  <FaPlus /> Post Your First Notice
                </Link>
              </div>
            ) : (
              myNotices.map((notice) => (
                <div key={notice._id} className="border border-gray-200 rounded-lg p-5 hover:shadow-lg transition">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-semibold text-gray-800">{notice.title}</h3>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          getPriorityColor(notice.priority) || 'bg-gray-100 text-gray-800'
                        }`}>
                          {notice.priority?.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          getCategoryColor(notice.category) || 'bg-gray-100 text-gray-800'
                        }`}>
                          {notice.category}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3 line-clamp-2">{notice.content}</p>
                      
                      {/* Attachments */}
                      {notice.attachments && notice.attachments.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-blue-600 mb-2">
                          <FaPaperclip />
                          <span>{notice.attachments.length} attachment(s)</span>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex gap-6 text-sm text-gray-500 mb-3">
                        <span>👁️ {notice.viewCount || 0} views</span>
                        <span>✅ {notice.acknowledgmentCount || 0} acks</span>
                        <span>💬 {notice.comments?.length || 0} comments</span>
                        <span className="text-gray-400">{formatRelativeTime(notice.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons Row */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                    {/* Acknowledgment Button/Badge */}
                    <div>
                      {isAcknowledged(notice._id) ? (
                        <div className="flex items-center gap-2 text-green-600 font-medium bg-green-50 px-4 py-2 rounded-lg">
                          <FaCheckCircle />
                          <span>Acknowledged</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAcknowledge(notice._id)}
                          className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition text-sm font-medium shadow-md hover:shadow-lg"
                        >
                          <FaCheckCircle />
                          Mark as Acknowledged
                        </button>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Link
                        to={`/notices/${notice._id}`}
                        state={{ acknowledged: isAcknowledged(notice._id) }}
                        className="px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition flex items-center gap-2"
                        title="View Details"
                      >
                        <FaEye /> View Details
                      </Link>
                      <button
                        onClick={() => viewAcknowledgments(notice._id)}
                        className="px-4 py-2 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition flex items-center gap-2"
                        title="View Acknowledgments"
                      >
                        <FaCheckCircle /> Acknowledgments
                      </button>
                    </div>
                  </div>

                  {/* Acknowledgment Progress Bar */}
                  {notice.visibility !== 'global' && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Acknowledgment Progress</span>
                        <span className="font-medium text-gray-800">
                          {notice.acknowledgmentCount || 0} / {stats.totalStudents}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${
                              stats.totalStudents > 0
                                ? ((notice.acknowledgmentCount || 0) / stats.totalStudents) * 100
                                : 0
                            }%`
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* All Notices Tab */}
        {activeTab === 'allNotices' && (
          <AllNoticesTab
            user={user}
            handleAcknowledge={handleAcknowledge}
            isAcknowledged={isAcknowledged}
            enrichNoticesWithAcknowledgments={enrichNoticesWithAcknowledgments}
          />
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="overflow-x-auto">
            {students.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No students found in your department</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Section</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <span className="text-purple-600 font-semibold">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          to={`/users/${student._id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Profile"
                        >
                          <FaEye />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/notices/create"
          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6 hover:shadow-lg transition"
        >
          <FaPlus className="text-3xl mb-3" />
          <h3 className="text-xl font-bold mb-2">Post New Notice</h3>
          <p className="text-blue-100">Create and share notices with students</p>
        </Link>

        <Link
          to="/notices"
          className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6 hover:shadow-lg transition"
        >
          <FaBell className="text-3xl mb-3" />
          <h3 className="text-xl font-bold mb-2">View All Notices</h3>
          <p className="text-green-100">Browse all department notices</p>
        </Link>

        <Link
          to="/chat"
          className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-6 hover:shadow-lg transition"
        >
          <FaComments className="text-3xl mb-3" />
          <h3 className="text-xl font-bold mb-2">Department Chat</h3>
          <p className="text-purple-100">Communicate with students and faculty</p>
        </Link>
      </div>
    </div>
  );
};

// All Notices Tab Component
const AllNoticesTab = ({ user, handleAcknowledge, isAcknowledged, enrichNoticesWithAcknowledgments }) => {
  const [allNotices, setAllNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllNotices();
  }, []);

  const fetchAllNotices = async () => {
    try {
      setLoading(true);
      const response = await noticeAPI.getNotices({ limit: 20 });
      const notices = response.data.data || [];
      // Enrich with acknowledgment status from shared context
      const enrichedNotices = enrichNoticesWithAcknowledgments(notices);
      setAllNotices(enrichedNotices);
    } catch (error) {
      console.error('Error fetching notices:', error);
      toast.error('Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  // Optimized acknowledge handler for this tab
  const handleTabAcknowledge = async (noticeId) => {
    // Update local state immediately
    setAllNotices(prev =>
      prev.map(n =>
        n._id === noticeId ? { ...n, acknowledged: true } : n
      )
    );
    
    // Call shared acknowledge handler
    const success = await handleAcknowledge(noticeId);
    
    if (!success) {
      // Revert on error
      fetchAllNotices();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {allNotices.length === 0 ? (
        <div className="text-center py-12">
          <FaBell className="mx-auto text-6xl text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">No notices available</p>
        </div>
      ) : (
        allNotices.map((notice) => {
          const isAck = isAcknowledged(notice._id);
          const isNew = new Date(notice.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000);
          
          return (
            <div
              key={notice._id}
              className={`border-l-4 rounded-lg p-5 transition ${
                isNew ? 'border-green-500 bg-green-50' : 'border-blue-500 bg-gray-50'
              } hover:shadow-lg`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold text-gray-800">{notice.title}</h3>
                    {isNew && (
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-green-600 text-white">
                        NEW
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      getPriorityColor(notice.priority) || 'bg-gray-100 text-gray-800'
                    }`}>
                      {notice.priority?.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      getCategoryColor(notice.category) || 'bg-gray-100 text-gray-800'
                    }`}>
                      {notice.category}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 mb-3 line-clamp-2">{notice.content}</p>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <FaBell className="text-gray-400" />
                    <span>Posted by {notice.createdBy?.name || notice.postedBy?.name || 'Faculty'}</span>
                    <span className="text-gray-400">•</span>
                    <span>{formatRelativeTime(notice.createdAt)}</span>
                  </div>

                  {notice.attachments && notice.attachments.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 mb-2">
                      <FaPaperclip />
                      <span>{notice.attachments.length} attachment(s)</span>
                    </div>
                  )}

                  <div className="flex gap-4 text-sm text-gray-500 mb-3">
                    <span>💬 {notice.comments?.length || 0} comments</span>
                    <span>👁️ {notice.viewCount || 0} views</span>
                  </div>

                  {isAck ? (
                    <div className="flex items-center gap-2 text-green-600 font-medium bg-green-100 px-4 py-2 rounded-lg w-fit">
                      <FaCheckCircle />
                      <span>Acknowledged</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleTabAcknowledge(notice._id)}
                      className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition text-sm font-medium shadow-md hover:shadow-lg"
                    >
                      <FaCheckCircle />
                      Mark as Acknowledged
                    </button>
                  )}
                </div>

                <Link
                  to={`/notices/${notice._id}`}
                  state={{ acknowledged: isAck }}
                  className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <FaEye />
                  View Details
                </Link>
              </div>
            </div>
          );
        })
      )}
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

export default FacultyDashboard;
