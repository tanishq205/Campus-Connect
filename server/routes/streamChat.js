const express = require('express');
const router = express.Router();
const { StreamChat } = require('stream-chat');

// Initialize Stream Chat server client
const streamServerClient = StreamChat.getInstance(
  process.env.STREAM_API_KEY,
  process.env.STREAM_API_SECRET
);

// Generate Stream Chat token for a user
router.post('/token', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Generate token for the user
    const token = streamServerClient.createToken(userId);

    console.log('✅ Generated Stream Chat token for user:', userId);

    res.json({
      token,
      userId,
    });
  } catch (error) {
    console.error('❌ Error generating Stream Chat token:', error);
    res.status(500).json({ error: 'Failed to generate chat token' });
  }
});

module.exports = router;

