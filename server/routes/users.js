const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('bookmarkedProjects')
      .populate('joinedProjects');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by UID
router.get('/uid/:uid', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid })
      .populate('bookmarkedProjects')
      .populate('joinedProjects');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search users
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { college: { $regex: query, $options: 'i' } },
        { skills: { $in: [new RegExp(query, 'i')] } }
      ]
    }).limit(20);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recommended users (based on skills/interests)
router.get('/recommendations/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const recommendations = await User.find({
      _id: { $ne: user._id },
      $or: [
        { skills: { $in: user.skills } },
        { interests: { $in: user.interests } }
      ]
    }).limit(10);

    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

