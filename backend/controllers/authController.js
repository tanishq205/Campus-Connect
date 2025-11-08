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

    // Hash password with explicit salt rounds
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // DEBUG: Log the password details
    console.log('=== REGISTRATION DEBUG ===');
    console.log('Plain password:', password);
    console.log('Hashed password:', hashedPassword);
    console.log('Hash length:', hashedPassword.length);
    console.log('========================');

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

// Login user - WITH DETAILED DEBUGGING
exports.login = async (req, res) => {
  try {
    console.log('=== LOGIN DEBUG START ===');
    console.log('Request body:', req.body);
    
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      console.log('Missing credentials');
      return res.status(400).json({ error: 'Username/Email and password are required' });
    }

    console.log('Login attempt for:', usernameOrEmail);
    console.log('Password provided:', password);
    console.log('Password type:', typeof password);
    console.log('Password length:', password.length);

    const isEmail = usernameOrEmail.includes('@');
    
    let query, params;
    if (isEmail) {
      query = 'SELECT * FROM users WHERE college_email = ?';
      params = [usernameOrEmail];
    } else {
      query = 'SELECT * FROM users WHERE username = ?';
      params = [usernameOrEmail];
    }

    console.log('Query:', query);
    console.log('Params:', params);

    const [users] = await db.query(query, params);
    
    if (users.length === 0) {
      console.log('User not found');
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const user = users[0];
    console.log('User found:', user.username);
    console.log('Stored hash:', user.password);
    console.log('Hash length:', user.password ? user.password.length : 'NULL');
    console.log('Hash starts with:', user.password ? user.password.substring(0, 7) : 'NULL');

    // CRITICAL: Check if password hash exists and is valid
    if (!user.password || user.password.length < 50) {
      console.log('ERROR: Invalid password hash in database');
      return res.status(500).json({ error: 'Account error. Please contact support.' });
    }

    // Test bcrypt compare
    console.log('Comparing passwords...');
    console.log('Plain password:', password);
    console.log('Hashed password:', user.password);
    
    const isMatch = await bcrypt.compare(password, user.password);
    
    console.log('Password match result:', isMatch);
    console.log('=== LOGIN DEBUG END ===');
    
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
