const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { sendEmployeeCredentials } = require('../utils/emailService');
const { generatePassword } = require('../utils/passwordGenerator');

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
    
    // Check if employee exists
    const employee = await Employee.findOne({ email });
    if (!employee) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Validate password
    const isMatch = await employee.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { id: employee.id, role: employee.role },
      process.env.JWT_SECRET || 'jwtSecret',
      { expiresIn: '1d' }
    );
    
    res.json({
      token,
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

module.exports = router;


