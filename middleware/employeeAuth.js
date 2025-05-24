const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token using environment variable or fallback
    const jwtSecret = process.env.JWT_SECRET || 'jwtSecret';
    
    // Log for debugging
    console.log('Verifying token with secret:', jwtSecret ? 'Secret exists' : 'No secret');
    console.log('Token to verify:', token.substring(0, 15) + '...');
    
    const decoded = jwt.verify(token, jwtSecret);
    
    // Log decoded token
    console.log('Decoded token:', JSON.stringify(decoded));
    
    // Check if employee property exists in decoded token
    if (!decoded.employee && decoded.id) {
      // Handle admin tokens or old format tokens
      req.employee = {
        id: decoded.id,
        role: decoded.role || 'employee'
      };
      console.log('Using id directly from token');
    } else if (decoded.employee) {
      // Standard employee token
      req.employee = decoded.employee;
      console.log('Using employee object from token');
    } else {
      throw new Error('Invalid token structure');
    }
    
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(401).json({ message: 'Token is not valid', error: err.message });
  }
};




