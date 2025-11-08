const express = require('express');
const router = express.Router();
const Discussion = require('../models/Discussion');
const { requireAuth } = require('../middleware/auth');

// Get all discussions with filters
router.get('/', async (req, res) => {
  try {
    const { category, search, sort = 'newest', limit = 20, skip = 0 } = req.query;
    let query = {};
    
    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    // Sort options
    let sortOption = { createdAt: -1 }; // default: newest first
    if (sort === 'popular') {
      sortOption = { upvotes: -1, createdAt: -1 };
    } else if (sort === 'most-commented') {
      sortOption = { 'comments': -1, createdAt: -1 };
    } else if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    }
    
    // Get pinned discussions first, then others
    const discussions = await Discussion.find(query)
      .populate('author', 'name profilePicture college')
      .populate('comments.author', 'name profilePicture')
      .populate('comments.replies.author', 'name profilePicture')
      .sort({ isPinned: -1, ...sortOption })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    const total = await Discussion.countDocuments(query);
    
    res.json({
      discussions,
      total,
      hasMore: parseInt(skip) + discussions.length < total
    });
  } catch (error) {
    console.error('Error fetching discussions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single discussion
router.get('/:id', async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id)
      .populate('author', 'name profilePicture college')
      .populate('upvotes', 'name')
      .populate('comments.author', 'name profilePicture college')
      .populate('comments.upvotes', 'name')
      .populate('comments.replies.author', 'name profilePicture college')
      .populate('comments.replies.upvotes', 'name');
    
    if (!discussion) {
      return res.status(404).json({ error: 'Discussion not found' });
    }
    
    // Increment views
    discussion.views += 1;
    await discussion.save();
    
    res.json(discussion);
  } catch (error) {
    console.error('Error fetching discussion:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create discussion (requires auth)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, content, category, tags } = req.body;
    const userId = req.body.userId;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    const discussion = new Discussion({
      title,
      content,
      author: userId,
      category: category || 'general',
      tags: tags || []
    });
    
    await discussion.save();
    
    const populatedDiscussion = await Discussion.findById(discussion._id)
      .populate('author', 'name profilePicture college');
    
    res.status(201).json(populatedDiscussion);
  } catch (error) {
    console.error('Error creating discussion:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update discussion (author only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { title, content, category, tags } = req.body;
    const userId = req.body.userId;
    
    const discussion = await Discussion.findById(req.params.id);
    
    if (!discussion) {
      return res.status(404).json({ error: 'Discussion not found' });
    }
    
    // Check if user is author
    if (discussion.author.toString() !== userId) {
      return res.status(403).json({ error: 'Only the author can update this discussion' });
    }
    
    if (title) discussion.title = title;
    if (content) discussion.content = content;
    if (category) discussion.category = category;
    if (tags) discussion.tags = tags;
    
    await discussion.save();
    
    const populatedDiscussion = await Discussion.findById(discussion._id)
      .populate('author', 'name profilePicture college');
    
    res.json(populatedDiscussion);
  } catch (error) {
    console.error('Error updating discussion:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete discussion (author only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.body.userId;
    
    const discussion = await Discussion.findById(req.params.id);
    
    if (!discussion) {
      return res.status(404).json({ error: 'Discussion not found' });
    }
    
    // Check if user is author
    if (discussion.author.toString() !== userId) {
      return res.status(403).json({ error: 'Only the author can delete this discussion' });
    }
    
    await Discussion.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Discussion deleted successfully' });
  } catch (error) {
    console.error('Error deleting discussion:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upvote/Remove upvote discussion
router.post('/:id/upvote', requireAuth, async (req, res) => {
  try {
    const userId = req.body.userId;
    const discussion = await Discussion.findById(req.params.id);
    
    if (!discussion) {
      return res.status(404).json({ error: 'Discussion not found' });
    }
    
    const upvoteIndex = discussion.upvotes.indexOf(userId);
    
    if (upvoteIndex > -1) {
      // Remove upvote
      discussion.upvotes.splice(upvoteIndex, 1);
    } else {
      // Add upvote
      discussion.upvotes.push(userId);
    }
    
    await discussion.save();
    
    res.json({ upvotes: discussion.upvotes.length, isUpvoted: upvoteIndex === -1 });
  } catch (error) {
    console.error('Error upvoting discussion:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add comment to discussion
router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.body.userId;
    
    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    
    const discussion = await Discussion.findById(req.params.id);
    
    if (!discussion) {
      return res.status(404).json({ error: 'Discussion not found' });
    }
    
    if (discussion.isLocked) {
      return res.status(403).json({ error: 'This discussion is locked' });
    }
    
    discussion.comments.push({
      content,
      author: userId
    });
    
    await discussion.save();
    
    const populatedDiscussion = await Discussion.findById(req.params.id)
      .populate('author', 'name profilePicture college')
      .populate('comments.author', 'name profilePicture college')
      .populate('comments.replies.author', 'name profilePicture college');
    
    res.json(populatedDiscussion);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reply to comment
router.post('/:id/comments/:commentId/replies', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.body.userId;
    
    if (!content) {
      return res.status(400).json({ error: 'Reply content is required' });
    }
    
    const discussion = await Discussion.findById(req.params.id);
    
    if (!discussion) {
      return res.status(404).json({ error: 'Discussion not found' });
    }
    
    if (discussion.isLocked) {
      return res.status(403).json({ error: 'This discussion is locked' });
    }
    
    const comment = discussion.comments.id(req.params.commentId);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    comment.replies.push({
      content,
      author: userId
    });
    
    await discussion.save();
    
    const populatedDiscussion = await Discussion.findById(req.params.id)
      .populate('author', 'name profilePicture college')
      .populate('comments.author', 'name profilePicture college')
      .populate('comments.replies.author', 'name profilePicture college');
    
    res.json(populatedDiscussion);
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upvote comment
router.post('/:id/comments/:commentId/upvote', requireAuth, async (req, res) => {
  try {
    const userId = req.body.userId;
    const discussion = await Discussion.findById(req.params.id);
    
    if (!discussion) {
      return res.status(404).json({ error: 'Discussion not found' });
    }
    
    const comment = discussion.comments.id(req.params.commentId);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    const upvoteIndex = comment.upvotes.indexOf(userId);
    
    if (upvoteIndex > -1) {
      comment.upvotes.splice(upvoteIndex, 1);
    } else {
      comment.upvotes.push(userId);
    }
    
    await discussion.save();
    
    res.json({ upvotes: comment.upvotes.length, isUpvoted: upvoteIndex === -1 });
  } catch (error) {
    console.error('Error upvoting comment:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

