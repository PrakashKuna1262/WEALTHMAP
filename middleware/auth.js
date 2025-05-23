const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');
  
  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jwtSecret');
    
    // Add admin from payload to request
    req.admin = {
      id: decoded.id,
      role: decoded.role
    };
    
    console.log('Auth middleware - decoded token:', { id: decoded.id, role: decoded.role });
    
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(401).json({ message: 'Token is not valid' });
  }
};


