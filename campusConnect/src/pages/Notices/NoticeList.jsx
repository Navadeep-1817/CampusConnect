import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { noticeAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotice } from '../../contexts/NoticeContext';
import { toast } from 'react-toastify';
import { 
  FaPlus, FaSearch, FaFilter, FaEye, FaEdit, FaTrash, 
  FaBullhorn, FaClock, FaUser, FaTag 
} from 'react-icons/fa';
import MainLayout from '../../layouts/MainLayout';
import { canCreateNotice, getPriorityColor, getCategoryColor, getVisibilityLabel } from '../../utils/constants';
import moment from 'moment';

const NoticeList = () => {
  const { user } = useAuth();
  const { enrichNoticesWithAcknowledgments } = useNotice();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    priority: '',
    department: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });

  useEffect(() => {
    fetchNotices();
  }, [filters, pagination.page]);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        )
      };

      const response = await noticeAPI.getNotices(params);
      const fetchedNotices = response.data.data || [];
      // Enrich notices with acknowledgment status from shared context
      const enrichedNotices = enrichNoticesWithAcknowledgments(fetchedNotices);
      setNotices(enrichedNotices);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0
      }));
    } catch (error) {
      console.error('Error fetching notices:', error);
      toast.error('Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (noticeId) => {
    if (!window.confirm('Are you sure you want to delete this notice?')) return;

    try {
      await noticeAPI.deleteNotice(noticeId);
      toast.success('Notice deleted successfully');
      fetchNotices();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete notice');
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      priority: '',
      department: ''
    });
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FaBullhorn className="text-blue-600" />
              Notice Board
            </h1>
            <p className="text-gray-600 mt-1">View and manage all notices</p>
          </div>
          {canCreateNotice(user?.role) && (
            <Link
              to="/notices/create"
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
            >
              <FaPlus /> Post New Notice
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FaFilter className="text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search notices..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Category Filter */}
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              <option value="Academic">Academic</option>
              <option value="Events">Events</option>
              <option value="Exams">Exams</option>
              <option value="Circulars">Circulars</option>
              <option value="Others">Others</option>
            </select>

            {/* Priority Filter */}
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            {/* Clear Filters */}
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Notices List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : notices.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <FaBullhorn className="mx-auto text-6xl text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No notices found</h3>
            <p className="text-gray-500">
              {canCreateNotice(user?.role) 
                ? 'Be the first to post a notice!' 
                : 'Check back later for new notices'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notices.map((notice) => (
              <div
                key={notice._id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(notice.priority)}`}>
                          {notice.priority?.toUpperCase()}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(notice.category)}`}>
                          <FaTag className="inline mr-1" />
                          {notice.category}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getVisibilityLabel(notice.visibility).color}`}>
                          {getVisibilityLabel(notice.visibility).label}
                        </span>
                        {notice.department && (
                          <span className="text-xs text-gray-600">
                            📍 {notice.department.name || notice.department.code}
                          </span>
                        )}
                        {notice.targetYear && (
                          <span className="text-xs text-gray-600">
                            Year {notice.targetYear}
                          </span>
                        )}
                        {notice.targetBatch && (
                          <span className="text-xs text-gray-600">
                            Batch: {notice.targetBatch}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {notice.title}
                      </h3>
                      
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {notice.content}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <FaUser />
                          <span>{notice.postedBy?.name || 'Anonymous'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FaClock />
                          <span>{moment(notice.createdAt).fromNow()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FaEye />
                          <span>{notice.viewCount || 0} views</span>
                        </div>
                        {notice.attachments?.length > 0 && (
                          <span className="text-blue-600">
                            📎 {notice.attachments.length} attachment(s)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Link
                        to={`/notices/${notice._id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View"
                      >
                        <FaEye size={18} />
                      </Link>
                      {user?._id === notice.postedBy?._id && (
                        <>
                          <Link
                            to={`/notices/${notice._id}/edit`}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <FaEdit size={18} />
                          </Link>
                          <button
                            onClick={() => handleDelete(notice._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <FaTrash size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 bg-white border border-gray-300 rounded-lg">
              Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default NoticeList;
