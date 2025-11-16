import axiosInstance from './axiosInstance';

export const chatAPI = {
  // Get all chat rooms
  getChatRooms: async () => {
    const response = await axiosInstance.get('/chat/rooms');
    return response.data;
  },

  // Get chat room by ID
  getChatRoom: async (roomId) => {
    const response = await axiosInstance.get(`/chat/rooms/${roomId}`);
    return response.data;
  },

  // Get messages for a chat room
  getChatMessages: async (roomId, page = 1, limit = 50) => {
    const response = await axiosInstance.get(`/chat/rooms/${roomId}/messages`, {
      params: { page, limit },
    });
    return response.data;
  },

  // Send message
  sendMessage: async (roomId, messageData) => {
    const config = messageData instanceof FormData 
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};
    const response = await axiosInstance.post(`/chat/rooms/${roomId}/messages`, messageData, config);
    return response.data;
  },

  // Create new chat room
  createChatRoom: async (roomData) => {
    const response = await axiosInstance.post('/chat/rooms', roomData);
    return response.data;
  },

  // Create private chat
  createPrivateChat: async (participantId) => {
    const response = await axiosInstance.post('/chat/private', { participantId });
    return response.data;
  },

  // Mark messages as read
  markAsRead: async (roomId, messageIds) => {
    const response = await axiosInstance.put(`/chat/rooms/${roomId}/read`, { messageIds });
    return response.data;
  },

  // Delete message
  deleteMessage: async (messageId) => {
    const response = await axiosInstance.delete(`/chat/messages/${messageId}`);
    return response.data;
  },
};
