const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/events', require('./routes/events'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/chat', require('./routes/chat'));

// Socket.io for real-time chat
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    console.log(`User ${socket.id} left room ${roomId}`);
  });

  socket.on('send-message', async (data) => {
    // Emit to the specific room
    io.to(data.roomId).emit('receive-message', data);
    console.log(`Message sent to room: ${data.roomId}`);
    
    // Optionally save message to database/storage
    // For now, we'll store in memory via the chat route
    try {
      const postData = JSON.stringify({
        roomId: data.roomId,
        message: data
      });
      
      const options = {
        hostname: 'localhost',
        port: process.env.PORT || 5000,
        path: '/api/chat/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = http.request(options, (res) => {
        // Handle response if needed
      });
      
      req.on('error', (error) => {
        console.error('Error saving message:', error);
      });
      
      req.write(postData);
      req.end();
    } catch (error) {
      console.error('Error saving message:', error);
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
      // MongoDB Atlas requires TLS by default
      // Don't set tls: true explicitly as it's handled by mongodb+srv://
      // But we can add connection pool options
      connectionOptions.retryWrites = true;
      connectionOptions.w = 'majority';
      
      // Ensure connection string has proper parameters
      if (!mongoURI.includes('retryWrites')) {
        const separator = mongoURI.includes('?') ? '&' : '?';
        const updatedURI = `${mongoURI}${separator}retryWrites=true&w=majority`;
        // Use updated URI if it's different
        if (updatedURI !== mongoURI) {
          console.log('⚠️  Adding retryWrites and w=majority to connection string');
        }
      }
    }
    
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
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Full error:', error);
    console.error('💡 Make sure:');
    console.error('   1. MongoDB is running (if using localhost)');
    console.error('   2. MONGODB_URI is set correctly in server/.env');
    console.error('   3. Your IP is whitelisted in MongoDB Atlas (if using Atlas)');
    console.error('   4. Your MongoDB Atlas connection string is correct');
    console.error('   5. Your MongoDB version is compatible (Mongoose 8.x supports MongoDB 4.4+)');
    console.error('   6. For Atlas SSL errors, try adding ?tls=true to your connection string');
    console.error('   7. Check your network/firewall settings');
    
    // Don't exit immediately - allow retry
    console.error('⚠️  Retrying connection in 5 seconds...');
    setTimeout(() => {
      connectDB();
    }, 5000);
  }
};

// Connect to MongoDB before starting server
let serverStarted = false;

connectDB().then(() => {
  if (!serverStarted) {
    serverStarted = true;
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  }
}).catch(err => {
  console.error('Failed to start server:', err);
  // Don't exit - let the retry mechanism handle it
});

module.exports = { io };

