const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  senderEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  receiverEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'responded'],
    default: 'pending'
  },
  response: {
    type: String,
    trim: true,
    default: ''
  },
  attachments: [{
    filename: String,
    path: String,
    mimetype: String
  }],
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  respondedAt: {
    type: Date
  }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
