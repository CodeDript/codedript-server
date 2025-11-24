const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  agreement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agreement',
    required: [true, 'Agreement reference is required'],
    index: true
  },
  participants: {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Client reference is required']
    },
    developer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Developer reference is required']
    }
  },
  lastMessage: {
    text: {
      type: String
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sentAt: {
      type: Date
    }
  },
  unreadCount: {
    client: {
      type: Number,
      default: 0
    },
    developer: {
      type: Number,
      default: 0
    }
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'archived', 'closed'],
      message: '{VALUE} is not a valid status'
    },
    default: 'active',
    index: true
  },
  metadata: {
    isActive: {
      type: Boolean,
      default: true
    },
    lastActivityAt: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes
chatSchema.index({ 'participants.client': 1, status: 1 });
chatSchema.index({ 'participants.developer': 1, status: 1 });
chatSchema.index({ agreement: 1 }, { unique: true });
chatSchema.index({ 'metadata.lastActivityAt': -1 });

// Virtual for messages
chatSchema.virtual('messages', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'chat'
});

// Virtual for total unread
chatSchema.virtual('totalUnread').get(function() {
  return this.unreadCount.client + this.unreadCount.developer;
});

// Method to mark messages as read
chatSchema.methods.markAsRead = async function(userId) {
  const Message = mongoose.model('Message');
  
  // Determine user role
  const isClient = this.participants.client.toString() === userId.toString();
  const isDeveloper = this.participants.developer.toString() === userId.toString();
  
  if (!isClient && !isDeveloper) {
    throw new Error('User is not a participant in this chat');
  }
  
  // Update unread messages
  await Message.updateMany(
    {
      chat: this._id,
      sender: { $ne: userId },
      isRead: false
    },
    {
      isRead: true,
      readAt: new Date()
    }
  );
  
  // Reset unread count
  if (isClient) {
    this.unreadCount.client = 0;
  } else {
    this.unreadCount.developer = 0;
  }
  
  return this.save({ validateBeforeSave: false });
};

// Method to update last message
chatSchema.methods.updateLastMessage = async function(message) {
  this.lastMessage = {
    text: message.text,
    sender: message.sender,
    sentAt: message.createdAt
  };
  this.metadata.lastActivityAt = new Date();
  
  return this.save({ validateBeforeSave: false });
};

// Method to increment unread count
chatSchema.methods.incrementUnread = async function(recipientRole) {
  if (recipientRole === 'client') {
    this.unreadCount.client += 1;
  } else if (recipientRole === 'developer') {
    this.unreadCount.developer += 1;
  }
  
  return this.save({ validateBeforeSave: false });
};

// Static method to find chats by user
chatSchema.statics.findByUser = function(userId, status = 'active') {
  const query = {
    $or: [
      { 'participants.client': userId },
      { 'participants.developer': userId }
    ],
    'metadata.isActive': true
  };
  
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('participants.client participants.developer', 'profile email walletAddress')
    .populate('agreement', 'agreementId project.name status')
    .sort({ 'metadata.lastActivityAt': -1 });
};

// Static method to find or create chat for agreement
chatSchema.statics.findOrCreateByAgreement = async function(agreementId, clientId, developerId) {
  let chat = await this.findOne({ agreement: agreementId });
  
  if (!chat) {
    chat = await this.create({
      agreement: agreementId,
      participants: {
        client: clientId,
        developer: developerId
      }
    });
  }
  
  return chat.populate('participants.client participants.developer agreement');
};

module.exports = mongoose.model('Chat', chatSchema);
