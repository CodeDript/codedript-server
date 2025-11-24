const { catchAsync, AppError } = require('../middlewares/errorHandler');
const { sendSuccessResponse, sendCreatedResponse, sendPaginatedResponse } = require('../utils/responseHandler');
const { uploadToSupabase } = require('../services/supabaseService');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Agreement = require('../models/Agreement');

/**
 * Get all chats for current user
 * @route GET /api/v1/chats
 * @access Private
 */
exports.getAllChats = catchAsync(async (req, res, next) => {
  const { status } = req.query;
  
  const chats = await Chat.findByUser(req.user._id, status);
  
  sendSuccessResponse(res, 200, 'Chats retrieved successfully', chats);
});

/**
 * Get or create chat for agreement
 * @route POST /api/v1/chats/agreement/:agreementId
 * @access Private
 */
exports.getOrCreateChat = catchAsync(async (req, res, next) => {
  const agreement = await Agreement.findById(req.params.agreementId);
  
  if (!agreement) {
    return next(new AppError('Agreement not found', 404));
  }
  
  // Check if user is part of the agreement
  const isClient = agreement.client.toString() === req.user._id.toString();
  const isDeveloper = agreement.developer.toString() === req.user._id.toString();
  
  if (!isClient && !isDeveloper) {
    return next(new AppError('You are not part of this agreement', 403));
  }
  
  const chat = await Chat.findOrCreateByAgreement(
    agreement._id,
    agreement.client,
    agreement.developer
  );
  
  sendSuccessResponse(res, 200, 'Chat retrieved successfully', chat);
});

/**
 * Get chat by ID
 * @route GET /api/v1/chats/:id
 * @access Private
 */
exports.getChatById = catchAsync(async (req, res, next) => {
  const chat = await Chat.findById(req.params.id)
    .populate('participants.client participants.developer', 'profile email walletAddress')
    .populate('agreement', 'agreementId project.name status');
  
  if (!chat) {
    return next(new AppError('Chat not found', 404));
  }
  
  // Check if user is a participant
  const isClient = chat.participants.client._id.toString() === req.user._id.toString();
  const isDeveloper = chat.participants.developer._id.toString() === req.user._id.toString();
  
  if (!isClient && !isDeveloper) {
    return next(new AppError('You do not have access to this chat', 403));
  }
  
  sendSuccessResponse(res, 200, 'Chat retrieved successfully', chat);
});

/**
 * Mark chat as read
 * @route POST /api/v1/chats/:id/read
 * @access Private
 */
exports.markChatAsRead = catchAsync(async (req, res, next) => {
  const chat = await Chat.findById(req.params.id);
  
  if (!chat) {
    return next(new AppError('Chat not found', 404));
  }
  
  // Check if user is a participant
  const isClient = chat.participants.client.toString() === req.user._id.toString();
  const isDeveloper = chat.participants.developer.toString() === req.user._id.toString();
  
  if (!isClient && !isDeveloper) {
    return next(new AppError('You do not have access to this chat', 403));
  }
  
  await chat.markAsRead(req.user._id);
  
  sendSuccessResponse(res, 200, 'Messages marked as read', chat);
});

/**
 * Archive chat
 * @route POST /api/v1/chats/:id/archive
 * @access Private
 */
exports.archiveChat = catchAsync(async (req, res, next) => {
  const chat = await Chat.findById(req.params.id);
  
  if (!chat) {
    return next(new AppError('Chat not found', 404));
  }
  
  // Check if user is a participant
  const isClient = chat.participants.client.toString() === req.user._id.toString();
  const isDeveloper = chat.participants.developer.toString() === req.user._id.toString();
  
  if (!isClient && !isDeveloper) {
    return next(new AppError('You do not have access to this chat', 403));
  }
  
  chat.status = 'archived';
  await chat.save();
  
  sendSuccessResponse(res, 200, 'Chat archived successfully', chat);
});

/**
 * Get unread chat count
 * @route GET /api/v1/chats/unread/count
 * @access Private
 */
exports.getUnreadCount = catchAsync(async (req, res, next) => {
  const chats = await Chat.find({
    $or: [
      { 'participants.client': req.user._id },
      { 'participants.developer': req.user._id }
    ],
    status: 'active',
    'metadata.isActive': true
  });
  
  let totalUnread = 0;
  
  chats.forEach(chat => {
    const isClient = chat.participants.client.toString() === req.user._id.toString();
    totalUnread += isClient ? chat.unreadCount.client : chat.unreadCount.developer;
  });
  
  sendSuccessResponse(res, 200, 'Unread count retrieved', {
    totalUnread,
    chatsWithUnread: chats.filter(c => {
      const isClient = c.participants.client.toString() === req.user._id.toString();
      return isClient ? c.unreadCount.client > 0 : c.unreadCount.developer > 0;
    }).length
  });
});

/**
 * Get chat messages
 * @route GET /api/v1/chats/:id/messages
 * @access Private
 */
exports.getChatMessages = catchAsync(async (req, res, next) => {
  const chat = await Chat.findById(req.params.id);
  
  if (!chat) {
    return next(new AppError('Chat not found', 404));
  }
  
  // Check if user is a participant
  const isClient = chat.participants.client.toString() === req.user._id.toString();
  const isDeveloper = chat.participants.developer.toString() === req.user._id.toString();
  
  if (!isClient && !isDeveloper) {
    return next(new AppError('You do not have access to this chat', 403));
  }
  
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const beforeDate = req.query.before;
  
  const [messages, total] = await Promise.all([
    Message.findByChat(req.params.id, { page, limit, beforeDate }),
    Message.countDocuments({ chat: req.params.id, isDeleted: false })
  ]);
  
  // Reverse to show oldest first
  const orderedMessages = messages.reverse();
  
  sendPaginatedResponse(res, 200, 'Messages retrieved successfully', orderedMessages, {
    page,
    limit,
    total
  });
});

/**
 * Send message
 * @route POST /api/v1/chats/:id/messages
 * @access Private
 */
exports.sendMessage = catchAsync(async (req, res, next) => {
  const { text, type } = req.body;
  const chat = await Chat.findById(req.params.id);
  
  if (!chat) {
    return next(new AppError('Chat not found', 404));
  }
  
  // Check if user is a participant
  const isClient = chat.participants.client.toString() === req.user._id.toString();
  const isDeveloper = chat.participants.developer.toString() === req.user._id.toString();
  
  if (!isClient && !isDeveloper) {
    return next(new AppError('You do not have access to this chat', 403));
  }
  
  if (!text || text.trim().length === 0) {
    return next(new AppError('Message text is required', 400));
  }
  
  // Handle file attachments if present
  const attachments = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const url = await uploadToSupabase(file, 'chat-attachments');
      attachments.push({
        name: file.originalname,
        url,
        size: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date()
      });
    }
  }
  
  const message = await Message.create({
    chat: chat._id,
    sender: req.user._id,
    text: text.trim(),
    type: type || 'text',
    attachments
  });
  
  const populatedMessage = await Message.findById(message._id)
    .populate('sender', 'profile.name profile.avatar email');
  
  sendCreatedResponse(res, 'Message sent successfully', populatedMessage);
});

/**
 * Edit message
 * @route PUT /api/v1/chats/:chatId/messages/:messageId
 * @access Private
 */
exports.editMessage = catchAsync(async (req, res, next) => {
  const { text } = req.body;
  const message = await Message.findById(req.params.messageId);
  
  if (!message) {
    return next(new AppError('Message not found', 404));
  }
  
  // Check if user is the sender
  if (message.sender.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only edit your own messages', 403));
  }
  
  if (message.isDeleted) {
    return next(new AppError('Cannot edit deleted message', 400));
  }
  
  if (!text || text.trim().length === 0) {
    return next(new AppError('Message text is required', 400));
  }
  
  message.text = text.trim();
  await message.save();
  
  sendSuccessResponse(res, 200, 'Message updated successfully', message);
});

/**
 * Delete message
 * @route DELETE /api/v1/chats/:chatId/messages/:messageId
 * @access Private
 */
exports.deleteMessage = catchAsync(async (req, res, next) => {
  const message = await Message.findById(req.params.messageId);
  
  if (!message) {
    return next(new AppError('Message not found', 404));
  }
  
  // Check if user is the sender
  if (message.sender.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only delete your own messages', 403));
  }
  
  await message.softDelete();
  
  sendSuccessResponse(res, 200, 'Message deleted successfully', null);
});

/**
 * Search messages in chat
 * @route GET /api/v1/chats/:id/messages/search
 * @access Private
 */
exports.searchMessages = catchAsync(async (req, res, next) => {
  const { q } = req.query;
  const chat = await Chat.findById(req.params.id);
  
  if (!chat) {
    return next(new AppError('Chat not found', 404));
  }
  
  // Check if user is a participant
  const isClient = chat.participants.client.toString() === req.user._id.toString();
  const isDeveloper = chat.participants.developer.toString() === req.user._id.toString();
  
  if (!isClient && !isDeveloper) {
    return next(new AppError('You do not have access to this chat', 403));
  }
  
  if (!q || q.trim().length < 2) {
    return next(new AppError('Search query must be at least 2 characters', 400));
  }
  
  const messages = await Message.find({
    chat: req.params.id,
    text: { $regex: q, $options: 'i' },
    isDeleted: false
  })
    .populate('sender', 'profile.name profile.avatar email')
    .sort({ createdAt: -1 })
    .limit(50);
  
  sendSuccessResponse(res, 200, 'Search results', messages);
});
