import { createContext, useContext, useState, useEffect } from 'react';
import socketService from '../services/socket';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Listen for new notices
    socketService.onNewNotice((data) => {
      addNotification({
        id: Date.now(),
        type: 'notice',
        title: 'New Notice',
        message: data.message,
        data: data.notice,
        timestamp: new Date(),
        read: false
      });
    });

    // Listen for notice updates
    socketService.onNoticeUpdated((data) => {
      addNotification({
        id: Date.now(),
        type: 'notice-update',
        title: 'Notice Updated',
        message: data.message,
        data: data.notice,
        timestamp: new Date(),
        read: false
      });
    });

    // Listen for new comments
    socketService.onNewComment((data) => {
      addNotification({
        id: Date.now(),
        type: 'comment',
        title: 'New Comment',
        message: data.message,
        data: data.comment,
        timestamp: new Date(),
        read: false
      });
    });

    return () => {
      socketService.offNewNotice();
      socketService.offNoticeUpdated();
      socketService.offNewComment();
    };
  }, [isAuthenticated]);

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  const markAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const removeNotification = (notificationId) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== notificationId);
    });
  };

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    removeNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
