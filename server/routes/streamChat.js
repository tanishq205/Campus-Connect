const express = require('express');
const router = express.Router();
const { StreamChat } = require('stream-chat');

// Initialize Stream Chat server client (lazy initialization)
let streamServerClient = null;

const getStreamClient = () => {
  if (!streamServerClient) {
    const apiKey = process.env.STREAM_API_KEY;
    const apiSecret = process.env.STREAM_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      throw new Error('Stream Chat API key and secret are required. Please set STREAM_API_KEY and STREAM_API_SECRET environment variables.');
    }
    
    streamServerClient = StreamChat.getInstance(apiKey, apiSecret);
  }
  return streamServerClient;
};

// Generate Stream Chat token for a user
router.post('/token', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get Stream Chat client (will throw if env vars are missing)
    const client = getStreamClient();

    // Generate token for the user
    const token = client.createToken(userId);

    console.log('✅ Generated Stream Chat token for user:', userId);

    res.json({
      token,
      userId,
    });
  } catch (error) {
    console.error('❌ Error generating Stream Chat token:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate chat token',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;

