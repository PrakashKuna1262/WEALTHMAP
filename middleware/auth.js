const jwt = require('jsonwebtoken');
// const config = require('config');

module.exports = function(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');
  
  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  
  try {
    // Use environment variable or fallback for JWT secret
    const jwtSecret = process.env.JWT_SECRET || 'jwtSecret';
    
    // Verify token
    const decoded = jwt.verify(token, jwtSecret);

    // Check if token contains admin or employee data
    if (decoded.admin) {
      req.admin = decoded.admin;
    } else if (decoded.employee) {
      req.employee = decoded.employee;
    } else {
      return res.status(401).json({ message: 'Invalid token structure' });
    }

    next();
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

