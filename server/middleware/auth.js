const User = require('../models/User');

// Middleware to check if user is authenticated
const requireAuth = async (req, res, next) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required. User ID is missing.' });
    }

    const user = await User.findOne({ _id: userId });
    
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed.' });
  }
};

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required. User ID is missing.' });
    }

    const user = await User.findOne({ _id: userId });
    
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Authorization failed.' });
  }
};

module.exports = { requireAuth, requireAdmin };

