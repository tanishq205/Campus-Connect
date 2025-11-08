const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');

// Verify Firebase token and create/update user
router.post('/verify', async (req, res) => {
  try {
    const { uid, email, name, college } = req.body;
    
    if (!uid || !email || !name) {
      return res.status(400).json({ error: 'Missing required fields: uid, email, name' });
    }
    
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not connected. Please try again in a moment.' });
    }
    
    let user = await User.findOne({ uid });
    
    if (!user) {
      // Create new user
      user = new User({
        uid,
        email,
        name,
        college: college || 'Not specified',
        skills: [],
        interests: []
      });
      await user.save();
    } else {
      // Update basic info if needed
      if (email) user.email = email;
      if (name) user.name = name;
      if (college) user.college = college;
      await user.save();
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Auth verify error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

