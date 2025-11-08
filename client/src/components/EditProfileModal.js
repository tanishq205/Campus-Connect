import React, { useState } from 'react';
import api from '../config/api';
import toast from 'react-hot-toast';
import { FiX } from 'react-icons/fi';
import './CreateProjectModal.css';

const EditProfileModal = ({ userData, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: userData.name || '',
    college: userData.college || '',
    branch: userData.branch || '',
    year: userData.year || '',
    bio: userData.bio || '',
    skills: userData.skills?.join(', ') || '',
    interests: userData.interests?.join(', ') || '',
    github: userData.github || '',
    linkedin: userData.linkedin || '',
    portfolio: userData.portfolio || '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        ...formData,
        skills: formData.skills.split(',').map(s => s.trim()).filter(s => s),
        interests: formData.interests.split(',').map(i => i.trim()).filter(i => i),
      };

      await api.put(`/users/${userData._id}`, updateData);
      toast.success('Profile updated successfully!');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Profile</h2>
          <button onClick={onClose} className="close-btn">
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="college"
            placeholder="College"
            value={formData.college}
            onChange={handleChange}
            required
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <input
              type="text"
              name="branch"
              placeholder="Branch"
              value={formData.branch}
              onChange={handleChange}
            />
            <input
              type="text"
              name="year"
              placeholder="Year"
              value={formData.year}
              onChange={handleChange}
            />
          </div>
          <textarea
            name="bio"
            placeholder="Bio"
            value={formData.bio}
            onChange={handleChange}
            rows="3"
          />
          <input
            type="text"
            name="skills"
            placeholder="Skills (comma separated)"
            value={formData.skills}
            onChange={handleChange}
          />
          <input
            type="text"
            name="interests"
            placeholder="Interests (comma separated)"
            value={formData.interests}
            onChange={handleChange}
          />
          <input
            type="url"
            name="github"
            placeholder="GitHub URL"
            value={formData.github}
            onChange={handleChange}
          />
          <input
            type="url"
            name="linkedin"
            placeholder="LinkedIn URL"
            value={formData.linkedin}
            onChange={handleChange}
          />
          <input
            type="url"
            name="portfolio"
            placeholder="Portfolio URL"
            value={formData.portfolio}
            onChange={handleChange}
          />
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;

