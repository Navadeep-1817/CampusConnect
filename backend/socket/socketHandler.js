const ChatMessage = require('../models/ChatMessage');
const ChatRoom = require('../models/ChatRoom');
const Notice = require('../models/Notice');
const User = require('../models/User');

// Store online users
const onlineUsers = new Map();

const setupSocketIO = (io) => {
  // Socket.io connection handler
  io.on('connection', async (socket) => {
    const user = socket.user;
    console.log(`✅ User connected: ${user.name} (${user.role})`);

    // Add user to online users
    onlineUsers.set(user._id.toString(), {
      socketId: socket.id,
      userId: user._id,
      name: user.name,
      role: user.role
    });

    // Emit online users count
    io.emit('online-users', Array.from(onlineUsers.values()));

    // Join user to their relevant rooms
    await joinUserRooms(socket, user);

    // Handle joining a specific chat room
    socket.on('join-room', async (roomId) => {
      try {
        const room = await ChatRoom.findById(roomId);
        if (room) {
          socket.join(`chat-${roomId}`);
          console.log(`User ${user.name} joined room: ${room.name}`);
        }
      } catch (error) {
        console.error('Error joining room:', error);
      }
    });

    // Handle leaving a chat room
    socket.on('leave-room', (roomId) => {
      socket.leave(`chat-${roomId}`);
      console.log(`User ${user.name} left room: ${roomId}`);
    });

    // Handle sending chat message - OPTIMIZED for instant delivery
    socket.on('send-message', async (data) => {
      try {
        const { roomId, message, messageType, tempId } = data;

        // Create optimistic message object
        const optimisticMessage = {
          _id: tempId || `temp-${Date.now()}`,
          chatRoom: roomId,
          sender: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
          },
          message,
          messageType: messageType || 'text',
          createdAt: new Date(),
          isOptimistic: true
        };

        // INSTANTLY emit to room BEFORE database save
        io.to(`chat-${roomId}`).emit('new-message', optimisticMessage);
        
        // Send immediate delivery confirmation to sender
        socket.emit('message-delivered', {
          tempId: optimisticMessage._id,
          roomId,
          timestamp: Date.now()
        });

        // Now save to database asynchronously (non-blocking)
        setImmediate(async () => {
          try {
            const chatMessage = await ChatMessage.create({
              chatRoom: roomId,
              sender: user._id,
              message,
              messageType: messageType || 'text'
            });

            await chatMessage.populate('sender', 'name email role profilePicture');

            // Update chat room (non-blocking)
            ChatRoom.findByIdAndUpdate(roomId, {
              lastMessage: chatMessage._id,
              lastMessageAt: Date.now()
            }).exec();

            // Send actual message ID back to update the optimistic message
            io.to(`chat-${roomId}`).emit('message-confirmed', {
              tempId: optimisticMessage._id,
              actualMessage: chatMessage
            });
          } catch (dbError) {
            console.error('Database save error:', dbError);
            // Notify about failure
            socket.emit('message-save-failed', {
              tempId: optimisticMessage._id,
              error: 'Failed to save message'
            });
          }
        });

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message-error', {
          error: 'Failed to send message'
        });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      const { roomId, isTyping } = data;
      socket.to(`chat-${roomId}`).emit('user-typing', {
        userId: user._id,
        userName: user.name,
        isTyping
      });
    });

    // Handle message read status
    socket.on('message-read', async (data) => {
      try {
        const { messageId, roomId } = data;

        await ChatMessage.findByIdAndUpdate(messageId, {
          $addToSet: {
            readBy: {
              user: user._id,
              readAt: Date.now()
            }
          }
        });

        // Notify room about read status
        io.to(`chat-${roomId}`).emit('message-read-update', {
          messageId,
          userId: user._id
        });

      } catch (error) {
        console.error('Error updating read status:', error);
      }
    });

    // Handle message deletion
    socket.on('delete-message', async (data) => {
      try {
        const { messageId, roomId } = data;

        const message = await ChatMessage.findById(messageId);
        if (!message) return;

        // Check if user is moderator or sender
        const chatRoom = await ChatRoom.findById(roomId);
        const isModerator = chatRoom.moderators.some(
          mod => mod.toString() === user._id.toString()
        );
        const isSender = message.sender.toString() === user._id.toString();

        if (isModerator || isSender) {
          message.isDeleted = true;
          message.deletedBy = user._id;
          message.deletedAt = Date.now();
          await message.save();

          // Notify room about deletion
          io.to(`chat-${roomId}`).emit('message-deleted', {
            messageId,
            deletedBy: user._id
          });
        }

      } catch (error) {
        console.error('Error deleting message:', error);
      }
    });

    // Handle new notice notification
    socket.on('notice-created', async (noticeId) => {
      try {
        const notice = await Notice.findById(noticeId)
          .populate('createdBy', 'name role')
          .populate('department', 'name code');

        if (!notice) return;

        // Determine who should receive the notification
        let targetRoom = 'notices-global';
        
        if (notice.visibility === 'department') {
          targetRoom = `notices-dept-${notice.department._id}`;
        } else if (notice.visibility === 'batch') {
          targetRoom = `notices-dept-${notice.department._id}-year-${notice.targetYear}`;
        } else if (notice.visibility === 'class') {
          targetRoom = `notices-dept-${notice.department._id}-year-${notice.targetYear}-batch-${notice.targetBatch}`;
        }

        // Emit to target room
        io.to(targetRoom).emit('new-notice', {
          notice,
          message: `New ${notice.category} notice: ${notice.title}`
        });

      } catch (error) {
        console.error('Error broadcasting notice:', error);
      }
    });

    // Handle notice update notification
    socket.on('notice-updated', async (noticeId) => {
      try {
        const notice = await Notice.findById(noticeId)
          .populate('createdBy', 'name role')
          .populate('department', 'name code');

        if (!notice) return;

        let targetRoom = 'notices-global';
        if (notice.visibility === 'department') {
          targetRoom = `notices-dept-${notice.department._id}`;
        } else if (notice.visibility === 'batch') {
          targetRoom = `notices-dept-${notice.department._id}-year-${notice.targetYear}`;
        } else if (notice.visibility === 'class') {
          targetRoom = `notices-dept-${notice.department._id}-year-${notice.targetYear}-batch-${notice.targetBatch}`;
        }

        io.to(targetRoom).emit('notice-updated', {
          notice,
          message: `Notice updated: ${notice.title}`
        });

      } catch (error) {
        console.error('Error broadcasting notice update:', error);
      }
    });

    // Handle new comment notification
    socket.on('comment-added', async (data) => {
      try {
        const { noticeId, comment } = data;
        const notice = await Notice.findById(noticeId)
          .populate('createdBy', 'name');

        if (!notice) return;

        // Notify notice creator
        const creatorSocketData = onlineUsers.get(notice.createdBy._id.toString());
        if (creatorSocketData) {
          io.to(creatorSocketData.socketId).emit('new-comment', {
            noticeId,
            comment,
            message: `New comment on your notice: ${notice.title}`
          });
        }

      } catch (error) {
        console.error('Error broadcasting comment:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${user.name}`);
      onlineUsers.delete(user._id.toString());
      io.emit('online-users', Array.from(onlineUsers.values()));
    });
  });
};

// Helper function to join user to appropriate rooms
const joinUserRooms = async (socket, user) => {
  try {
    // Join global notices room
    socket.join('notices-global');

    if (user.role === 'student') {
      // Join department-specific rooms
      socket.join(`notices-dept-${user.department}`);
      socket.join(`notices-dept-${user.department}-year-${user.year}`);
      socket.join(`notices-dept-${user.department}-year-${user.year}-batch-${user.batch}`);

      // Join chat rooms
      const chatRooms = await ChatRoom.find({
        $or: [
          {
            type: 'department',
            department: user.department
          },
          {
            type: 'class',
            department: user.department,
            year: user.year,
            batch: user.batch
          },
          {
            type: 'private',
            participants: user._id
          }
        ]
      });

      chatRooms.forEach(room => {
        socket.join(`chat-${room._id}`);
      });

    } else if (user.role === 'faculty') {
      socket.join(`notices-dept-${user.department}`);

      const chatRooms = await ChatRoom.find({
        $or: [
          {
            type: 'department',
            department: user.department
          },
          {
            type: 'class',
            department: user.department
          },
          {
            type: 'private',
            participants: user._id
          }
        ]
      });

      chatRooms.forEach(room => {
        socket.join(`chat-${room._id}`);
      });

    } else if (user.role === 'local_admin') {
      socket.join(`notices-dept-${user.department}`);

      const chatRooms = await ChatRoom.find({
        department: user.department
      });

      chatRooms.forEach(room => {
        socket.join(`chat-${room._id}`);
      });
    }

    console.log(`✅ User ${user.name} joined appropriate rooms`);
  } catch (error) {
    console.error('Error joining rooms:', error);
  }
};

module.exports = setupSocketIO;
