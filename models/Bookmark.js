const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  userEmail: {
    type: String,
    required: true,
    index: true
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create compound index for user+property to ensure uniqueness
bookmarkSchema.index({ userEmail: 1, property: 1 }, { unique: true });

// Add pre-find middleware to optimize queries
bookmarkSchema.pre('find', function() {
  // Don't apply these optimizations if we're already using lean
  if (this._mongooseOptions.lean) return;
  
  // Use lean by default for better performance
  this.lean();
});

const Bookmark = mongoose.model('Bookmark', bookmarkSchema);

module.exports = Bookmark;

