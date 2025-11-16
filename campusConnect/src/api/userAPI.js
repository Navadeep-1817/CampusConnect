import axiosInstance from './axiosInstance';

export const userAPI = {
  // Get all users (Admin only)
  getAllUsers: async (filters = {}) => {
    const response = await axiosInstance.get('/users', { params: filters });
    return response.data;
  },

  // Get user by ID
  getUserById: async (userId) => {
    const response = await axiosInstance.get(`/users/${userId}`);
    return response.data;
  },

  // Update user profile
  updateProfile: async (userId, userData) => {
    const response = await axiosInstance.put(`/users/${userId}`, userData);
    return response.data;
  },

  // Delete user
  deleteUser: async (userId) => {
    const response = await axiosInstance.delete(`/users/${userId}`);
    return response.data;
  },

  // Get users by role
  getUsersByRole: async (role) => {
    const response = await axiosInstance.get(`/users/role/${role}`);
    return response.data;
  },

  // Get users by department
  getUsersByDepartment: async (departmentId) => {
    const response = await axiosInstance.get(`/users/department/${departmentId}`);
    return response.data;
  },

  // Create new user (Admin only)
  createUser: async (userData) => {
    const response = await axiosInstance.post('/users', userData);
    return response.data;
  },

  // Bulk create users
  bulkCreateUsers: async (usersData) => {
    const response = await axiosInstance.post('/users/bulk', usersData);
    return response.data;
  },

  // Update user status (activate/deactivate)
  updateUserStatus: async (userId, status) => {
    const response = await axiosInstance.patch(`/users/${userId}/status`, { status });
    return response.data;
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    const response = await axiosInstance.post('/users/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};
