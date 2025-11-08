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
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    const upvoteIndex = comment.upvotes.indexOf(userId);
    if (upvoteIndex > -1) {
      comment.upvotes.splice(upvoteIndex, 1);
    } else {
      comment.upvotes.push(userId);
    }
    
    await comment.save();
    res.json(comment);
  } catch (error) {
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

