const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Store messages in memory (in production, use a database)
const messagesStore = new Map();

// Get messages for a room
router.get('/messages/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = messagesStore.get(roomId) || [];
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save message (called by socket.io)
router.post('/messages', async (req, res) => {
  try {
    const { roomId, message } = req.body;
    
    if (!messagesStore.has(roomId)) {
      messagesStore.set(roomId, []);
    }
    
    const messages = messagesStore.get(roomId);
    messages.push({
      ...message,
      timestamp: message.timestamp || new Date().toISOString(),
    });
    
    // Keep only last 100 messages per room
    if (messages.length > 100) {
      messages.shift();
    }
    
    messagesStore.set(roomId, messages);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export both router and messagesStore
module.exports = router;
module.exports.messagesStore = messagesStore;

