import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEmailVerification } from '../hooks/useEmailVerification';
import api from '../config/api';
import toast from 'react-hot-toast';
import { FiX } from 'react-icons/fi';
import './CreateProjectModal.css';

const CreateProjectModal = ({ onClose, onSuccess }) => {
  const { userData } = useAuth();
  const { requireVerification } = useEmailVerification();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    requiredSkills: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!requireVerification('create projects')) {
      onClose();
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!requireVerification('create projects')) {
      return;
    }
    
    if (!userData || !userData._id) {
      toast.error('User data not loaded. Please refresh the page.');
      return;
    }
    
    setLoading(true);

    try {
      const projectData = {
        title: formData.title,
        description: formData.description,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        requiredSkills: formData.requiredSkills.split(',').map(s => s.trim()).filter(s => s),
        creator: userData._id,
        userId: userData._id, // Required by email verification middleware
        status: 'open',
      };

      console.log('Creating project with data:', projectData);
      const response = await api.post('/projects', projectData);
      console.log('Project created:', response.data);
      toast.success('Project created successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error(error.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Project</h2>
          <button onClick={onClose} className="close-btn">
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <input
            type="text"
            name="title"
            placeholder="Project Title"
            value={formData.title}
            onChange={handleChange}
            required
          />
          <textarea
            name="description"
            placeholder="Project Description"
            value={formData.description}
            onChange={handleChange}
            rows="5"
            required
          />
          <input
            type="text"
            name="tags"
            placeholder="Tags (comma separated, e.g., AI/ML, WebDev, IoT)"
            value={formData.tags}
            onChange={handleChange}
          />
          <input
            type="text"
            name="requiredSkills"
            placeholder="Required Skills (comma separated, e.g., React, Node.js, Python)"
            value={formData.requiredSkills}
            onChange={handleChange}
          />
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;

