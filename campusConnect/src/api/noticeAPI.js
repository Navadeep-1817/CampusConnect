import axiosInstance from './axiosInstance';

export const noticeAPI = {
  // Get all notices
  getAllNotices: async (filters = {}) => {
    const response = await axiosInstance.get('/notices', { params: filters });
    return response.data;
  },

  // Get notice by ID
  getNoticeById: async (noticeId) => {
    const response = await axiosInstance.get(`/notices/${noticeId}`);
    return response.data;
  },

  // Create new notice (with FormData support for file uploads)
  createNotice: async (noticeData) => {
    // Do NOT set Content-Type header manually - let browser set it with boundary
    const response = await axiosInstance.post('/notices', noticeData);
    return response.data;
  },

  // Update notice (with FormData support for file uploads)
  updateNotice: async (noticeId, noticeData) => {
    // Do NOT set Content-Type header manually - let browser set it with boundary
    const response = await axiosInstance.put(`/notices/${noticeId}`, noticeData);
    return response.data;
  },

  // Delete notice
  deleteNotice: async (noticeId) => {
    const response = await axiosInstance.delete(`/notices/${noticeId}`);
    return response.data;
  },

  // Add comment to notice
  addComment: async (noticeId, text) => {
    const response = await axiosInstance.post(`/notices/${noticeId}/comments`, { text });
    return response.data;
  },

  // Reply to comment
  replyToComment: async (noticeId, commentId, text) => {
    const response = await axiosInstance.post(`/notices/${noticeId}/comments/${commentId}/reply`, { text });
    return response.data;
  },
};
