import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotice } from '../../contexts/NoticeContext';
import { noticeAPI, acknowledgmentAPI } from '../../services/api';
import { FaBell, FaCheckCircle, FaEye, FaComment, FaPaperclip, FaUser } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { formatRelativeTime } from '../../utils/dateUtils';
import { getPriorityColor, getCategoryColor } from '../../utils/constants';

const StudentDashboard = () => {
  const { user } = useAuth();
  const { myAcknowledgments, isAcknowledged, handleAcknowledge: acknowledgeNotice, setAcknowledgments, enrichNoticesWithAcknowledgments } = useNotice();
  const [stats, setStats] = useState({
    totalNotices: 0,
    newToday: 0,
    unacknowledged: 0,
    acknowledged: 0
  });
  const [recentNotices, setRecentNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notices'); // 'notices' or 'profile'

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch notices for the student (department, year, batch)
      const noticesRes = await noticeAPI.getNotices({ limit: 10 });
      const notices = noticesRes.data.data || [];
      
      // Fetch user's acknowledgments
      const acksRes = await acknowledgmentAPI.getUserAcknowledgments(user._id);
      const acks = acksRes.data.data || [];
      
      // Set acknowledgments in context
      setAcknowledgments(acks);
      
      // Calculate stats
      const acknowledgedNoticeIds = acks
        .filter(ack => ack.acknowledged || ack.isAcknowledged)
        .map(ack => ack.notice?._id || ack.notice);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newToday = notices.filter(notice => 
        new Date(notice.createdAt) >= today
      ).length;

      // Count unacknowledged from the fetched notices
      const unacknowledged = notices.filter(notice => 
        !acknowledgedNoticeIds.includes(notice._id)
      ).length;
      
      // Count acknowledged from the fetched notices
      const acknowledged = notices.filter(notice => 
        acknowledgedNoticeIds.includes(notice._id)
      ).length;

      setStats({
        totalNotices: notices.length,
        newToday,
        unacknowledged,
        acknowledged
      });

      // Enrich notices with acknowledgment status
      const enrichedNotices = enrichNoticesWithAcknowledgments(notices);
      setRecentNotices(enrichedNotices);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (noticeId) => {
    // Optimistically update local notices
    setRecentNotices(prev =>
      prev.map(n =>
        n._id === noticeId ? { ...n, acknowledged: true } : n
      )
    );
    
    // Update stats
    setStats(prev => ({
      ...prev,
      unacknowledged: Math.max(0, prev.unacknowledged - 1),
      acknowledged: prev.acknowledged + 1
    }));
    
    // Call shared acknowledge handler from context
    const success = await acknowledgeNotice(noticeId);
    
    if (!success) {
      // Revert local changes on error
      fetchDashboardData();
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
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Student Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {user.name}! • {user.department?.name} • Year {user.year} • Section {user.section}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<FaBell className="text-blue-600" />}
          title="Total Notices"
          value={stats.totalNotices}
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={<FaEye className="text-green-600" />}
          title="New Today"
          value={stats.newToday}
          bgColor="bg-green-50"
          highlight={stats.newToday > 0}
        />
        <StatCard
          icon={<FaCheckCircle className="text-orange-600" />}
          title="Unacknowledged"
          value={stats.unacknowledged}
          bgColor="bg-orange-50"
          highlight={stats.unacknowledged > 0}
        />
        <StatCard
          icon={<FaCheckCircle className="text-purple-600" />}
          title="Acknowledged"
          value={stats.acknowledged}
          bgColor="bg-purple-50"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('notices')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'notices'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Recent Notices ({stats.totalNotices})
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'profile'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            My Profile
          </button>
        </div>

        {/* Notices Tab */}
        {activeTab === 'notices' && (
          <div className="space-y-4">
            {recentNotices.length === 0 ? (
              <div className="text-center py-12">
                <FaBell className="mx-auto text-6xl text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">No notices available</p>
              </div>
            ) : (
              recentNotices.map((notice) => {
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
                        
                        {/* Posted by */}
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <FaUser className="text-gray-400" />
                          <span>Posted by {notice.createdBy?.name || 'Faculty'}</span>
                          <span className="text-gray-400">•</span>
                          <span>{formatRelativeTime(notice.createdAt)}</span>
                        </div>

                        {/* Attachments */}
                        {notice.attachments && notice.attachments.length > 0 && (
                          <div className="flex items-center gap-2 text-sm text-blue-600 mb-2">
                            <FaPaperclip />
                            <span>{notice.attachments.length} attachment(s)</span>
                          </div>
                        )}

                        {/* Stats */}
                        <div className="flex gap-4 text-sm text-gray-500 mb-3">
                          <span>💬 {notice.comments?.length || 0} comments</span>
                          <span>👁️ {notice.viewCount || 0} views</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons Row */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                      {/* Acknowledgment Button */}
                      <div>
                        {isAck ? (
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

                      {/* View Button */}
                      <Link
                        to={`/notices/${notice._id}`}
                        state={{ acknowledged: isAck }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 shadow-md hover:shadow-lg"
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
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-8 text-white mb-6">
              <div className="flex items-center gap-6">
                <div className="h-24 w-24 rounded-full bg-white flex items-center justify-center">
                  <span className="text-4xl font-bold text-blue-600">
                    {user.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-2">{user.name}</h2>
                  <p className="text-blue-100">{user.email}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Profile Information</h3>
              
              <div className="space-y-4">
                <ProfileField label="Roll Number" value={user.rollNumber || 'Not set'} />
                <ProfileField label="Department" value={user.department?.name || 'Not assigned'} />
                <ProfileField label="Year" value={user.year || 'Not set'} />
                <ProfileField label="Section" value={user.section || 'Not set'} />
                <ProfileField label="Batch" value={user.batch || 'Not set'} />
                <ProfileField label="Email" value={user.email} />
                <ProfileField label="Phone" value={user.phone || 'Not set'} />
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <Link
                  to="/profile/edit"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                >
                  <FaUser />
                  Update Profile
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/notices"
          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6 hover:shadow-lg transition"
        >
          <FaBell className="text-3xl mb-3" />
          <h3 className="text-xl font-bold mb-2">All Notices</h3>
          <p className="text-blue-100">Browse all department notices</p>
        </Link>

        <Link
          to="/chat"
          className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6 hover:shadow-lg transition"
        >
          <FaComment className="text-3xl mb-3" />
          <h3 className="text-xl font-bold mb-2">Class Chat</h3>
          <p className="text-green-100">Join department and class discussions</p>
        </Link>

        <Link
          to="/profile/edit"
          className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-6 hover:shadow-lg transition"
        >
          <FaUser className="text-3xl mb-3" />
          <h3 className="text-xl font-bold mb-2">My Profile</h3>
          <p className="text-purple-100">Update your profile information</p>
        </Link>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon, title, value, bgColor, highlight }) => {
  return (
    <div className={`${bgColor} rounded-lg p-6 shadow-md hover:shadow-lg transition ${
      highlight ? 'ring-2 ring-orange-500 ring-offset-2' : ''
    }`}>
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

// Profile Field Component
const ProfileField = ({ label, value }) => {
  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-gray-600 font-medium">{label}:</span>
      <span className="text-gray-800 font-semibold">{value}</span>
    </div>
  );
};

export default StudentDashboard;
