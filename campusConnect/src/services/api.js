import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Request interceptor to add token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => axiosInstance.post('/auth/login', credentials),
  register: (userData) => axiosInstance.post('/auth/register', userData),
  getMe: () => axiosInstance.get('/auth/me'),
  updatePassword: (data) => axiosInstance.put('/auth/updatepassword', data),
  updateProfile: (data) => axiosInstance.put('/auth/updateprofile', data)
};

// User API
export const userAPI = {
  getUsers: (params) => axiosInstance.get('/users', { params }),
  getUser: (id) => axiosInstance.get(`/users/${id}`),
  updateUser: (id, data) => axiosInstance.put(`/users/${id}`, data),
  deleteUser: (id) => axiosInstance.delete(`/users/${id}`),
  activateUser: (id) => axiosInstance.put(`/users/${id}/activate`),
  getDepartmentStats: (departmentId) => axiosInstance.get('/users/stats/department', { params: { department: departmentId } })
};

// Department API
export const departmentAPI = {
  getDepartments: () => axiosInstance.get('/departments'),
  getDepartment: (id) => axiosInstance.get(`/departments/${id}`),
  createDepartment: (data) => axiosInstance.post('/departments', data),
  updateDepartment: (id, data) => axiosInstance.put(`/departments/${id}`, data),
  deleteDepartment: (id) => axiosInstance.delete(`/departments/${id}`),
  addBatch: (id, data) => axiosInstance.post(`/departments/${id}/batches`, data),
  getDepartmentStats: (id) => axiosInstance.get(`/departments/${id}/stats`)
};

// Notice API
export const noticeAPI = {
  getNotices: (params) => axiosInstance.get('/notices', { params }),
  getNotice: (id) => axiosInstance.get(`/notices/${id}`),
  createNotice: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key === 'attachments' && data[key]) {
        data[key].forEach(file => formData.append('attachments', file));
      } else if (key === 'externalLinks') {
        formData.append(key, JSON.stringify(data[key]));
      } else {
        formData.append(key, data[key]);
      }
    });
    return axiosInstance.post('/notices', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  updateNotice: (id, data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key === 'attachments' && data[key]) {
        data[key].forEach(file => formData.append('attachments', file));
      } else if (key === 'externalLinks') {
        formData.append(key, JSON.stringify(data[key]));
      } else {
        formData.append(key, data[key]);
      }
    });
    return axiosInstance.put(`/notices/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteNotice: (id) => axiosInstance.delete(`/notices/${id}`),
  addComment: (id, data) => axiosInstance.post(`/notices/${id}/comments`, data),
  replyToComment: (noticeId, commentId, data) => 
    axiosInstance.post(`/notices/${noticeId}/comments/${commentId}/reply`, data)
};

// Acknowledgment API
export const acknowledgmentAPI = {
  acknowledgeNotice: (noticeId) => axiosInstance.post(`/acknowledgments/${noticeId}`),
  getNoticeAcknowledgments: (noticeId, params) => 
    axiosInstance.get(`/acknowledgments/notice/${noticeId}`, { params }),
  getUserAcknowledgments: () => axiosInstance.get('/acknowledgments/user'),
  getNoticeAckStats: (noticeId) => axiosInstance.get(`/acknowledgments/notice/${noticeId}/stats`),
  getDepartmentAckStats: (departmentId, params) => 
    axiosInstance.get(`/acknowledgments/department/${departmentId}/stats`, { params })
};

// Chat API
export const chatAPI = {
  getChatRooms: () => axiosInstance.get('/chat/rooms'),
  getChatRoom: (id) => axiosInstance.get(`/chat/rooms/${id}`),
  createChatRoom: (data) => axiosInstance.post('/chat/rooms', data),
  getChatMessages: (roomId, params) => axiosInstance.get(`/chat/rooms/${roomId}/messages`, { params }),
  sendMessage: (roomId, data) => axiosInstance.post(`/chat/rooms/${roomId}/messages`, data),
  deleteMessage: (messageId) => axiosInstance.delete(`/chat/messages/${messageId}`),
  markAsRead: (roomId, messageIds) => axiosInstance.put(`/chat/rooms/${roomId}/read`, { messageIds }),
  createPrivateChat: (participantId) => axiosInstance.post('/chat/private', { participantId })
};

export default axiosInstance;
