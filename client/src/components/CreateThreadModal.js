import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEmailVerification } from '../hooks/useEmailVerification';
import api from '../config/api';
import { FiX, FiTag } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './CreateThreadModal.css';

const CreateThreadModal = ({ onClose, onSuccess }) => {
  const { userData } = useAuth();
  const { requireVerification } = useEmailVerification();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!requireVerification('create discussions')) {
      onClose();
    }
  }, []);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');

  const categories = [
    { value: 'brainstorming', label: 'Brainstorming' },
    { value: 'feedback', label: 'Peer Feedback' },
    { value: 'technical', label: 'Technical' },
    { value: 'collaboration', label: 'Collaboration' },
    { value: 'general', label: 'General' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!requireVerification('create discussions')) {
      return;
    }
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await api.post('/discussions', {
        ...formData,
        userId: userData._id
      });
      
      toast.success('Discussion thread created!');
      onSuccess();
    } catch (error) {
      console.error('Error creating thread:', error);
      toast.error(error.response?.data?.error || 'Failed to create discussion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-thread-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Start New Discussion</h2>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="thread-form">
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              placeholder="What's your discussion about?"
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="content">Content *</label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              required
              rows="8"
              placeholder="Share your thoughts, ideas, or ask for feedback..."
            />
          </div>

          <div className="form-group">
            <label>
              <FiTag /> Tags
            </label>
            <div className="input-with-button">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add tags (press Enter)"
              />
              <button type="button" onClick={handleAddTag} className="add-btn">
                Add
              </button>
            </div>
            {formData.tags.length > 0 && (
              <div className="tags-list">
                {formData.tags.map((tag, index) => (
                  <span key={index} className="tag-item">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="remove-tag-btn"
                    >
                      <FiX />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Creating...' : 'Create Discussion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateThreadModal;

