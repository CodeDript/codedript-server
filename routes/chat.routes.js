const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { authenticate } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');

/**
 * @route   GET /api/v1/chats/unread/count
 * @desc    Get total unread message count
 * @access  Private
 */
router.get('/unread/count', authenticate, chatController.getUnreadCount);

/**
 * @route   GET /api/v1/chats
 * @desc    Get all chats for current user
 * @access  Private
 */
router.get('/', authenticate, chatController.getAllChats);

/**
 * @route   POST /api/v1/chats/agreement/:agreementId
 * @desc    Get or create chat for agreement
 * @access  Private
 */
router.post('/agreement/:agreementId', authenticate, chatController.getOrCreateChat);

/**
 * @route   GET /api/v1/chats/:id
 * @desc    Get chat by ID
 * @access  Private
 */
router.get('/:id', authenticate, chatController.getChatById);

/**
 * @route   POST /api/v1/chats/:id/read
 * @desc    Mark all messages in chat as read
 * @access  Private
 */
router.post('/:id/read', authenticate, chatController.markChatAsRead);

/**
 * @route   POST /api/v1/chats/:id/archive
 * @desc    Archive chat
 * @access  Private
 */
router.post('/:id/archive', authenticate, chatController.archiveChat);

/**
 * @route   GET /api/v1/chats/:id/messages/search
 * @desc    Search messages in chat
 * @access  Private
 */
router.get('/:id/messages/search', authenticate, chatController.searchMessages);

/**
 * @route   GET /api/v1/chats/:id/messages
 * @desc    Get all messages in chat
 * @access  Private
 */
router.get('/:id/messages', authenticate, chatController.getChatMessages);

/**
 * @route   POST /api/v1/chats/:id/messages
 * @desc    Send message in chat
 * @access  Private
 */
router.post('/:id/messages', authenticate, upload.array('files', 5), chatController.sendMessage);

/**
 * @route   PUT /api/v1/chats/:chatId/messages/:messageId
 * @desc    Edit message
 * @access  Private (Sender only)
 */
router.put('/:chatId/messages/:messageId', authenticate, chatController.editMessage);

/**
 * @route   DELETE /api/v1/chats/:chatId/messages/:messageId
 * @desc    Delete message
 * @access  Private (Sender only)
 */
router.delete('/:chatId/messages/:messageId', authenticate, chatController.deleteMessage);

module.exports = router;
