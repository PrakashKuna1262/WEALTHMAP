const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Initialize express
const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    process.env.CLIENT_URL,
    process.env.LOCAL_CLIENT_URL,
    'http://localhost:3001',
    'http://localhost:10000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
const propertiesDir = path.join(uploadsDir, 'properties');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

if (!fs.existsSync(propertiesDir)) {
  fs.mkdirSync(propertiesDir);
}

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test route
app.get('/', (req, res) => {
  res.send('API is running...');
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Test route is working' });
});

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/hackathon', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected successfully');
})
.catch(err => {
  console.error('MongoDB connection error:', err.message);
  console.log('Server will continue without database functionality');
});

// Routes
app.use('/api/admins', require('./routes/adminRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api/company', require('./routes/companyRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/properties', require('./routes/propertyRoutes'));
app.use('/api/bookmarks', require('./routes/bookmarkRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ message: 'Server error', error: err.message });
});

// Set port
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}`);
});











