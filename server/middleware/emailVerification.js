const User = require('../models/User');

// Middleware to check if user's email is verified
const requireEmailVerification = async (req, res, next) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required.' });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ 
        error: 'Email verification required. Please verify your email address to perform this action.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Email verification middleware error:', error);
    res.status(500).json({ error: 'Verification check failed.' });
  }
};

module.exports = { requireEmailVerification };

