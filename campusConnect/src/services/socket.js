import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect(token) {
    if (this.socket && this.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      // Performance optimizations
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 10000,
      // Enable compression
      perMessageDeflate: true,
      // Prefer websocket
      transportOptions: {
        websocket: {
          compression: true
        }
      }
    });

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('✅ Socket connected');
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      console.log('❌ Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // Chat events
  joinRoom(roomId) {
    if (this.socket) {
      this.socket.emit('join-room', roomId);
    }
  }

  leaveRoom(roomId) {
    if (this.socket) {
      this.socket.emit('leave-room', roomId);
    }
  }

  sendMessage(data) {
    if (this.socket) {
      this.socket.emit('send-message', data);
    }
  }

  onNewMessage(callback) {
    if (this.socket) {
      this.socket.on('new-message', callback);
    }
  }

  offNewMessage() {
    if (this.socket) {
      this.socket.off('new-message');
    }
  }

  sendTyping(roomId, isTyping) {
    if (this.socket) {
      this.socket.emit('typing', { roomId, isTyping });
    }
  }

  onUserTyping(callback) {
    if (this.socket) {
      this.socket.on('user-typing', callback);
    }
  }

  offUserTyping() {
    if (this.socket) {
      this.socket.off('user-typing');
    }
  }

  markMessageRead(messageId, roomId) {
    if (this.socket) {
      this.socket.emit('message-read', { messageId, roomId });
    }
  }

  onMessageReadUpdate(callback) {
    if (this.socket) {
      this.socket.on('message-read-update', callback);
    }
  }

  deleteMessage(messageId, roomId) {
    if (this.socket) {
      this.socket.emit('delete-message', { messageId, roomId });
    }
  }

  onMessageDeleted(callback) {
    if (this.socket) {
      this.socket.on('message-deleted', callback);
    }
  }

  // Notice events
  noticeCreated(noticeId) {
    if (this.socket) {
      this.socket.emit('notice-created', noticeId);
    }
  }

  onNewNotice(callback) {
    if (this.socket) {
      this.socket.on('new-notice', callback);
    }
  }

  offNewNotice() {
    if (this.socket) {
      this.socket.off('new-notice');
    }
  }

  noticeUpdated(noticeId) {
    if (this.socket) {
      this.socket.emit('notice-updated', noticeId);
    }
  }

  onNoticeUpdated(callback) {
    if (this.socket) {
      this.socket.on('notice-updated', callback);
    }
  }

  offNoticeUpdated() {
    if (this.socket) {
      this.socket.off('notice-updated');
    }
  }

  commentAdded(data) {
    if (this.socket) {
      this.socket.emit('comment-added', data);
    }
  }

  onNewComment(callback) {
    if (this.socket) {
      this.socket.on('new-comment', callback);
    }
  }

  offNewComment() {
    if (this.socket) {
      this.socket.off('new-comment');
    }
  }

  // Online users
  onOnlineUsers(callback) {
    if (this.socket) {
      this.socket.on('online-users', callback);
    }
  }

  offOnlineUsers() {
    if (this.socket) {
      this.socket.off('online-users');
    }
  }

  // Message delivery
  onMessageDelivered(callback) {
    if (this.socket) {
      this.socket.on('message-delivered', callback);
    }
  }

  onMessageError(callback) {
    if (this.socket) {
      this.socket.on('message-error', callback);
    }
  }

  // Message confirmation (after DB save)
  onMessageConfirmed(callback) {
    if (this.socket) {
      this.socket.on('message-confirmed', callback);
    }
  }

  offMessageConfirmed() {
    if (this.socket) {
      this.socket.off('message-confirmed');
    }
  }

  onMessageSaveFailed(callback) {
    if (this.socket) {
      this.socket.on('message-save-failed', callback);
    }
  }

  offMessageSaveFailed() {
    if (this.socket) {
      this.socket.off('message-save-failed');
    }
  }
}

const socketService = new SocketService();
export default socketService;
