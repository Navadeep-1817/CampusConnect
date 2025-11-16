import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { noticeAPI, acknowledgmentAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotice } from '../../contexts/NoticeContext';
import { toast } from 'react-toastify';
import {
  FaArrowLeft, FaEdit, FaTrash, FaClock, FaUser, FaTag, FaEye,
  FaDownload, FaExternalLinkAlt, FaCheckCircle, FaPaperPlane
} from 'react-icons/fa';
import MainLayout from '../../layouts/MainLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getPriorityColor, getCategoryColor, getVisibilityLabel } from '../../utils/constants';
import moment from 'moment';

const NoticeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acknowledged, setAcknowledged] = useState(false);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    fetchNotice();
  }, [id]);

  const fetchNotice = async () => {
    try {
      const response = await noticeAPI.getNotice(id);
      setNotice(response.data.data);
    } catch (error) {
      toast.error('Failed to load notice');
      navigate('/notices');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this notice?')) return;

    try {
      await noticeAPI.deleteNotice(id);
      toast.success('Notice deleted successfully');
      navigate('/notices');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete notice');
    }
  };

  const handleAcknowledge = async () => {
    // Call shared acknowledge handler from context
    await acknowledgeNotice(id);
    // Refetch notice to update acknowledgment count
    fetchNotice();
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setSubmittingComment(true);
    try {
      await noticeAPI.addComment(id, { text: comment });
      toast.success('Comment added successfully');
      setComment('');
      fetchNotice();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <LoadingSpinner />
      </MainLayout>
    );
  }

  if (!notice) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">Notice not found</p>
        </div>
      </MainLayout>
    );
  }

  const canEdit = user?._id === notice.postedBy?._id || user?.role === 'central_admin';

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          to="/notices"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6"
        >
          <FaArrowLeft /> Back to Notices
        </Link>

        {/* Notice Content */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-white ${
                    notice.priority === 'urgent' ? 'text-red-600' :
                    notice.priority === 'high' ? 'text-orange-600' :
                    notice.priority === 'medium' ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {notice.priority?.toUpperCase()}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-gray-800">
                    <FaTag className="inline mr-1" />
                    {notice.category}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-white ${getVisibilityLabel(notice.visibility).color.replace('bg-', 'text-').replace('-100', '-600')}`}>
                    {getVisibilityLabel(notice.visibility).label}
                  </span>
                </div>
                {(notice.department || notice.targetYear || notice.targetBatch) && (
                  <div className="text-sm opacity-90 mb-2 flex items-center gap-3 flex-wrap">
                    {notice.department && (
                      <span>📍 {notice.department.name || notice.department.code}</span>
                    )}
                    {notice.targetYear && (
                      <span>🎓 Year {notice.targetYear}</span>
                    )}
                    {notice.targetBatch && (
                      <span>Batch: {notice.targetBatch}</span>
                    )}
                  </div>
                )}
                <h1 className="text-3xl font-bold mb-2">{notice.title}</h1>
              </div>

              {canEdit && (
                <div className="flex gap-2">
                  <Link
                    to={`/notices/${id}/edit`}
                    className="p-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                    title="Edit"
                  >
                    <FaEdit />
                  </Link>
                  <button
                    onClick={handleDelete}
                    className="p-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </div>
              )}
            </div>

            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <FaUser />
                <span>{notice.postedBy?.name || 'Anonymous'}</span>
              </div>
              <div className="flex items-center gap-2">
                <FaClock />
                <span>{moment(notice.createdAt).format('MMMM D, YYYY h:mm A')}</span>
              </div>
              <div className="flex items-center gap-2">
                <FaEye />
                <span>{notice.viewCount || 0} views</span>
              </div>
              {notice.acknowledgments?.length > 0 && (
                <div className="flex items-center gap-2">
                  <FaCheckCircle />
                  <span>{notice.acknowledgments.length} acknowledged</span>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="prose max-w-none mb-6">
              <p className="text-gray-700 whitespace-pre-wrap">{notice.content}</p>
            </div>

            {/* Attachments */}
            {notice.attachments?.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Attachments</h3>
                <div className="space-y-2">
                  {notice.attachments.map((attachment, index) => {
                    // Support both old and new formats
                    const fileUrl = attachment.fileUrl || `/api/uploads/${attachment.filename}`;
                    const fileName = attachment.fileName || attachment.originalName || attachment.filename;
                    const fileSize = attachment.fileSize || attachment.size;
                    // Use base server URL without /api since fileUrl already has /api/uploads
                    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');
                    const downloadUrl = fileUrl.startsWith('http') ? fileUrl : `${baseUrl}${fileUrl}`;
                    
                    return (
                      <a
                        key={index}
                        href={downloadUrl}
                        download={fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FaDownload className="text-blue-600" />
                          <span className="text-sm text-gray-700">{fileName}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {(fileSize / 1024).toFixed(2)} KB
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* External Links */}
            {notice.externalLinks?.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">External Links</h3>
                <div className="space-y-2">
                  {notice.externalLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <FaExternalLinkAlt className="text-blue-600" />
                      <span className="text-sm text-blue-600 hover:underline">{link.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Acknowledgment status removed - acknowledge from dashboard only */}

            {/* Comments Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Comments ({notice.comments?.length || 0})
              </h3>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="mb-6">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !comment.trim()}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaPaperPlane />
                  {submittingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </form>

              {/* Comments List */}
              <div className="space-y-4">
                {notice.comments?.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No comments yet</p>
                ) : (
                  notice.comments?.map((comment) => (
                    <div key={comment._id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 font-semibold">
                            {comment.user?.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{comment.user?.name}</span>
                            <span className="text-xs text-gray-500">
                              {moment(comment.createdAt).fromNow()}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm">{comment.text}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default NoticeDetail;
