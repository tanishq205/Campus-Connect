import React, { useState } from 'react';
import axios from 'axios';
import './SignupFlow.css';

const SignupFlow = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    collegeName: '',
    collegeEmail: '',
    password: '',
    confirmPassword: '',
    branch: '',
    github: '',
    linkedin: '',
    portfolio: '',
    bio: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      updateField('profileImage', file);
    }
  };

  const handleSubmit = async () => {
    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] && key !== 'confirmPassword') {
          formDataToSend.append(key, formData[key]);
        }
      });

      const response = await axios.post('http://localhost:5000/api/auth/register', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert(`Registration successful! Your username is: ${response.data.username}`);
      window.location.href = '/login';
    } catch (error) {
      console.error('Registration error:', error.response?.data || error.message);
      alert(error.response?.data?.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <h1 className="logo">Campus Connect</h1>
        <div className="progress-bar">
          <div className="progress" style={{ width: `${(step / 4) * 100}%` }}></div>
        </div>
        
        {step === 1 && (
          <StepOne 
            formData={formData} 
            updateField={updateField} 
            nextStep={nextStep}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
          />
        )}
        {step === 2 && <StepTwo formData={formData} updateField={updateField} nextStep={nextStep} prevStep={prevStep} />}
        {step === 3 && <StepThree formData={formData} updateField={updateField} handleImageUpload={handleImageUpload} nextStep={nextStep} prevStep={prevStep} />}
        {step === 4 && <StepFour formData={formData} updateField={updateField} handleSubmit={handleSubmit} prevStep={prevStep} />}
      </div>
    </div>
  );
};

// Step 1 - Basic Info with Password
const StepOne = ({ formData, updateField, nextStep, showPassword, setShowPassword, showConfirmPassword, setShowConfirmPassword }) => {
  const validateStep = () => {
    if (!formData.name || !formData.collegeName || !formData.collegeEmail || !formData.password || !formData.confirmPassword) {
      alert('Please fill all required fields');
      return false;
    }
    if (!formData.collegeEmail.includes('@')) {
      alert('Please enter a valid college email');
      return false;
    }
    if (formData.password.length < 6) {
      alert('Password must be at least 6 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) nextStep();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNext();
    }
  };

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: '#ddd' };
    
    let strength = 0;
    if (password.length >= 6) strength += 25;
    if (password.length >= 8) strength += 15;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 20;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 20;
    
    if (strength < 40) return { strength, label: 'Weak', color: '#ff4444' };
    if (strength < 70) return { strength, label: 'Fair', color: '#ffbb33' };
    return { strength, label: 'Strong', color: '#00C851' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="step-content">
      <h2>Get Started</h2>
      <input
        type="text"
        placeholder="Full Name"
        value={formData.name}
        onChange={(e) => updateField('name', e.target.value)}
        onKeyPress={handleKeyPress}
        required
        autoFocus
      />
      <input
        type="text"
        placeholder="College Name"
        value={formData.collegeName}
        onChange={(e) => updateField('collegeName', e.target.value)}
        onKeyPress={handleKeyPress}
        required
      />
      <input
        type="email"
        placeholder="College Email ID"
        value={formData.collegeEmail}
        onChange={(e) => updateField('collegeEmail', e.target.value)}
        onKeyPress={handleKeyPress}
        required
      />
      
      <div className="password-field">
        <div className="password-input-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password (min. 6 characters)"
            value={formData.password}
            onChange={(e) => updateField('password', e.target.value)}
            onKeyPress={handleKeyPress}
            required
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
        {formData.password && (
          <div className="password-strength">
            <div className="strength-bar">
              <div 
                className="strength-fill" 
                style={{ width: `${passwordStrength.strength}%`, backgroundColor: passwordStrength.color }}
              ></div>
            </div>
            <span className="strength-label" style={{ color: passwordStrength.color }}>
              {passwordStrength.label}
            </span>
          </div>
        )}
      </div>

      <div className="password-input-wrapper">
        <input
          type={showConfirmPassword ? "text" : "password"}
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChange={(e) => updateField('confirmPassword', e.target.value)}
          onKeyPress={handleKeyPress}
          required
        />
        <button 
          type="button"
          className="toggle-password"
          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          tabIndex={-1}
        >
          {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
        </button>
      </div>

      <button type="submit" className="btn-primary">Next</button>
      <p className="login-link">Already have an account? <a href="/login">Log in</a></p>
    </form>
  );
};

// Step 2 - Branch/Year
const StepTwo = ({ formData, updateField, nextStep, prevStep }) => {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      nextStep();
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); nextStep(); }} className="step-content">
      <h2>Academic Details</h2>
      <p className="subtitle">Tell us about your branch and year (optional)</p>
      <input
        type="text"
        placeholder="Branch/Year (e.g., CS 3rd Year)"
        value={formData.branch}
        onChange={(e) => updateField('branch', e.target.value)}
        onKeyPress={handleKeyPress}
        autoFocus
      />
      <div className="button-group">
        <button type="button" className="btn-secondary" onClick={prevStep}>Back</button>
        <button type="submit" className="btn-primary">Next</button>
      </div>
      <button type="button" className="btn-skip" onClick={nextStep}>Skip</button>
    </form>
  );
};

// Step 3 - Profile Image & Links
const StepThree = ({ formData, updateField, handleImageUpload, nextStep, prevStep }) => {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      nextStep();
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); nextStep(); }} className="step-content">
      <h2>Profile & Links</h2>
      <p className="subtitle">Add your social links (optional)</p>
      <input
        type="url"
        placeholder="🔗 GitHub URL (optional)"
        value={formData.github}
        onChange={(e) => updateField('github', e.target.value)}
        onKeyPress={handleKeyPress}
        autoFocus
      />
      <input
        type="url"
        placeholder="🔗 LinkedIn URL (optional)"
        value={formData.linkedin}
        onChange={(e) => updateField('linkedin', e.target.value)}
        onKeyPress={handleKeyPress}
      />
      <input
        type="url"
        placeholder="🔗 Portfolio URL (optional)"
        value={formData.portfolio}
        onChange={(e) => updateField('portfolio', e.target.value)}
        onKeyPress={handleKeyPress}
      />
      <div className="button-group">
        <button type="button" className="btn-secondary" onClick={prevStep}>Back</button>
        <button type="submit" className="btn-primary">Next</button>
      </div>
      <button type="button" className="btn-skip" onClick={nextStep}>Skip</button>
    </form>
  );
};

// Step 4 - Bio
const StepFour = ({ formData, updateField, handleSubmit, prevStep }) => {
  const handleKeyPress = (e) => {
    // For textarea, allow Shift+Enter for new line, Enter alone submits
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="step-content">
      <h2>Tell Us About Yourself</h2>
      <p className="subtitle">Share your interests, skills, and what you're passionate about (optional)</p>
      <textarea
        placeholder="Write a short bio about yourself... (Shift+Enter for new line, Enter to submit)"
        value={formData.bio}
        onChange={(e) => updateField('bio', e.target.value)}
        onKeyPress={handleKeyPress}
        rows="5"
        autoFocus
      />
      <div className="button-group">
        <button type="button" className="btn-secondary" onClick={prevStep}>Back</button>
        <button type="submit" className="btn-primary">Complete Signup</button>
      </div>
      <button type="button" className="btn-skip" onClick={handleSubmit}>Skip & Finish</button>
    </form>
  );
};

export default SignupFlow;
