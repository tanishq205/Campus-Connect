const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const { requireAdmin } = require('../middleware/auth');
const { requireEmailVerification } = require('../middleware/emailVerification');

// Create event (Admin only, requires email verification)
router.post('/', requireAdmin, requireEmailVerification, async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all events
router.get('/', async (req, res) => {
  try {
    const { domain, location, date, search } = req.query;
    let query = {};
    
    if (domain) {
      query.domain = { $in: [domain] };
    }
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    if (date) {
      query.date = { $gte: new Date(date) };
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const events = await Event.find(query)
      .populate('participants', 'name profilePicture')
      .sort({ date: 1 });
    
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single event
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('participants', 'name profilePicture college');
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Join event
router.post('/:id/join', async (req, res) => {
  try {
    const { userId } = req.body;
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    if (!event.participants.includes(userId)) {
      event.participants.push(userId);
      await event.save();
    }
    
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Leave event
router.post('/:id/leave', async (req, res) => {
  try {
    const { userId } = req.body;
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    event.participants = event.participants.filter(p => p.toString() !== userId);
    await event.save();
    
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

