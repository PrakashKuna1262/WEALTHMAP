const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true
  },
  address: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true,
      index: true
    },
    state: {
      type: String,
      required: true,
      index: true
    },
    zipCode: {
      type: String,
      required: true
    }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      index: '2dsphere'
    }
  },
  propertyImage: {
    type: String,
    default: 'https://via.placeholder.com/300x200?text=No+Image'
  },
  ownerDetails: {
    ownerName: {
      type: String,
      required: true
    },
    age: {
      type: Number,
      required: true
    },
    sex: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: true
    },
    email: {
      type: String,
      required: true
    },
    mobileNumber: {
      type: String,
      required: true
    },
    occupation: {
      type: String,
      required: true
    },
    monthlyIncome: {
      type: Number,
      required: true,
      index: true
    },
    totalWealth: {
      type: Number,
      required: true
    },
    ownerImage: {
      type: String,
      default: 'https://via.placeholder.com/150x150?text=No+Image'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create compound indexes for common query patterns
propertySchema.index({ 'address.city': 1, 'address.state': 1 });
propertySchema.index({ 'ownerDetails.monthlyIncome': 1, 'ownerDetails.occupation': 1 });

// Add virtual for formatted address
propertySchema.virtual('formattedAddress').get(function() {
  return `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.zipCode}`;
});

// Add virtual for income tier
propertySchema.virtual('incomeTier').get(function() {
  const income = this.ownerDetails.monthlyIncome;
  if (income < 5000) return 'Low';
  if (income < 10000) return 'Medium';
  if (income < 20000) return 'High';
  return 'Very High';
});

// Add pre-find middleware to optimize queries
propertySchema.pre('find', function() {
  // Don't apply these optimizations if we're already using lean
  if (this._mongooseOptions.lean) return;
  
  // Use lean by default for better performance
  this.lean({ virtuals: true });
});

const Property = mongoose.model('Property', propertySchema);

module.exports = Property;

