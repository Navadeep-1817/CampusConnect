const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const { 
  uploadFile, 
  deleteFile, 
  isCloudStorageConfigured, 
  getStorageType 
} = require('../services/fileStorage');

// @desc    Create chat room
// @route   POST /api/chat/rooms
// @access  Private (Admin)
exports.createChatRoom = async (req, res) => {
  try {
    const { name, type, department, year, batch, participants, targetAudience } = req.body;

    // Authorization checks
    if (req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        message: 'Students cannot create chat rooms'
      });
    }

    // Only central admin can create private-group rooms
    if (type === 'private-group' && req.user.role !== 'central_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only central admin can create cross-department private groups'
      });
    }

    if (req.user.role === 'local_admin' && department && department !== req.user.department.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Can only create rooms for your department'
      });
    }

    const roomData = {
      name,
      type,
      department,
      year,
      batch,
      participants,
      targetAudience: targetAudience || 'all',
      createdBy: req.user._id
    };

    // For private-group, extract unique departments from participants
    if (type === 'private-group' && participants && participants.length > 0) {
      const participantUsers = await User.find({ _id: { $in: participants } }).select('department');
      const uniqueDepts = [...new Set(participantUsers.map(u => u.department?.toString()).filter(Boolean))];
      roomData.departments = uniqueDepts;
    }

    // Set moderators based on room type
    if (type === 'department') {
      const deptUsers = await User.find({
        department,
        role: { $in: ['local_admin', 'faculty'] }
      });
      roomData.moderators = deptUsers.map(u => u._id);
    } else if (type === 'class') {
      const faculty = await User.find({
        department,
        role: 'faculty'
      });
      roomData.moderators = faculty.map(u => u._id);
    } else if (type === 'private-group') {
      // Creator is the moderator for private-group
      roomData.moderators = [req.user._id];
    }

    const chatRoom = await ChatRoom.create(roomData);
    await chatRoom.populate('department', 'name code');
    await chatRoom.populate('departments', 'name code');
    await chatRoom.populate('participants', 'name email role');

    res.status(201).json({
      success: true,
      message: 'Chat room created successfully',
      data: chatRoom
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating chat room'
    });
  }
};

// @desc    Get user's chat rooms
// @route   GET /api/chat/rooms
// @access  Private
exports.getChatRooms = async (req, res) => {
  try {
    let query = { isActive: true };

    if (req.user.role === 'student') {
      query.$or = [
        {
          type: 'department',
          department: req.user.department,
          $or: [
            { targetAudience: 'all' },
            { targetAudience: 'students' },
            { targetAudience: { $exists: false } }, // backward compatibility
            { targetAudience: 'custom', participants: req.user._id }
          ]
        },
        {
          type: 'class',
          department: req.user.department,
          year: req.user.year,
          batch: req.user.batch
        },
        {
          type: 'private',
          participants: req.user._id
        },
        {
          type: 'private-group',
          participants: req.user._id
        }
      ];
    } else if (req.user.role === 'faculty') {
      query.$or = [
        {
          type: 'department',
          department: req.user.department,
          $or: [
            { targetAudience: 'all' },
            { targetAudience: 'faculty' },
            { targetAudience: 'faculty-deo' },
            { targetAudience: { $exists: false } }, // backward compatibility
            { targetAudience: 'custom', participants: req.user._id }
          ]
        },
        {
          type: 'class',
          department: req.user.department
        },
        {
          type: 'private',
          participants: req.user._id
        },
        {
          type: 'private-group',
          participants: req.user._id
        }
      ];
    } else if (req.user.role === 'local_admin') {
      query.$or = [
        {
          department: req.user.department,
          $or: [
            { targetAudience: 'all' },
            { targetAudience: 'deo' },
            { targetAudience: 'faculty-deo' },
            { targetAudience: { $exists: false } }, // backward compatibility
            { targetAudience: 'custom', participants: req.user._id }
          ]
        },
        {
          type: 'private',
          participants: req.user._id
        },
        {
          type: 'private-group',
          participants: req.user._id
        }
      ];
    }

    const chatRooms = await ChatRoom.find(query)
      .populate('department', 'name code')
      .populate('departments', 'name code')
      .populate('lastMessage')
      .populate('participants', 'name email role')
      .sort({ lastMessageAt: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: chatRooms.length,
      data: chatRooms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching chat rooms'
    });
  }
};

// @desc    Get single chat room
// @route   GET /api/chat/rooms/:id
// @access  Private
exports.getChatRoom = async (req, res) => {
  try {
    const chatRoom = await ChatRoom.findById(req.params.id)
      .populate('department', 'name code')
      .populate('participants', 'name email role profilePicture')
      .populate('moderators', 'name email role');

    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }

    res.status(200).json({
      success: true,
      data: chatRoom
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching chat room'
    });
  }
};

// @desc    Get messages for a chat room
// @route   GET /api/chat/rooms/:id/messages
// @access  Private
exports.getChatMessages = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Use lean() for faster queries (30-40% performance boost)
    const messages = await ChatMessage.find({
      chatRoom: req.params.id,
      isDeleted: false
    })
      .populate('sender', 'name email role profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(); // Convert to plain JS objects for faster processing

    // Use estimatedDocumentCount for better performance on large collections
    const total = await ChatMessage.countDocuments({
      chatRoom: req.params.id,
      isDeleted: false
    });

    res.status(200).json({
      success: true,
      count: messages.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: messages.reverse() // Return in chronological order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching messages'
    });
  }
};

// @desc    Send message (HTTP fallback)
// @route   POST /api/chat/rooms/:id/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { message, messageType } = req.body;

    const messageData = {
      chatRoom: req.params.id,
      sender: req.user._id,
      message: message || '',
      messageType: messageType || 'text'
    };

    // Handle file attachments - upload to cloud storage if configured
    if (req.files && req.files.length > 0) {
      if (isCloudStorageConfigured()) {
        try {
          console.log(`☁️ Uploading ${req.files.length} chat files to ${getStorageType()}...`);
          
          // Upload files to Google Drive/S3
          const uploadPromises = req.files.map(async (file) => {
            try {
              const cloudUrl = await uploadFile(file.buffer, file.originalname, file.mimetype);
              return {
                fileName: file.originalname,
                fileUrl: cloudUrl,
                fileType: file.mimetype,
                fileSize: file.size,
                uploadedAt: new Date()
              };
            } catch (error) {
              console.error(`❌ Failed to upload chat file ${file.originalname}:`, error.message);
              throw error;
            }
          });
          
          messageData.attachments = await Promise.all(uploadPromises);
          console.log('✅ All chat files uploaded to cloud storage');
        } catch (cloudError) {
          console.error('❌ Cloud storage upload failed, falling back to local storage:', cloudError.message);
          // Fallback to local storage if cloud upload fails
          messageData.attachments = req.files.map(file => ({
            fileName: file.originalname,
            fileUrl: file.filename ? `/api/uploads/${file.filename}` : null,
            fileType: file.mimetype,
            fileSize: file.size,
            uploadedAt: new Date(),
            error: 'Cloud storage failed, using local storage'
          })).filter(att => att.fileUrl); // Only include files that were saved locally
        }
      } else {
        // Fallback to local storage
        console.log('📁 Using local storage for chat files');
        messageData.attachments = req.files.map(file => ({
          fileName: file.originalname,
          fileUrl: `/api/uploads/${file.filename}`,
          fileType: file.mimetype,
          fileSize: file.size,
          uploadedAt: new Date()
        }));
      }
      
      // Set message type based on first file
      if (req.files[0].mimetype.startsWith('image/')) {
        messageData.messageType = 'image';
      } else {
        messageData.messageType = 'file';
      }
    }

    const chatMessage = await ChatMessage.create(messageData);

    await chatMessage.populate('sender', 'name email role profilePicture');

    // Update chat room (non-blocking)
    ChatRoom.findByIdAndUpdate(req.params.id, {
      lastMessage: chatMessage._id,
      lastMessageAt: Date.now()
    }).exec();

    // Emit message via socket.io for real-time delivery
    const io = req.app.get('io');
    if (io) {
      io.to(`chat-${req.params.id}`).emit('new-message', chatMessage);
    }

    res.status(201).json({
      success: true,
      data: chatMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message'
    });
  }
};

// @desc    Delete message
// @route   DELETE /api/chat/messages/:id
// @access  Private (Moderator)
exports.deleteMessage = async (req, res) => {
  try {
    const message = await ChatMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is moderator or message sender
    const chatRoom = await ChatRoom.findById(message.chatRoom);
    const isModerator = chatRoom.moderators.some(
      mod => mod.toString() === req.user._id.toString()
    );
    const isSender = message.sender.toString() === req.user._id.toString();

    if (!isModerator && !isSender) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message'
      });
    }

    // Delete files from cloud storage if they exist
    if (message.attachments && message.attachments.length > 0 && isCloudStorageConfigured()) {
      console.log(`🗑️ Deleting ${message.attachments.length} files from ${getStorageType()}...`);
      for (const attachment of message.attachments) {
        try {
          await deleteFile(attachment.fileUrl);
          console.log(`✅ Deleted file: ${attachment.fileName}`);
        } catch (error) {
          console.error(`⚠️ Failed to delete file ${attachment.fileName}:`, error.message);
          // Continue even if deletion fails
        }
      }
    }

    message.isDeleted = true;
    message.deletedBy = req.user._id;
    message.deletedAt = Date.now();
    await message.save();

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting message'
    });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/chat/rooms/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const { messageIds } = req.body;

    await ChatMessage.updateMany(
      {
        _id: { $in: messageIds },
        chatRoom: req.params.id
      },
      {
        $addToSet: {
          readBy: {
            user: req.user._id,
            readAt: Date.now()
          }
        }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error marking messages as read'
    });
  }
};

// @desc    Create private chat
// @route   POST /api/chat/private
// @access  Private (Faculty, Admin)
exports.createPrivateChat = async (req, res) => {
  try {
    const { participantId } = req.body;

    // Check if private chat already exists
    const existingRoom = await ChatRoom.findOne({
      type: 'private',
      participants: { $all: [req.user._id, participantId] }
    });

    if (existingRoom) {
      return res.status(200).json({
        success: true,
        data: existingRoom
      });
    }

    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    const chatRoom = await ChatRoom.create({
      name: `Private chat`,
      type: 'private',
      participants: [req.user._id, participantId],
      moderators: [req.user._id, participantId],
      createdBy: req.user._id
    });

    await chatRoom.populate('participants', 'name email role profilePicture');

    res.status(201).json({
      success: true,
      data: chatRoom
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating private chat'
    });
  }
};
