const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Generate unique username
const generateUsername = (name, collegeEmail) => {
  const namePart = name.toLowerCase().replace(/\s+/g, '').substring(0, 8);
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${namePart}${randomNum}`;
};

// Register user
exports.register = async (req, res) => {
  try {
    const { name, collegeName, collegeEmail, password, branch, github, linkedin, portfolio, bio } = req.body;
    const profileImage = req.file ? req.file.filename : null;

    if (!name || !collegeName || !collegeEmail || !password) {
      return res.status(400).json({ error: 'Name, college name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const [existing] = await db.query('SELECT * FROM users WHERE college_email = ?', [collegeEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    let username = generateUsername(name, collegeEmail);
    let [userExists] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    
    while (userExists.length > 0) {
      username = generateUsername(name, collegeEmail);
      [userExists] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO users (username, name, college_name, college_email, password, branch, profile_image, github, linkedin, portfolio, bio) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, name, collegeName, collegeEmail, hashedPassword, branch || null, profileImage, github || null, linkedin || null, portfolio || null, bio || null]
    );

    res.status(201).json({ 
      message: 'User registered successfully',
      username,
      userId: result.insertId
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    console.log('Login request body:', req.body);
    
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required' });
    }

    const isEmail = usernameOrEmail.includes('@');
    
    let query, params;
    if (isEmail) {
      query = 'SELECT * FROM users WHERE college_email = ?';
      params = [usernameOrEmail];
    } else {
      query = 'SELECT * FROM users WHERE username = ?';
      params = [usernameOrEmail];
    }

    const [users] = await db.query(query, params);
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username }, 
      process.env.JWT_SECRET || 'your_jwt_secret_key_here', 
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      userId: user.id,
      username: user.username,
      name: user.name,
      email: user.college_email
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
};
