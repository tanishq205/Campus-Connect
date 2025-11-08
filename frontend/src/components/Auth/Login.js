import React, { useState } from 'react';
import axios from 'axios';
import './Login.css';

const Login = () => {
  const [credentials, setCredentials] = useState({ 
    usernameOrEmail: '', 
    password: '' 
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Validate on frontend first
    if (!credentials.usernameOrEmail.trim() || !credentials.password.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);

    // Debug logs
    console.log('📤 Sending login request');
    console.log('Data:', {
      usernameOrEmail: credentials.usernameOrEmail,
      passwordLength: credentials.password.length
    });

    try {
      const response = await axios({
        method: 'post',
        url: 'http://localhost:5000/api/auth/login',
        data: {
          usernameOrEmail: credentials.usernameOrEmail.trim(),
          password: credentials.password.trim()
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Login response:', response.data);
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', response.data.userId);
      localStorage.setItem('username', response.data.username);
      localStorage.setItem('name', response.data.name);
      
      alert(`Welcome back, ${response.data.name}!`);
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMsg = error.response?.data?.error || 'Login failed. Please try again.';
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="logo">Campus Connect</h1>
        
        <form onSubmit={handleLogin}>
          <input
            type="text"
            name="usernameOrEmail"
            placeholder="Username or Email"
            value={credentials.usernameOrEmail}
            onChange={(e) => setCredentials({ 
              ...credentials, 
              usernameOrEmail: e.target.value 
            })}
            required
            autoFocus
            autoComplete="username"
          />
          
          <div className="password-input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={credentials.password}
              onChange={(e) => setCredentials({ 
                ...credentials, 
                password: e.target.value 
              })}
              required
              autoComplete="current-password"
            />
            <button 
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        
        <div className="divider">
          <span>OR</span>
        </div>
        
        <p className="signup-link">
          Don't have an account? <a href="/signup">Sign up</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
