const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { sendEmployeeCredentials } = require('../utils/emailService');
const { generatePassword } = require('../utils/passwordGenerator');
const bcrypt = require('bcryptjs');
const employeeAuth = require('../middleware/employeeAuth');

// Add a new employee (admin only)
router.post('/add', auth, async (req, res) => {
  try {
    // Verify that the requester is an admin
    if (req.admin.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to add employees' });
    }

    const { username, email, role } = req.body;
    
    // Check if employee already exists
    let employee = await Employee.findOne({ email });
    if (employee) {
      return res.status(400).json({ message: 'Employee with this email already exists' });
    }
    
    // Get admin details to set company name
    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    // Generate a random password
    const generatedPassword = generatePassword();
    
    // Create new employee
    employee = new Employee({
      username,
      email,
      password: generatedPassword, // Will be hashed by the pre-save hook
      companyName: admin.companyName,
      role: role || 'employee',
      admin: admin._id
    });
    
    await employee.save();
    
    // Send credentials to employee's email
    const emailSent = await sendEmployeeCredentials(
      email, 
      username, 
      generatedPassword, 
      admin.companyName
    );
    
    res.status(201).json({
      message: 'Employee added successfully',
      emailSent: emailSent,
      employee: {
        id: employee.id,
        username: employee.username,
        email: employee.email,
        companyName: employee.companyName,
        role: employee.role
      }
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all employees for the admin's company
router.get('/', auth, async (req, res) => {
  try {
    // Verify that the requester is an admin
    if (req.admin.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view employees' });
    }
    
    const employees = await Employee.find({ admin: req.admin.id }).select('-password');
    res.json(employees);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Employee login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find employee by email
    const employee = await Employee.findOne({ email });
    if (!employee) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, employee.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const payload = {
      employee: {
        id: employee.id,
        role: employee.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'jwtSecret',
      { expiresIn: '1d' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          employee: {
            id: employee.id,
            username: employee.username,
            email: employee.email,
            role: employee.role,
            companyName: employee.companyName
          }
        });
      }
    );
  } catch (error) {
    console.error('Employee login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get employee by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).select('-password');
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Check if the requester is the admin who created this employee
    if (req.admin.role === 'admin' && employee.admin.toString() !== req.admin.id) {
      return res.status(403).json({ message: 'Not authorized to access this employee' });
    }
    
    res.json(employee);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete an employee (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Verify that the requester is an admin
    if (req.admin.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete employees' });
    }
    
    // Find the employee
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Check if the employee belongs to this admin
    if (employee.admin.toString() !== req.admin.id) {
      return res.status(403).json({ message: 'Not authorized to delete this employee' });
    }
    
    // Delete the employee using findByIdAndDelete (recommended method)
    await Employee.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Employee removed successfully' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current employee profile
router.get('/me', employeeAuth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.employee.id).select('-password');
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    res.json(employee);
  } catch (error) {
    console.error('Error fetching employee profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update employee profile
router.put('/profile', employeeAuth, async (req, res) => {
  try {
    const { username, email } = req.body;
    
    // Validate input
    if (!username || !email) {
      return res.status(400).json({ message: 'Please provide username and email' });
    }
    
    // Check if email is already in use by another employee
    if (email !== req.employee.email) {
      const existingEmployee = await Employee.findOne({ email, _id: { $ne: req.employee.id } });
      if (existingEmployee) {
        return res.status(400).json({ message: 'Email is already in use by another employee' });
      }
    }
    
    // Build update object
    const updateFields = {};
    if (username) updateFields.username = username;
    if (email) updateFields.email = email;
    
    // Update employee
    const employee = await Employee.findByIdAndUpdate(
      req.employee.id,
      { $set: updateFields },
      { new: true }
    ).select('-password');
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    res.json(employee);
  } catch (error) {
    console.error('Error updating employee profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Change password
router.put('/change-password', employeeAuth, async (req, res) => {
  try {
    console.log('Change password request received');
    const { currentPassword, newPassword } = req.body;
    
    // Log request data (without sensitive info)
    console.log('Request body received:', { 
      hasCurrentPassword: !!currentPassword,
      hasNewPassword: !!newPassword
    });
    
    // Log employee ID from token
    console.log('Employee ID from token:', req.employee.id);
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new passwords' });
    }
    
    // Find employee
    const employee = await Employee.findById(req.employee.id);
    if (!employee) {
      console.log('Employee not found with ID:', req.employee.id);
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    console.log('Employee found:', employee.email);
    
    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, employee.password);
    console.log('Current password match:', isMatch);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Generate salt and hash new password directly
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password directly in database to avoid any issues with pre-save hooks
    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.employee.id,
      { $set: { password: hashedPassword } },
      { new: true }
    );
    
    if (!updatedEmployee) {
      console.log('Failed to update employee password');
      return res.status(500).json({ message: 'Failed to update password' });
    }
    
    console.log('Employee password updated successfully');
    
    // Test the new password to ensure it works
    const verifyNewPassword = await bcrypt.compare(newPassword, updatedEmployee.password);
    console.log('New password verification:', verifyNewPassword ? 'Success' : 'Failed');
    
    res.json({ 
      message: 'Password updated successfully',
      verified: verifyNewPassword
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add this new route to get company details for an employee
router.get('/company-details', employeeAuth, async (req, res) => {
  try {
    // Get the employee details
    const employee = await Employee.findById(req.employee.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Check if admin ID exists
    if (!employee.admin) {
      return res.status(404).json({ message: 'No admin associated with this employee' });
    }
    
    // Find the company based on the admin who created this employee
    const company = await Company.findOne({ admin: employee.admin });
    
    if (!company) {
      return res.status(404).json({ message: 'Company information not found' });
    }
    
    res.json(company);
  } catch (error) {
    console.error('Error fetching company details for employee:', error);
    res.status(500).json({ message: 'Server error', error: error.toString() });
  }
});

// Add this new route to get company details by name
router.get('/company-by-name/:companyName', employeeAuth, async (req, res) => {
  try {
    const { companyName } = req.params;
    
    if (!companyName) {
      return res.status(400).json({ message: 'Company name is required' });
    }
    
    // Log for debugging
    console.log(`Searching for company with name: ${companyName}`);
    
    // Make sure Company model is properly imported
    const Company = require('../models/Company');
    
    // Find the company by name (case-insensitive)
    const company = await Company.findOne({ 
      name: { $regex: new RegExp('^' + companyName + '$', 'i') } 
    });
    
    if (!company) {
      console.log(`No company found with name: ${companyName}`);
      return res.status(404).json({ message: 'Company information not found' });
    }
    
    console.log(`Found company: ${company.name}`);
    res.json(company);
  } catch (error) {
    console.error('Error fetching company by name:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.toString(),
      stack: error.stack 
    });
  }
});

module.exports = router;










