const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/company');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Get company details
router.get('/', auth, async (req, res) => {
  try {
    const company = await Company.findOne({ admin: req.admin.id });
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    res.json(company);
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create or update company
router.post('/', auth, upload.single('logo'), async (req, res) => {
  try {
    const {
      name,
      description,
      industry,
      website,
      phone,
      email,
      address,
      city,
      state,
      zip,
      country,
      linkedin,
      twitter,
      facebook,
      instagram,
      foundedYear,
      employeeCount
    } = req.body;
    
    // Build company object
    const companyFields = {
      admin: req.admin.id,
      name,
      description,
      industry,
      website,
      contact: {
        phone,
        email
      },
      address: {
        street: address,
        city,
        state,
        zip,
        country
      },
      socialMedia: {
        linkedin,
        twitter,
        facebook,
        instagram
      },
      foundedYear,
      employeeCount
    };
    
    // Add logo if uploaded
    if (req.file) {
      companyFields.logo = `/uploads/company/${req.file.filename}`;
    }
    
    // Find existing company or create new one
    let company = await Company.findOne({ admin: req.admin.id });
    
    if (company) {
      // Update existing company
      company = await Company.findOneAndUpdate(
        { admin: req.admin.id },
        { $set: companyFields },
        { new: true }
      );
    } else {
      // Create new company
      company = new Company(companyFields);
      await company.save();
    }
    
    res.json(company);
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
