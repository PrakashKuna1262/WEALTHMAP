const express = require('express');
const router = express.Router();
const Bookmark = require('../models/Bookmark');
const Property = require('../models/Property');

// Get all bookmarks for a user
router.get('/', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    const bookmarks = await Bookmark.find({ userEmail: email })
      .populate('property')
      .sort({ createdAt: -1 });
    
    res.json(bookmarks);
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add a bookmark
router.post('/', async (req, res) => {
  try {
    const { propertyId, userEmail } = req.body;
    
    if (!propertyId || !userEmail) {
      return res.status(400).json({ message: 'Property ID and user email are required' });
    }
    
    // Check if property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    // Check if bookmark already exists
    const existingBookmark = await Bookmark.findOne({ property: propertyId, userEmail });
    if (existingBookmark) {
      return res.status(400).json({ message: 'Property already bookmarked' });
    }
    
    // Create new bookmark
    const bookmark = new Bookmark({
      property: propertyId,
      userEmail
    });
    
    await bookmark.save();
    
    // Return the bookmark with populated property
    const populatedBookmark = await Bookmark.findById(bookmark._id).populate('property');
    
    res.status(201).json(populatedBookmark);
  } catch (error) {
    console.error('Error adding bookmark:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove a bookmark
router.delete('/:id', async (req, res) => {
  try {
    const bookmark = await Bookmark.findByIdAndDelete(req.params.id);
    
    if (!bookmark) {
      return res.status(404).json({ message: 'Bookmark not found' });
    }
    
    res.json({ message: 'Bookmark removed successfully' });
  } catch (error) {
    console.error('Error removing bookmark:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
