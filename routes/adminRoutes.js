const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');

// ===== PUBLIC ROUTES =====

// Test route - no database interaction
router.get('/test', (req, res) => {
  res.json({ message: 'Admin routes are working' });
});

// Register a new admin
router.post('/register', async (req, res) => {
  console.log('Register request received:', req.body);
  
  try {
    const { username, email, password, companyName } = req.body;
    
    // Check if admin already exists
    let admin = await Admin.findOne({ email });
    if (admin) {
      return res.status(400).json({ message: 'Admin already exists' });
    }
    
    // Create new admin
    admin = new Admin({
      username,
      email,
      password, // Will be hashed by the pre-save hook
      companyName,
      role: 'admin' // Default role
    });
    
    await admin.save();
    
    // Create JWT token
    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET || 'jwtSecret',
      { expiresIn: '1d' }
    );
    
    res.status(201).json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        companyName: admin.companyName,
        role: admin.role
      }
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login admin
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt for email:', req.body.email);
    const { email, password } = req.body;
    
    // Check if admin exists
    const admin = await Admin.findOne({ email });
    if (!admin) {
      console.log('Admin not found with email:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    console.log('Admin found:', admin.username);
    
    // Validate password
    const isMatch = await bcrypt.compare(password, admin.password);
    console.log('Password match result:', isMatch);
    
    if (!isMatch) {
      console.log('Invalid password for admin:', admin.username);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    console.log('Login successful for admin:', admin.username);
    
    // Create JWT token
    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET || 'jwtSecret',
      { expiresIn: '1d' }
    );
    
    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        companyName: admin.companyName,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===== PROTECTED ROUTES WITH SPECIFIC PATHS =====
// These must come BEFORE any routes with path parameters like :id

// Change password (protected route)
router.put('/change-password', auth, async (req, res) => {
  try {
    console.log('Change password request received');
    const { currentPassword, newPassword } = req.body;
    
    // Log request details (for debugging)
    console.log('Admin ID from token:', req.admin.id);
    
    // Find admin by ID from token
    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
      console.log('Admin not found with ID:', req.admin.id);
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    console.log('Admin found:', admin.username);
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      console.log('Current password is incorrect');
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    console.log('Current password verified successfully');
    
    // Hash new password directly with bcrypt instead of relying on pre-save hook
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password directly in database to avoid any issues with pre-save hooks
    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.admin.id,
      { $set: { password: hashedPassword } },
      { new: true }
    );
    
    if (!updatedAdmin) {
      console.log('Failed to update admin password');
      return res.status(500).json({ message: 'Failed to update password' });
    }
    
    console.log('Admin password updated successfully');
    
    // Test the new password to ensure it works
    const verifyNewPassword = await bcrypt.compare(newPassword, updatedAdmin.password);
    console.log('New password verification:', verifyNewPassword ? 'Success' : 'Failed');
    
    res.json({ 
      message: 'Password updated successfully',
      verified: verifyNewPassword
    });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update admin profile (protected route)
router.put('/update-profile', auth, async (req, res) => {
  try {
    console.log('Update profile request received');
    const { username, email, companyName } = req.body;
    
    // Find admin by ID from token
    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    // Update admin fields
    admin.username = username;
    admin.email = email;
    admin.companyName = companyName;
    
    await admin.save();
    
    // Return updated admin without password
    const updatedAdmin = {
      id: admin._id,
      username: admin.username,
      email: admin.email,
      companyName: admin.companyName,
      role: admin.role
    };
    
    res.json({ 
      message: 'Profile updated successfully',
      admin: updatedAdmin
    });
  } catch (error) {
    console.error('Profile update error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all admins (protected route)
router.get('/', auth, async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    res.json(admins);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===== PROTECTED ROUTES WITH PATH PARAMETERS =====
// These must come AFTER any specific routes to avoid conflicts

// Get admin by ID (protected route)
router.get('/:id', auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).select('-password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.json(admin);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update admin (protected route)
router.put('/:id', auth, async (req, res) => {
  try {
    const { username, email, companyName } = req.body;
    
    // Build admin object
    const adminFields = {};
    if (username) adminFields.username = username;
    if (email) adminFields.email = email;
    if (companyName) adminFields.companyName = companyName;
    
    let admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    admin = await Admin.findByIdAndUpdate(
      req.params.id,
      { $set: adminFields },
      { new: true }
    ).select('-password');
    
    res.json(admin);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete admin (protected route)
router.delete('/:id', auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    await Admin.findByIdAndRemove(req.params.id);
    res.json({ message: 'Admin removed' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;








