const express = require('express');
const router = express.Router();
const User = require('../models/User');

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

// Send friend request
router.post('/:id/friend-request', async (req, res) => {
  try {
    const { fromUserId } = req.body;
    const toUserId = req.params.id;
    
    if (fromUserId === toUserId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }
    
    const toUser = await User.findById(toUserId);
    const fromUser = await User.findById(fromUserId);
    
    if (!toUser || !fromUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if already friends
    const toUserFriends = toUser.friends.map(f => f.toString());
    const fromUserFriends = fromUser.friends.map(f => f.toString());
    if (toUserFriends.includes(fromUserId.toString()) || fromUserFriends.includes(toUserId.toString())) {
      return res.status(400).json({ error: 'Already friends' });
    }
    
    // Check if request already exists
    const existingRequest = toUser.friendRequests.find(
      req => req.from.toString() === fromUserId && req.status === 'pending'
    );
    
    if (existingRequest) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }
    
    toUser.friendRequests.push({ from: fromUserId, status: 'pending' });
    await toUser.save();
    
    res.json({ message: 'Friend request sent' });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ error: error.message });
  }
});

// Accept/Reject friend request
router.post('/:id/friend-request/:requestId', async (req, res) => {
  try {
    const { action } = req.body; // 'accept' or 'reject'
    const userId = req.params.id;
    const requestId = req.params.requestId;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const requestIndex = user.friendRequests.findIndex(
      req => req._id.toString() === requestId
    );
    
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Friend request not found' });
    }
    
    const request = user.friendRequests[requestIndex];
    
    if (action === 'accept') {
      // Add to both users' friends list
      const userFriends = user.friends.map(f => f.toString());
      if (!userFriends.includes(request.from.toString())) {
        user.friends.push(request.from);
      }
      
      const fromUser = await User.findById(request.from);
      if (fromUser) {
        const fromUserFriends = fromUser.friends.map(f => f.toString());
        if (!fromUserFriends.includes(userId.toString())) {
          fromUser.friends.push(userId);
          await fromUser.save();
        }
      }
      
      request.status = 'accepted';
    } else if (action === 'reject') {
      request.status = 'rejected';
    }
    
    await user.save();
    res.json({ message: `Friend request ${action}ed` });
  } catch (error) {
    console.error('Error handling friend request:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get friends
router.get('/:id/friends', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('friends', 'name profilePicture college');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user.friends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get friend requests
router.get('/:id/friend-requests', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('friendRequests.from', 'name profilePicture college');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const pendingRequests = user.friendRequests.filter(req => req.status === 'pending');
    res.json(pendingRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

