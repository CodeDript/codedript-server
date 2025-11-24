const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: [true, 'Chat reference is required'],
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender reference is required'],
    index: true
  },
  text: {
    type: String,
    required: [true, 'Message text is required'],
    trim: true,
    maxlength: [5000, 'Message cannot exceed 5000 characters']
  },
  type: {
    type: String,
    enum: {
      values: ['text', 'file', 'system', 'milestone_update', 'payment_notification'],
      message: '{VALUE} is not a valid message type'
    },
    default: 'text'
  },
  attachments: [{
    name: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    size: {
      type: Number
    },
    mimeType: {
      type: String
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  metadata: {
    milestoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Milestone'
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    action: {
      type: String,
      enum: ['milestone_submitted', 'milestone_approved', 'payment_released', 'other']
    }
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ chat: 1, isRead: 1 });
messageSchema.index({ sender: 1, createdAt: -1 });

// Virtual for is system message
messageSchema.virtual('isSystemMessage').get(function() {
  return this.type === 'system' || 
         this.type === 'milestone_update' || 
         this.type === 'payment_notification';
});

// Pre-save middleware
messageSchema.pre('save', function(next) {
  // Mark as edited if text was modified
  if (this.isModified('text') && !this.isNew) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
  
  next();
});

// Post-save middleware to update chat
messageSchema.post('save', async function(doc) {
  const Chat = mongoose.model('Chat');
  const chat = await Chat.findById(doc.chat);
  
  if (chat) {
    // Update last message
    await chat.updateLastMessage(doc);
    
    // Increment unread count for recipient
    const isFromClient = chat.participants.client.toString() === doc.sender.toString();
    const recipientRole = isFromClient ? 'developer' : 'client';
    await chat.incrementUnread(recipientRole);
  }
});

// Method to mark as read
messageSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    return this.save({ validateBeforeSave: false });
  }
  return this;
};

// Method to soft delete
messageSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save({ validateBeforeSave: false });
};

// Static method to create system message
messageSchema.statics.createSystemMessage = async function(chatId, text, metadata = {}) {
  return this.create({
    chat: chatId,
    sender: null, // System messages have no sender
    text,
    type: metadata.action ? 'milestone_update' : 'system',
    metadata,
    isRead: false
  });
};

// Static method to find messages by chat
messageSchema.statics.findByChat = function(chatId, options = {}) {
  const { page = 1, limit = 50, beforeDate } = options;
  const skip = (page - 1) * limit;
  
  const query = { 
    chat: chatId,
    isDeleted: false
  };
  
  if (beforeDate) {
    query.createdAt = { $lt: new Date(beforeDate) };
  }
  
  return this.find(query)
    .populate('sender', 'profile.name profile.avatar email')
    .populate('metadata.milestoneId', 'title milestoneNumber')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get unread count
messageSchema.statics.getUnreadCount = async function(chatId, userId) {
  return this.countDocuments({
    chat: chatId,
    sender: { $ne: userId },
    isRead: false,
    isDeleted: false
  });
};

module.exports = mongoose.model('Message', messageSchema);
