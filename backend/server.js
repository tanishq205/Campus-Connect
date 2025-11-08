const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const authRoutes = require('./routes/authRoutes');

dotenv.config();

const app = express();

// 1. CORS FIRST
app.use(cors());

// 2. Body parsers BEFORE routes - CRITICAL!
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 4. Routes LAST
app.use('/api/auth', authRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Campus Connect API is running!' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 API: http://localhost:${PORT}`);
});
