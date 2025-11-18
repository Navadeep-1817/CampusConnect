import { useState, useEffect, useRef } from 'react';
import { chatAPI } from '../../api/chatAPI';
import { useAuth } from '../../contexts/AuthContext';
import socketService from '../../services/socket';
import { toast } from 'react-toastify';
import {
  FaComments, FaSearch, FaPlus, FaPaperPlane, FaUsers,
  FaCircle, FaEllipsisV, FaPaperclip, FaTimes, FaFile, FaImage, FaDownload
} from 'react-icons/fa';
import MainLayout from '../../layouts/MainLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import CreateChatRoomModal from '../../components/chat/CreateChatRoomModal';
import moment from 'moment';

const Chat = () => {
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [chatRooms, setChatRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    fetchChatRooms();
    
    // Socket event listeners
    socketService.onNewMessage(handleNewMessage);
    socketService.onUserTyping(handleUserTyping);
    socketService.onMessageConfirmed(handleMessageConfirmed);
    socketService.onMessageSaveFailed(handleMessageSaveFailed);

    return () => {
      socketService.offNewMessage();
      socketService.offUserTyping();
      socketService.offMessageConfirmed();
      socketService.offMessageSaveFailed();
    };
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom._id);
      socketService.joinRoom(selectedRoom._id);
    }

    return () => {
      if (selectedRoom) {
        socketService.leaveRoom(selectedRoom._id);
      }
    };
  }, [selectedRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChatRooms = async () => {
    try {
      const response = await chatAPI.getChatRooms();
      setChatRooms(response.data || []);
      
      // Auto-select first room
      if (response.data?.length > 0) {
        setSelectedRoom(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
      toast.error('Failed to load chat rooms');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (roomId) => {
    try {
      const response = await chatAPI.getChatMessages(roomId);
      setMessages(response.data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const handleNewMessage = (message) => {
    if (message.chatRoom === selectedRoom?._id) {
      // Check if this is an optimistic message we already have
      setMessages(prev => {
        const hasOptimistic = prev.some(m => m._id === message._id && m.isOptimistic);
        if (hasOptimistic && message.sender._id === user._id) {
          // This is our own optimistic message coming back, ignore it
          return prev;
        }
        return [...prev, message];
      });
    }
    
    // Update last message in room list
    setChatRooms(prev => prev.map(room => 
      room._id === message.chatRoom 
        ? { ...room, lastMessage: message, unreadCount: (room.unreadCount || 0) + 1 }
        : room
    ));
  };

  const handleMessageConfirmed = (data) => {
    const { tempId, actualMessage } = data;
    if (actualMessage.chatRoom === selectedRoom?._id) {
      // Replace optimistic message with actual DB-saved message
      setMessages(prev => prev.map(msg => 
        msg._id === tempId ? { ...actualMessage, isPending: false } : msg
      ));
    }
  };

  const handleMessageSaveFailed = (data) => {
    const { tempId } = data;
    // Mark message as failed
    setMessages(prev => prev.map(msg => 
      msg._id === tempId ? { ...msg, isPending: false, isFailed: true } : msg
    ));
    toast.error('Failed to save message. Click to retry.');
  };

  const retryFailedMessage = (failedMessage) => {
    // Remove failed message
    setMessages(prev => prev.filter(msg => msg._id !== failedMessage._id));
    
    // Resend with new temp ID
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMessage = {
      ...failedMessage,
      _id: tempId,
      isFailed: false,
      isPending: true,
      createdAt: new Date()
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    
    socketService.sendMessage({
      roomId: selectedRoom._id,
      message: failedMessage.message,
      messageType: failedMessage.messageType || 'text',
      tempId
    });
  };

  const handleUserTyping = (data) => {
    // Show typing indicator
    console.log(`${data.userName} is typing...`);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && selectedFiles.length === 0) || !selectedRoom) return;

    // If files are attached, use HTTP API (can't send files via socket easily)
    if (selectedFiles.length > 0) {
      setSending(true);
      try {
        const formData = new FormData();
        formData.append('message', newMessage.trim());
        
        // Determine message type
        const hasImages = selectedFiles.some(f => f.type.startsWith('image/'));
        formData.append('messageType', hasImages ? 'image' : 'file');
        
        // Append all files
        selectedFiles.forEach(file => {
          formData.append('attachments', file);
        });

        console.log('Uploading files:', selectedFiles.map(f => f.name));

        const response = await chatAPI.sendMessage(selectedRoom._id, formData);
        
        // Clear inputs
        setNewMessage('');
        setSelectedFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        toast.success('Message sent with attachments!');
      } catch (error) {
        console.error('Send message error:', error);
        toast.error(error.response?.data?.message || 'Failed to send message');
      } finally {
        setSending(false);
      }
      return;
    }

    // For text messages, use socket for INSTANT delivery
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const messageText = newMessage.trim();
    
    // Clear input immediately for better UX
    setNewMessage('');
    
    // Create optimistic message
    const optimisticMessage = {
      _id: tempId,
      chatRoom: selectedRoom._id,
      sender: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      message: messageText,
      messageType: 'text',
      createdAt: new Date(),
      isOptimistic: true,
      isPending: true
    };

    // Add optimistic message to UI immediately
    setMessages(prev => [...prev, optimisticMessage]);

    // Send via socket for instant delivery
    socketService.sendMessage({
      roomId: selectedRoom._id,
      message: messageText,
      messageType: 'text',
      tempId
    });
  };

  const handleRoomCreated = async (newRoom) => {
    // Refresh chat rooms
    await fetchChatRooms();
    // Select the newly created room
    setSelectedRoom(newRoom);
    toast.success('Chat room created successfully!');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredRooms = chatRooms.filter(room =>
    room.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <MainLayout>
        <LoadingSpinner />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="h-[calc(100vh-12rem)] flex bg-white rounded-lg shadow-md overflow-hidden">
        {/* Sidebar - Chat Rooms */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FaComments className="text-blue-600" />
                Chats
              </h2>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                title="Create New Chat Room"
              >
                <FaPlus />
              </button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Chat Rooms List */}
          <div className="flex-1 overflow-y-auto">
            {filteredRooms.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FaComments className="mx-auto text-4xl mb-2 text-gray-300" />
                <p>No chat rooms found</p>
              </div>
            ) : (
              filteredRooms.map((room) => (
                <div
                  key={room._id}
                  onClick={() => setSelectedRoom(room)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedRoom?._id === room._id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{room.name}</h3>
                        {room.type === 'department' && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                            Dept
                          </span>
                        )}
                        {room.type === 'class' && (
                          <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded">
                            Class
                          </span>
                        )}
                      </div>
                      {room.lastMessage && (
                        <p className="text-sm text-gray-600 truncate">
                          {room.lastMessage.text}
                        </p>
                      )}
                    </div>
                    <div className="ml-2 flex flex-col items-end">
                      <span className="text-xs text-gray-500">
                        {room.lastMessage && moment(room.lastMessage.createdAt).fromNow()}
                      </span>
                      {room.unreadCount > 0 && (
                        <span className="mt-1 bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                          {room.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {!selectedRoom ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <FaComments className="mx-auto text-6xl mb-4 text-gray-300" />
                <p className="text-xl">Select a chat to start messaging</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <FaUsers className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedRoom.name}</h3>
                      <p className="text-sm text-gray-500">
                        {selectedRoom.participants?.length || 0} participants
                      </p>
                    </div>
                  </div>
                  <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                    <FaEllipsisV />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message, index) => {
                      const isOwnMessage = message.sender?._id === user._id;
                      const showAvatar = index === 0 || messages[index - 1].sender?._id !== message.sender?._id;

                      return (
                        <div
                          key={message._id}
                          className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                          onClick={() => message.isFailed && isOwnMessage && retryFailedMessage(message)}
                          style={{ cursor: message.isFailed && isOwnMessage ? 'pointer' : 'default' }}
                          title={message.isFailed && isOwnMessage ? 'Click to retry' : ''}
                        >
                          <div className={`flex gap-2 max-w-md ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                            {showAvatar && !isOwnMessage && (
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-blue-600 text-xs font-semibold">
                                  {message.sender?.name?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            {!showAvatar && !isOwnMessage && <div className="w-8" />}
                            
                            <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                              {showAvatar && !isOwnMessage && (
                                <span className="text-xs text-gray-600 mb-1 px-2">
                                  {message.sender?.name}
                                </span>
                              )}
                              <div
                                className={`rounded-2xl ${
                                  isOwnMessage
                                    ? message.isPending 
                                      ? 'bg-blue-400 text-white opacity-70' 
                                      : message.isFailed
                                      ? 'bg-red-500 text-white'
                                      : 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-900 border border-gray-200'
                                }`}
                              >
                                {/* Display attachments */}
                                {message.attachments && message.attachments.length > 0 && (
                                  <div className="space-y-2 p-2">
                                    {message.attachments.map((attachment, idx) => {
                                      // Support both old and new attachment formats
                                      const fileUrl = attachment.fileUrl || `/api/uploads/${attachment.filename}`;
                                      const fileName = attachment.originalName || attachment.fileName || attachment.filename;
                                      const fileType = attachment.mimeType || attachment.fileType;
                                      const fileSize = attachment.size || attachment.fileSize;
                                      // Use base server URL without /api since fileUrl already has /api/uploads
                                      const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');
                                      const downloadUrl = fileUrl.startsWith('http') ? fileUrl : `${baseUrl}${fileUrl}`;
                                      
                                      return (
                                        <div key={idx}>
                                          {fileType?.startsWith('image/') ? (
                                            <div className="relative">
                                              <img
                                                src={downloadUrl}
                                                alt={fileName}
                                                className="max-w-xs rounded-lg"
                                              />
                                              <a
                                                href={downloadUrl}
                                                download={fileName}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70"
                                              >
                                                <FaDownload />
                                              </a>
                                            </div>
                                          ) : (
                                            <a
                                              href={downloadUrl}
                                              download={fileName}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className={`flex items-center gap-2 p-2 rounded-lg ${
                                                isOwnMessage ? 'bg-blue-500' : 'bg-gray-100'
                                              }`}
                                            >
                                              <FaFile className={isOwnMessage ? 'text-white' : 'text-blue-600'} />
                                              <div className="flex-1 min-w-0">
                                                <p className="text-xs truncate">{fileName}</p>
                                                <p className="text-xs opacity-70">{(fileSize / 1024).toFixed(2)} KB</p>
                                              </div>
                                              <FaDownload className={isOwnMessage ? 'text-white' : 'text-gray-600'} />
                                            </a>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                {/* Display text message */}
                                {message.message && (
                                  <p className="text-sm px-4 py-2">{message.message}</p>
                                )}
                              </div>
                              <span className="text-xs text-gray-500 mt-1 px-2 flex items-center gap-1">
                                {moment(message.createdAt).format('h:mm A')}
                                {isOwnMessage && message.isPending && (
                                  <span className="animate-pulse">⏱</span>
                                )}
                                {isOwnMessage && message.isFailed && (
                                  <span className="text-red-500">✗</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200 bg-white">
                {/* File Preview */}
                {selectedFiles.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="relative bg-gray-100 p-2 rounded-lg flex items-center gap-2 max-w-xs">
                        {file.type.startsWith('image/') ? (
                          <FaImage className="text-blue-600" />
                        ) : (
                          <FaFile className="text-gray-600" />
                        )}
                        <span className="text-xs text-gray-700 truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    title="Attach file"
                  >
                    <FaPaperclip className="text-xl" />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={sending || (!newMessage.trim() && selectedFiles.length === 0)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <FaPaperPlane />
                    Send
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Chat Room Modal */}
      <CreateChatRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onRoomCreated={handleRoomCreated}
      />
    </MainLayout>
  );
};

export default Chat;
