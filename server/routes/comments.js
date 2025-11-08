const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Project = require('../models/Project');

// Create comment
router.post('/', async (req, res) => {
  try {
    const comment = new Comment(req.body);
    await comment.save();
    
    // Add comment to project
    await Project.findByIdAndUpdate(req.body.project, {
      $push: { comments: comment._id }
    });
    
    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'name profilePicture');
    
    res.status(201).json(populatedComment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get comments for a project
router.get('/project/:projectId', async (req, res) => {
  try {
    const comments = await Comment.find({ project: req.params.projectId })
      .populate('author', 'name profilePicture')
      .populate('replies.author', 'name profilePicture')
      .sort({ createdAt: -1 });
    
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upvote comment
router.post('/:id/upvote', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Convert userId to string for comparison
    const userIdStr = userId.toString();
    const upvoteIndex = comment.upvotes.findIndex(
      upvoteId => upvoteId.toString() === userIdStr
    );
    
    if (upvoteIndex > -1) {
      // Remove upvote (unlike)
      comment.upvotes.splice(upvoteIndex, 1);
    } else {
      // Add upvote (like) - prevent duplicate
      if (!comment.upvotes.some(id => id.toString() === userIdStr)) {
        comment.upvotes.push(userId);
      }
    }
    
    await comment.save();
    res.json(comment);
  } catch (error) {
    console.error('Error upvoting comment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reply to comment
router.post('/:id/reply', async (req, res) => {
  try {
    const { content, author } = req.body;
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    comment.replies.push({ content, author });
    await comment.save();
    
    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'name profilePicture')
      .populate('replies.author', 'name profilePicture');
    
    res.json(populatedComment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

