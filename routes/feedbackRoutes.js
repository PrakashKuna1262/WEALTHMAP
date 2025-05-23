const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Feedback = require('../models/Feedback');
const Admin = require('../models/Admin');
const auth = require('../middleware/auth');
const multer = require('multer');
const { sendFeedbackNotification, sendFeedbackResponse } = require('../utils/emailService');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Submit new feedback
router.post('/', auth, upload.array('attachments', 5), async (req, res) => {
  try {
    const { receiverEmail, subject, description } = req.body;
    
    // Validate required fields
    if (!receiverEmail || !subject || !description) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Get admin details
    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    // Create attachments array from uploaded files
    const attachments = req.files ? req.files.map(file => ({
      filename: file.originalname,
      path: file.path,
      mimetype: file.mimetype
    })) : [];
    
    console.log('Creating new feedback with data:', {
      senderEmail: req.admin.email || admin.email,
      receiverEmail,
      subject,
      description,
      companyName: admin.companyName,
      attachmentsCount: attachments.length,
      adminId: admin._id
    });
    
    // Create new feedback
    const feedback = new Feedback({
      senderEmail: req.admin.email || admin.email,
      receiverEmail,
      subject,
      description,
      companyName: admin.companyName,
      attachments,
      admin: admin._id
    });
    
    await feedback.save();
    
    // Send email notification to receiver
    try {
      await sendFeedbackNotification(
        receiverEmail,
        subject,
        admin.companyName,
        req.admin.username || admin.username
      );
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Continue even if email fails
    }
    
    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback: {
        id: feedback._id,
        subject: feedback.subject,
        sentAt: feedback.sentAt
      }
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all feedback for admin
router.get('/admin', auth, async (req, res) => {
  try {
    if (req.admin.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view all feedback' });
    }
    
    const feedback = await Feedback.find({ admin: req.admin.id })
      .sort({ sentAt: -1 });
    
    res.json(feedback);
  } catch (error) {
    console.error('Error fetching admin feedback:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get feedback for employee (by email)
router.get('/employee', auth, async (req, res) => {
  try {
    // Get admin to find company name
    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    // Find feedback where user is sender or receiver
    const feedback = await Feedback.find({
      $or: [
        { senderEmail: req.admin.email, companyName: admin.companyName },
        { receiverEmail: req.admin.email, companyName: admin.companyName }
      ]
    }).sort({ sentAt: -1 });
    
    res.json(feedback);
  } catch (error) {
    console.error('Error fetching employee feedback:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Special route for /new (must come before /:id route)
router.get('/new', auth, (req, res) => {
  // Return an empty feedback template or redirect as needed
  res.json({
    _id: 'new',
    subject: '',
    description: '',
    senderEmail: req.admin.email,
    receiverEmail: '',
    status: 'pending',
    attachments: [],
    sentAt: new Date(),
    isNew: true
  });
});

// Get single feedback by ID
router.get('/:id', auth, async (req, res) => {
  try {
    // Special case for "new" (should be handled by the route above)
    if (req.params.id === 'new') {
      return res.status(400).json({ message: 'Invalid feedback ID' });
    }
    
    // Check if the ID is valid
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid feedback ID format' });
    }
    
    console.log(`Fetching feedback with ID: ${req.params.id}`);
    
    // Use lean() for better performance and to avoid potential issues with Mongoose documents
    const feedback = await Feedback.findById(req.params.id).lean();
    
    if (!feedback) {
      console.log(`Feedback with ID ${req.params.id} not found`);
      return res.status(404).json({ message: 'Feedback not found' });
    }
    
    console.log(`Found feedback: ${feedback._id}`);
    
    // Check if admin exists in the feedback document
    if (!feedback.admin) {
      console.error('Feedback has no admin property:', feedback);
      return res.status(500).json({ message: 'Invalid feedback data: missing admin reference' });
    }
    
    console.log(`Feedback admin ID: ${feedback.admin}`);
    console.log(`Request admin ID: ${req.admin.id}, email: ${req.admin.email}`);
    
    // Convert ObjectId to string for comparison
    const feedbackAdminId = feedback.admin.toString();
    
    // Check if user is authorized to view this feedback
    const isAdmin = feedbackAdminId === req.admin.id;
    const isSender = feedback.senderEmail === req.admin.email;
    const isReceiver = feedback.receiverEmail === req.admin.email;
    
    console.log(`Authorization check: isAdmin=${isAdmin}, isSender=${isSender}, isReceiver=${isReceiver}`);
    
    if (!isAdmin && !isSender && !isReceiver) {
      return res.status(403).json({ message: 'Not authorized to view this feedback' });
    }
    
    res.json(feedback);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Respond to feedback
router.put('/respond/:id', auth, async (req, res) => {
  try {
    console.log(`Responding to feedback ID: ${req.params.id}`);
    console.log(`Request body:`, req.body);
    
    const { response } = req.body;
    
    if (!response) {
      return res.status(400).json({ message: 'Response is required' });
    }
    
    // Check if the ID is valid
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid feedback ID format' });
    }
    
    // Find feedback
    const feedback = await Feedback.findById(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    
    console.log(`Found feedback: ${feedback._id}, admin: ${feedback.admin}`);
    console.log(`Request admin ID: ${req.admin.id}`);
    
    // Check if user is authorized to respond
    if (feedback.admin.toString() !== req.admin.id) {
      return res.status(403).json({ message: 'Not authorized to respond to this feedback' });
    }
    
    // Update feedback
    feedback.response = response;
    feedback.status = 'responded';
    feedback.respondedAt = Date.now();
    
    await feedback.save();
    
    console.log(`Feedback updated successfully. New status: ${feedback.status}`);
    
    // Send email notification to sender
    try {
      await sendFeedbackResponse(
        feedback.senderEmail,
        feedback.subject,
        response,
        req.admin.username || 'Admin'
      );
      console.log(`Email notification sent to ${feedback.senderEmail}`);
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Continue even if email fails
    }
    
    res.json({
      message: 'Response sent successfully',
      feedback
    });
  } catch (error) {
    console.error('Error responding to feedback:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark feedback as reviewed
router.put('/review/:id', auth, async (req, res) => {
  try {
    // Find feedback
    const feedback = await Feedback.findById(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    
    // Check if user is authorized
    if (feedback.admin.toString() !== req.admin.id) {
      return res.status(403).json({ message: 'Not authorized to update this feedback' });
    }
    
    // Update status
    feedback.status = 'reviewed';
    await feedback.save();
    
    res.json({
      message: 'Feedback marked as reviewed',
      feedback
    });
  } catch (error) {
    console.error('Error updating feedback status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;







