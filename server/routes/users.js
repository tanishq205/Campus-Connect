const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireEmailVerification } = require('../middleware/emailVerification');

// Search users (must come before /:id route)
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { college: { $regex: query, $options: 'i' } },
        { skills: { $in: [new RegExp(query, 'i')] } }
      ]
    })
      .select('name profilePicture college branch year skills')
      .limit(50);
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recommended users (must come before /:id route)
router.get('/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = await User.findById(userId);
    
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get IDs of users to exclude (current user, friends, and users with pending requests)
    const excludeIds = [userId];
    if (currentUser.friends && currentUser.friends.length > 0) {
      excludeIds.push(...currentUser.friends.map(f => f.toString()));
    }
    if (currentUser.friendRequests && currentUser.friendRequests.length > 0) {
      excludeIds.push(...currentUser.friendRequests.map(req => req.from.toString()));
    }
    
    // Find users not in exclude list
    const recommendedUsers = await User.find({
      _id: { $nin: excludeIds }
    })
      .select('name profilePicture college branch year skills')
      .limit(20);
    
    res.json(recommendedUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('bookmarkedProjects')
      .populate('joinedProjects')
      .populate('friends', 'name profilePicture college')
      .populate('friendRequests.from', 'name profilePicture college');
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
      .populate('joinedProjects')
      .populate('friends', 'name profilePicture college');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile (requires email verification, except for emailVerified field)
router.put('/:id', async (req, res) => {
  try {
    const { emailVerified, ...updateData } = req.body;
    const userId = req.body.userId || req.params.id;
    
    // Check if user exists and get current verification status
    const currentUser = await User.findById(req.params.id);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // If only updating emailVerified, allow it (for syncing from Firebase)
    if (Object.keys(updateData).length === 0 && emailVerified !== undefined) {
      currentUser.emailVerified = emailVerified;
      await currentUser.save();
      return res.json(currentUser);
    }
    
    // For other updates, require email verification
    if (!currentUser.emailVerified) {
      return res.status(403).json({ 
        error: 'Email verification required. Please verify your email address to update your profile.' 
      });
    }
    
    // Update user
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { ...updateData, ...(emailVerified !== undefined && { emailVerified }) } },
      { new: true, runValidators: true }
    );
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search users
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { college: { $regex: query, $options: 'i' } },
        { skills: { $in: [new RegExp(query, 'i')] } }
      ]
    })
      .select('name profilePicture college branch year skills')
      .limit(50);
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recommended users (users not already friends)
router.get('/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = await User.findById(userId);
    
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get IDs of users to exclude (current user, friends, and users with pending requests)
    const excludeIds = [userId];
    if (currentUser.friends && currentUser.friends.length > 0) {
      excludeIds.push(...currentUser.friends.map(f => f.toString()));
    }
    if (currentUser.friendRequests && currentUser.friendRequests.length > 0) {
      excludeIds.push(...currentUser.friendRequests.map(req => req.from.toString()));
    }
    
    // Find users not in exclude list
    const recommendedUsers = await User.find({
      _id: { $nin: excludeIds }
    })
      .select('name profilePicture college branch year skills')
      .limit(20);
    
    res.json(recommendedUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's friends
router.get('/:id/friends', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('friends', 'name profilePicture college branch year');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user.friends || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's friend requests
router.get('/:id/friend-requests', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('friendRequests.from', 'name profilePicture college');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user.friendRequests || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send friend request
router.post('/:id/friend-request', async (req, res) => {
  try {
    const { fromUserId } = req.body;
    const targetUser = await User.findById(req.params.id);
    const fromUser = await User.findById(fromUserId);

    if (!targetUser || !fromUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already friends
    if (targetUser.friends.includes(fromUserId)) {
      return res.status(400).json({ error: 'Already friends' });
    }

    // Check if request already exists
    const existingRequest = targetUser.friendRequests.find(
      req => req.from.toString() === fromUserId
    );

    if (existingRequest) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }

    targetUser.friendRequests.push({
      from: fromUserId,
      status: 'pending'
    });

    await targetUser.save();
    res.json({ message: 'Friend request sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Accept/Reject friend request
router.post('/:id/friend-request/:requestId', async (req, res) => {
  try {
    const { action } = req.body; // 'accept' or 'reject'
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const request = targetUser.friendRequests.id(req.params.requestId);
    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    if (action === 'accept') {
      // Add to friends list
      if (!targetUser.friends.includes(request.from)) {
        targetUser.friends.push(request.from);
      }
      // Add target user to requester's friends list
      const requester = await User.findById(request.from);
      if (requester && !requester.friends.includes(req.params.id)) {
        requester.friends.push(req.params.id);
        await requester.save();
      }
    }

    // Remove the request using pull method (works with all Mongoose versions)
    targetUser.friendRequests.pull(req.params.requestId);
    await targetUser.save();

    res.json({ message: `Friend request ${action}ed` });
  } catch (error) {
    console.error('Error processing friend request:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
