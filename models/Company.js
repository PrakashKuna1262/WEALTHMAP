const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'admin',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  logo: {
    type: String
  },
  description: {
    type: String
  },
  industry: {
    type: String
  },
  website: {
    type: String
  },
  contact: {
    email: {
      type: String
    },
    phone: {
      type: String
    }
  },
  address: {
    street: {
      type: String
    },
    city: {
      type: String
    },
    state: {
      type: String
    },
    zip: {
      type: String
    },
    country: {
      type: String
    }
  },
  socialMedia: {
    linkedin: {
      type: String
    },
    twitter: {
      type: String
    },
    facebook: {
      type: String
    },
    instagram: {
      type: String
    }
  },
  foundedYear: {
    type: String
  },
  employeeCount: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('company', CompanySchema);

