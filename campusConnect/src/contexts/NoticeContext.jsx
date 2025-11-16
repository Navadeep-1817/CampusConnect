import { createContext, useContext, useState, useCallback } from 'react';
import { acknowledgmentAPI } from '../services/api';
import { toast } from 'react-toastify';

const NoticeContext = createContext();

export const useNotice = () => {
  const context = useContext(NoticeContext);
  if (!context) {
    throw new Error('useNotice must be used within NoticeProvider');
  }
  return context;
};

export const NoticeProvider = ({ children }) => {
  const [myAcknowledgments, setMyAcknowledgments] = useState([]);

  // Check if a notice is acknowledged
  const isAcknowledged = useCallback((noticeId) => {
    return myAcknowledgments.some(
      ack => (ack.notice?._id || ack.notice) === noticeId && (ack.isAcknowledged || ack.acknowledged)
    );
  }, [myAcknowledgments]);

  // Centralized acknowledge handler
  const handleAcknowledge = useCallback(async (noticeId) => {
    try {
      // Optimistic update - add acknowledgment immediately
      setMyAcknowledgments(prev => [
        ...prev,
        { notice: noticeId, isAcknowledged: true, acknowledged: true }
      ]);
      
      // Call API in background
      await acknowledgmentAPI.acknowledgeNotice(noticeId);
      toast.success('Notice acknowledged!');
      
      return true;
    } catch (error) {
      // Revert on error
      setMyAcknowledgments(prev => 
        prev.filter(ack => (ack.notice?._id || ack.notice) !== noticeId)
      );
      toast.error(error.response?.data?.message || 'Failed to acknowledge notice');
      return false;
    }
  }, []);

  // Set initial acknowledgments (call this when loading dashboard data)
  const setAcknowledgments = useCallback((acknowledgments) => {
    setMyAcknowledgments(acknowledgments || []);
  }, []);

  // Add a single acknowledgment (useful for manual updates)
  const addAcknowledgment = useCallback((noticeId) => {
    setMyAcknowledgments(prev => {
      const exists = prev.some(ack => (ack.notice?._id || ack.notice) === noticeId);
      if (exists) return prev;
      return [...prev, { notice: noticeId, isAcknowledged: true, acknowledged: true }];
    });
  }, []);

  // Enrich notices with acknowledgment status
  const enrichNoticesWithAcknowledgments = useCallback((notices) => {
    return notices.map(notice => ({
      ...notice,
      acknowledged: isAcknowledged(notice._id)
    }));
  }, [isAcknowledged]);

  const value = {
    myAcknowledgments,
    isAcknowledged,
    handleAcknowledge,
    setAcknowledgments,
    addAcknowledgment,
    enrichNoticesWithAcknowledgments
  };

  return (
    <NoticeContext.Provider value={value}>
      {children}
    </NoticeContext.Provider>
  );
};
