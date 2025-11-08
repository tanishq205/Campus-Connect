const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Project = require('../models/Project');
const User = require('../models/User');
const { requireEmailVerification } = require('../middleware/emailVerification');

// Create a new project (requires email verification)
router.post('/', requireEmailVerification, async (req, res) => {
  try {
    if (!req.body.creator) {
      return res.status(400).json({ error: 'Creator ID is required' });
    }
    
    const project = new Project(req.body);
    await project.save();
    
    // Add to creator's joined projects
    await User.findByIdAndUpdate(project.creator, {
      $push: { joinedProjects: project._id }
    });
    
    const populatedProject = await Project.findById(project._id)
      .populate('creator', 'name profilePicture college')
      .populate('members.user', 'name profilePicture');
    
    console.log('Project created:', populatedProject._id, 'by user:', project.creator);
    res.status(201).json(populatedProject);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all projects
router.get('/', async (req, res) => {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️  Database not connected, but attempting operation anyway');
      // Don't block - let it try and fail gracefully
    }
    
    const { tag, skill, search } = req.query;
    let query = {};
    
    if (tag) {
      query.tags = { $in: [tag] };
    }
    if (skill) {
      query.requiredSkills = { $in: [skill] };
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const projects = await Project.find(query)
      .populate('creator', 'name profilePicture college')
      .populate('members.user', 'name profilePicture')
      .sort({ createdAt: -1 });
    
    console.log(`Returning ${projects.length} projects`);
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single project
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('creator', 'name profilePicture college email')
      .populate('members.user', 'name profilePicture college')
      .populate('pendingRequests.user', 'name profilePicture')
      .populate('comments');
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update project
router.put('/:id', async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: { ...req.body, updatedAt: Date.now() } },
      { new: true, runValidators: true }
    )
      .populate('creator', 'name profilePicture college')
      .populate('members.user', 'name profilePicture');
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request to join project
router.post('/:id/request', async (req, res) => {
  try {
    const { userId, message } = req.body;
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check if already a member
    const isMember = project.members.some(m => m.user.toString() === userId);
    if (isMember) {
      return res.status(400).json({ error: 'Already a member' });
    }
    
    // Check if already requested
    const hasRequest = project.pendingRequests.some(r => r.user.toString() === userId);
    if (hasRequest) {
      return res.status(400).json({ error: 'Request already sent' });
    }
    
    project.pendingRequests.push({ user: userId, message });
    await project.save();
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Accept/Reject join request
router.post('/:id/request/:requestId', async (req, res) => {
  try {
    const { action } = req.body; // 'accept' or 'reject'
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const requestIndex = project.pendingRequests.findIndex(
      r => r._id.toString() === req.params.requestId
    );
    
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    const request = project.pendingRequests[requestIndex];
    
    if (action === 'accept') {
      project.members.push({ user: request.user });
      await User.findByIdAndUpdate(request.user, {
        $push: { joinedProjects: project._id }
      });
    }
    
    project.pendingRequests.splice(requestIndex, 1);
    await project.save();
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upvote project
router.post('/:id/upvote', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Convert userId to string for comparison
    const userIdStr = userId.toString();
    const upvoteIndex = project.upvotes.findIndex(
      upvoteId => upvoteId.toString() === userIdStr
    );
    
    if (upvoteIndex > -1) {
      // Remove upvote (unlike)
      project.upvotes.splice(upvoteIndex, 1);
    } else {
      // Add upvote (like) - prevent duplicate
      if (!project.upvotes.some(id => id.toString() === userIdStr)) {
        project.upvotes.push(userId);
      }
    }
    
    await project.save();
    res.json(project);
  } catch (error) {
    console.error('Error upvoting project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bookmark project
router.post('/:id/bookmark', async (req, res) => {
  try {
    const { userId } = req.body;
    const project = await Project.findById(req.params.id);
    const user = await User.findById(userId);
    
    if (!project || !user) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    const bookmarkIndex = user.bookmarkedProjects.indexOf(project._id);
    if (bookmarkIndex > -1) {
      user.bookmarkedProjects.splice(bookmarkIndex, 1);
      project.bookmarks = project.bookmarks.filter(b => b.toString() !== userId);
    } else {
      user.bookmarkedProjects.push(project._id);
      project.bookmarks.push(userId);
    }
    
    await user.save();
    await project.save();
    
    res.json({ bookmarked: bookmarkIndex === -1 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recommended projects
router.get('/recommendations/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const recommendations = await Project.find({
      $or: [
        { tags: { $in: user.interests } },
        { requiredSkills: { $in: user.skills } }
      ],
      creator: { $ne: user._id }
    })
      .populate('creator', 'name profilePicture college')
      .limit(10)
      .sort({ createdAt: -1 });
    
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

