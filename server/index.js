const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Configure CORS for Express
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) {
      console.log('⚠️  Request with no origin - allowing');
      return callback(null, true);
    }
    
    // Normalize URLs (remove trailing slashes)
    const normalizeUrl = (url) => {
      if (!url) return url;
      return url.replace(/\/+$/, ''); // Remove trailing slashes
    };
    
    const allowedOrigins = [
      normalizeUrl(process.env.CLIENT_URL),
      "http://localhost:3000",
      "http://localhost:3001",
      "https://localhost:3000",
      "https://localhost:3001"
    ].filter(Boolean);
    
    // Normalize the incoming origin for comparison
    const normalizedOrigin = normalizeUrl(origin);
    
    // Log for debugging
    console.log('🌐 CORS check - Origin:', origin);
    console.log('🌐 CORS check - Normalized origin:', normalizedOrigin);
    console.log('🌐 CORS check - Allowed origins:', allowedOrigins);
    console.log('🌐 CORS check - NODE_ENV:', process.env.NODE_ENV);
    
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Development mode - allowing origin');
      return callback(null, true);
    }
    
    // If CLIENT_URL is not set, log warning but allow (for debugging)
    if (!process.env.CLIENT_URL) {
      console.warn('⚠️  WARNING: CLIENT_URL not set in environment variables!');
      console.warn('⚠️  Allowing origin for now, but please set CLIENT_URL in Render Dashboard');
      console.warn('⚠️  Origin:', origin);
      return callback(null, true);
    }
    
    // Check if origin matches any allowed origin (exact match or hostname match)
    const isAllowed = allowedOrigins.some(allowed => {
      if (!allowed) return false;
      
      const normalizedAllowed = normalizeUrl(allowed);
      
      // Exact match (with normalized URLs)
      if (normalizedOrigin === normalizedAllowed) {
        console.log('✅ Exact match found:', normalizedAllowed);
        return true;
      }
      
      // Hostname match (for cases where protocol differs)
      try {
        const originUrl = new URL(normalizedOrigin);
        const allowedUrl = new URL(normalizedAllowed);
        if (originUrl.hostname === allowedUrl.hostname) {
          console.log('✅ Hostname match found:', allowedUrl.hostname);
          return true;
        }
      } catch (e) {
        // Invalid URL, skip
      }
      
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.error('❌ CORS blocked - Origin not allowed:', origin);
      console.error('   Allowed origins:', allowedOrigins);
      console.error('   CLIENT_URL:', process.env.CLIENT_URL);
      console.error('   Please check your CLIENT_URL environment variable in Render Dashboard');
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Content-Type", "Authorization"]
};

// Middleware
app.use(cors(corsOptions));

// Configure Socket.io with better CORS and transport options for production
const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin
      if (!origin) {
        console.log('⚠️  Socket.io request with no origin - allowing');
        return callback(null, true);
      }
      
      // Normalize URLs (remove trailing slashes)
      const normalizeUrl = (url) => {
        if (!url) return url;
        return url.replace(/\/+$/, ''); // Remove trailing slashes
      };
      
      const allowedOrigins = [
        normalizeUrl(process.env.CLIENT_URL),
        "http://localhost:3000",
        "http://localhost:3001",
        "https://localhost:3000",
        "https://localhost:3001"
      ].filter(Boolean);
      
      // Normalize the incoming origin for comparison
      const normalizedOrigin = normalizeUrl(origin);
      
      console.log('🔌 Socket.io CORS check - Origin:', origin);
      console.log('🔌 Socket.io CORS check - Normalized origin:', normalizedOrigin);
      console.log('🔌 Socket.io CORS check - Allowed origins:', allowedOrigins);
      
      // In development, allow all origins
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Socket.io - Development mode - allowing origin');
        return callback(null, true);
      }
      
      // If CLIENT_URL is not set, log warning but allow (for debugging)
      if (!process.env.CLIENT_URL) {
        console.warn('⚠️  WARNING: CLIENT_URL not set for Socket.io!');
        console.warn('⚠️  Allowing origin for now, but please set CLIENT_URL in Render Dashboard');
        console.warn('⚠️  Origin:', origin);
        return callback(null, true);
      }
      
      // Check if origin matches any allowed origin
      const isAllowed = allowedOrigins.some(allowed => {
        if (!allowed) return false;
        
        const normalizedAllowed = normalizeUrl(allowed);
        
        // Exact match (with normalized URLs)
        if (normalizedOrigin === normalizedAllowed) {
          console.log('✅ Socket.io - Exact match found:', normalizedAllowed);
          return true;
        }
        
        // Hostname match
        try {
          const originUrl = new URL(normalizedOrigin);
          const allowedUrl = new URL(normalizedAllowed);
          if (originUrl.hostname === allowedUrl.hostname) {
            console.log('✅ Socket.io - Hostname match found:', allowedUrl.hostname);
            return true;
          }
        } catch (e) {
          // Invalid URL, skip
        }
        
        return false;
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.error('❌ Socket.io CORS blocked - Origin not allowed:', origin);
        console.error('   Allowed origins:', allowedOrigins);
        console.error('   CLIENT_URL:', process.env.CLIENT_URL);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'], // Allow both transports
  allowEIO3: true, // Allow Engine.IO v3 clients
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middleware (continued)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (for Render and monitoring)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Campus Connect API Server',
    status: 'running',
    version: '1.0.0'
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/events', require('./routes/events'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/stream-chat', require('./routes/streamChat'));

// Error handling middleware (should be after all routes)
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Socket.io for real-time chat
io.on('connection', (socket) => {
  const userId = socket.handshake.query?.userId || 'unknown';
  console.log(`\n🔌 User connected: ${socket.id} (User ID: ${userId})`);

  // Store user ID with socket for easier tracking
  socket.userId = userId;

  socket.on('join-room', async (roomId) => {
    try {
      if (!roomId) {
        console.warn(`⚠️  Invalid roomId provided: ${roomId}`);
        return;
      }
      
      // Leave all other rooms first (except the socket's own room)
      const rooms = Array.from(socket.rooms);
      rooms.forEach(room => {
        if (room !== socket.id && room !== roomId) {
          socket.leave(room);
          console.log(`🚪 User ${socket.id} left room: ${room}`);
        }
      });
      
      // Join the new room
      socket.join(roomId);
      console.log(`🚪 User ${socket.id} (${userId}) joined room: ${roomId}`);
      
      // Get all sockets in the room to verify
      const socketsInRoom = await io.in(roomId).fetchSockets();
      console.log(`📊 Room "${roomId}" now has ${socketsInRoom.length} user(s):`);
      socketsInRoom.forEach(s => {
        console.log(`   - Socket: ${s.id} (User: ${s.userId || 'unknown'})`);
      });
      
      // Notify client that room join was successful
      socket.emit('room-joined', { roomId, userCount: socketsInRoom.length });
      
      // Also notify other users in the room that someone joined
      socket.to(roomId).emit('user-joined-room', { roomId, userId });
      
      // If this is a friend chat and there are now 2 users, notify both
      if (roomId.startsWith('friend-') && socketsInRoom.length === 2) {
        console.log('✅ Friend chat room is ready! Both users are connected.');
        io.to(roomId).emit('friend-chat-ready', { roomId });
      }
    } catch (error) {
      console.error('❌ Error joining room:', error);
      socket.emit('room-join-error', { error: 'Failed to join room' });
    }
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    console.log(`🚪 User ${socket.id} (${userId}) left room ${roomId}`);
  });

  socket.on('send-message', async (data) => {
    try {
      console.log(`\n📨 === MESSAGE RECEIVED ===`);
      console.log(`From: ${data.user?.name} (${data.user?._id})`);
      console.log(`Room: ${data.roomId}`);
      console.log(`Message: ${data.message}`);
      console.log(`Socket: ${socket.id}`);
      
      // Save message to backend storage first
      const chatRoute = require('./routes/chat');
      const { messagesStore } = chatRoute;
      
      if (!messagesStore.has(data.roomId)) {
        messagesStore.set(data.roomId, []);
      }
      
      const messages = messagesStore.get(data.roomId);
      const messageToSave = {
        ...data,
        timestamp: data.timestamp || new Date().toISOString(),
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      
      messages.push(messageToSave);
      
      if (messages.length > 100) {
        messages.shift();
      }
      
      messagesStore.set(data.roomId, messages);
      console.log(`💾 Message saved. Room now has ${messages.length} total messages`);
      
      // Get all sockets in the room BEFORE broadcasting
      const socketsInRoom = await io.in(data.roomId).fetchSockets();
      console.log(`👥 Users in room "${data.roomId}": ${socketsInRoom.length}`);
      
      if (socketsInRoom.length === 0) {
        console.warn(`⚠️  WARNING: No users in room ${data.roomId}!`);
        console.warn(`⚠️  This means the other user hasn't joined the room yet.`);
        console.warn(`⚠️  Message saved but not delivered.`);
        console.warn(`⚠️  Make sure both users are in the chat page and have joined the room.`);
      } else {
        console.log(`📋 Sockets in room:`);
        socketsInRoom.forEach(s => {
          console.log(`   - Socket: ${s.id} (User: ${s.userId || 'unknown'})`);
        });
        
        // Broadcast to ALL users in the room (including sender)
        console.log(`📢 Broadcasting message to room "${data.roomId}"...`);
        io.to(data.roomId).emit('receive-message', messageToSave);
        console.log(`✅ Message broadcasted to ${socketsInRoom.length} user(s)`);
        
        // Double-check: verify the room still has users
        const verifySockets = await io.in(data.roomId).fetchSockets();
        console.log(`🔍 Verification: Room now has ${verifySockets.length} user(s) after broadcast`);
      }
      
      console.log(`✅ === MESSAGE PROCESSED ===\n`);
      
    } catch (error) {
      console.error('❌ Error in send-message handler:', error);
      socket.emit('message-error', { error: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// MongoDB connection with better error handling
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/campus-connect';
    
    if (!process.env.MONGODB_URI) {
      console.warn('⚠️  WARNING: MONGODB_URI not set in .env file. Using default localhost connection.');
      console.warn('⚠️  Make sure MongoDB is running locally or set MONGODB_URI in server/.env');
    }
    
    // Set mongoose options for better compatibility
    mongoose.set('strictQuery', false);
    
    // Determine if using MongoDB Atlas (mongodb+srv://) or localhost
    const isAtlas = mongoURI.startsWith('mongodb+srv://');
    
    // Connection options
    const connectionOptions = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    };
    
    // For MongoDB Atlas, add SSL/TLS options
    if (isAtlas) {
      // Try to fix SSL/TLS issues by adding explicit TLS options
      connectionOptions.tls = true;
      connectionOptions.tlsAllowInvalidCertificates = false;
      connectionOptions.tlsAllowInvalidHostnames = false;
      connectionOptions.retryWrites = true;
      connectionOptions.w = 'majority';
      
      // Check if connection string needs parameters
      if (!mongoURI.includes('retryWrites')) {
        const separator = mongoURI.includes('?') ? '&' : '?';
        const updatedURI = `${mongoURI}${separator}retryWrites=true&w=majority`;
        if (updatedURI !== mongoURI) {
          console.log('⚠️  Note: Consider adding ?retryWrites=true&w=majority to your connection string');
        }
      }
    }
    
    // Try connecting with a shorter timeout for faster feedback
    connectionOptions.serverSelectionTimeoutMS = 5000;
    
    await mongoose.connect(mongoURI, connectionOptions);
    
    console.log('✅ MongoDB connected successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });
    
  } catch (error) {
    console.error('\n❌ MongoDB connection failed:', error.message);
    
    // Check if it's an SSL error
    if (error.message.includes('SSL') || error.message.includes('TLS') || error.code === 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR') {
      console.error('\n🔧 SSL/TLS Error Detected - Possible Solutions:');
      console.error('   1. Check your MongoDB Atlas connection string format');
      console.error('   2. Ensure your IP is whitelisted in MongoDB Atlas');
      console.error('   3. Try using a different network (VPN/firewall might be blocking)');
      console.error('   4. Verify your MongoDB Atlas credentials are correct');
      console.error('   5. Check if your MongoDB Atlas cluster is running');
      console.error('\n💡 Connection string should look like:');
      console.error('   mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority');
    } else {
      console.error('💡 Make sure:');
      console.error('   1. MongoDB is running (if using localhost)');
      console.error('   2. MONGODB_URI is set correctly in server/.env');
      console.error('   3. Your IP is whitelisted in MongoDB Atlas (if using Atlas)');
      console.error('   4. Your MongoDB Atlas connection string is correct');
    }
    
    console.error('\n⚠️  Server is running but MongoDB is not connected.');
    console.error('⚠️  Socket.io chat will work, but database features will fail.');
    console.error('⚠️  Retrying MongoDB connection in 10 seconds...\n');
    
    // Retry with longer delay to avoid spam
    setTimeout(() => {
      connectDB();
    }, 10000);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit in production - let the process manager restart it
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Start server immediately (socket.io doesn't need MongoDB)
// MongoDB will connect in the background
const PORT = process.env.PORT || 5000;

// Validate required environment variables (non-critical ones)
const requiredEnvVars = ['MONGODB_URI'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.warn('⚠️  WARNING: Missing environment variables:', missingEnvVars.join(', '));
  console.warn('⚠️  Server will start but some features may not work.');
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Socket.io is ready for connections`);
  console.log(`⚠️  MongoDB connection in progress...`);
  console.log(`🌐 Health check available at: http://localhost:${PORT}/health`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
  }
});

// Connect to MongoDB in the background (non-blocking)
connectDB().catch(err => {
  console.error('MongoDB connection will retry in background');
});

module.exports = { io };

