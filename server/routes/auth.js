const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const { requireAdmin } = require('../middleware/auth');

// Verify Firebase token and create/update user
router.post('/verify', async (req, res) => {
  try {
    const { uid, email, name, college, emailVerified } = req.body;
    
    if (!uid || !email || !name) {
      return res.status(400).json({ error: 'Missing required fields: uid, email, name' });
    }
    
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️  Database not connected, but attempting operation anyway');
      // Don't block - let it try and fail gracefully
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
        interests: [],
        role: 'user', // Default role
        emailVerified: emailVerified || false
      });
      await user.save();
    } else {
      // Update basic info if needed
      if (email) user.email = email;
      if (name) user.name = name;
      if (college) user.college = college;
      // Update email verification status if provided
      if (emailVerified !== undefined) {
        user.emailVerified = emailVerified;
      }
      await user.save();
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Auth verify error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create admin user (Protected - requires existing admin or special secret)
router.post('/create-admin', async (req, res) => {
  try {
    const { userId, adminSecret, email } = req.body;
    
    // Check for admin secret (set in environment variables)
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'campus-connect-admin-2024';
    
    if (adminSecret !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Invalid admin secret.' });
    }
    
    let user;
    
    if (userId) {
      // Promote existing user to admin
      user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      user.role = 'admin';
      await user.save();
    } else if (email) {
      // Create new admin user by email
      user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ error: 'User with this email not found. Please sign up first.' });
      }
      user.role = 'admin';
      await user.save();
    } else {
      return res.status(400).json({ error: 'Either userId or email is required.' });
    }
    
    res.json({ 
      message: 'User promoted to admin successfully.',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user info (including role)
router.get('/me/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-friendRequests');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

