const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = 'uploads/company-logos';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, `company-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  fileFilter: fileFilter
});

// Get company details for the logged-in admin
router.get('/', auth, async (req, res) => {
  try {
    const company = await Company.findOne({ admin: req.admin.id });
    
    if (!company) {
      return res.status(404).json({ message: 'Company details not found' });
    }
    
    res.json(company);
  } catch (error) {
    console.error('Error fetching company details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create or update company details
router.post('/', auth, upload.single('logo'), async (req, res) => {
  try {
    const {
      name,
      description,
      industry,
      website,
      email,
      phone,
      street,
      city,
      state,
      zipCode,
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
      updatedAt: Date.now()
    };
    
    if (name) companyFields.name = name;
    if (description) companyFields.description = description;
    if (industry) companyFields.industry = industry;
    if (website) companyFields.website = website;
    if (email) companyFields.email = email;
    if (phone) companyFields.phone = phone;
    
    // Address fields
    companyFields.address = {};
    if (street) companyFields.address.street = street;
    if (city) companyFields.address.city = city;
    if (state) companyFields.address.state = state;
    if (zipCode) companyFields.address.zipCode = zipCode;
    if (country) companyFields.address.country = country;
    
    // Social media fields
    companyFields.socialMedia = {};
    if (linkedin) companyFields.socialMedia.linkedin = linkedin;
    if (twitter) companyFields.socialMedia.twitter = twitter;
    if (facebook) companyFields.socialMedia.facebook = facebook;
    if (instagram) companyFields.socialMedia.instagram = instagram;
    
    if (foundedYear) companyFields.foundedYear = foundedYear;
    if (employeeCount) companyFields.employeeCount = employeeCount;
    
    // Handle logo upload
    if (req.file) {
      companyFields.logo = `/uploads/company-logos/${req.file.filename}`;
    }
    
    // Check if company exists
    let company = await Company.findOne({ admin: req.admin.id });
    
    if (company) {
      // Update existing company
      company = await Company.findOneAndUpdate(
        { admin: req.admin.id },
        { $set: companyFields },
        { new: true }
      );
      
      return res.json({ message: 'Company details updated', company });
    }
    
    // Create new company
    company = new Company(companyFields);
    await company.save();
    
    res.status(201).json({ message: 'Company details created', company });
  } catch (error) {
    console.error('Error saving company details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete company logo
router.delete('/logo', auth, async (req, res) => {
  try {
    const company = await Company.findOne({ admin: req.admin.id });
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    // Delete the file if it exists
    if (company.logo) {
      const logoPath = path.join(__dirname, '..', company.logo);
      if (fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }
      
      // Update company record
      company.logo = '';
      await company.save();
    }
    
    res.json({ message: 'Company logo removed', company });
  } catch (error) {
    console.error('Error deleting company logo:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;