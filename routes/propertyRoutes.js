const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const Bookmark = require('../models/Bookmark');
const mongoose = require('mongoose');

// Get all properties with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      name,
      city,
      state,
      minIncome,
      maxIncome,
      near,
      sort = 'createdAt_desc'
    } = req.query;

    // Build query
    const query = {};
    
    // Text search on property name
    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }
    
    // Location filters
    if (city) {
      query['address.city'] = { $regex: city, $options: 'i' };
    }
    
    if (state) {
      query['address.state'] = { $regex: state, $options: 'i' };
    }
    
    // Income range filters
    if (minIncome || maxIncome) {
      query['ownerDetails.monthlyIncome'] = {};
      
      if (minIncome) {
        query['ownerDetails.monthlyIncome'].$gte = Number(minIncome);
      }
      
      if (maxIncome) {
        query['ownerDetails.monthlyIncome'].$lte = Number(maxIncome);
      }
    }
    
    // Geospatial query for nearby properties
    if (near) {
      const [longitude, latitude, distance] = near.split(',').map(Number);
      
      if (!isNaN(longitude) && !isNaN(latitude) && !isNaN(distance)) {
        query.location = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            $maxDistance: distance
          }
        };
      }
    }
    
    // Parse sort option
    const [sortField, sortDirection] = sort.split('_');
    const sortOptions = {};
    sortOptions[sortField] = sortDirection === 'desc' ? -1 : 1;
    
    // Count total documents for pagination
    const total = await Property.countDocuments(query);
    
    // Execute query with pagination and lean() for better performance
    const properties = await Property.find(query)
      .sort(sortOptions)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean({ virtuals: true })
      .select('-__v');
    
    res.json({
      properties,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total
    });
  } catch (err) {
    console.error('Error fetching properties:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get property by ID
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .lean({ virtuals: true })
      .select('-__v');
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    res.json(property);
  } catch (err) {
    console.error('Error fetching property:', err);
    
    // Check if error is due to invalid ObjectId
    if (err instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: 'Invalid property ID format' });
    }
    
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Make sure your bookmark routes are correctly defined
// Get bookmarks for a user
router.get('/bookmarks/:userEmail', async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({ userEmail: req.params.userEmail })
      .populate({
        path: 'property',
        select: '-__v',
        options: { lean: true }
      })
      .lean()
      .select('-__v');
    
    res.json(bookmarks);
  } catch (err) {
    console.error('Error fetching bookmarks:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add a bookmark
router.post('/bookmarks', async (req, res) => {
  try {
    const { userEmail, propertyId } = req.body;
    
    // Check if bookmark already exists
    const existingBookmark = await Bookmark.findOne({
      userEmail,
      property: propertyId
    });
    
    if (existingBookmark) {
      return res.status(400).json({ message: 'Property already bookmarked' });
    }
    
    // Create new bookmark
    const bookmark = new Bookmark({
      userEmail,
      property: propertyId
    });
    
    await bookmark.save();
    
    // Populate property data for response
    const populatedBookmark = await Bookmark.findById(bookmark._id)
      .populate({
        path: 'property',
        select: '-__v',
        options: { lean: true }
      })
      .lean();
    
    res.status(201).json(populatedBookmark);
  } catch (err) {
    console.error('Error adding bookmark:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Remove a bookmark
router.delete('/bookmarks/:id', async (req, res) => {
  try {
    const result = await Bookmark.findByIdAndDelete(req.params.id);
    
    if (!result) {
      return res.status(404).json({ message: 'Bookmark not found' });
    }
    
    res.json({ message: 'Bookmark removed successfully' });
  } catch (err) {
    console.error('Error removing bookmark:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;





