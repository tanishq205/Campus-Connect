import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import { 
  FiCalendar, 
  FiMapPin, 
  FiUsers, 
  FiTag,
  FiLink,
  FiImage,
  FiX,
  FiSave
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import './CreateEvent.css';

const CreateEvent = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    organizer: '',
    location: '',
    date: '',
    time: '',
    domain: [],
    tags: [],
    registrationLink: '',
    image: ''
  });
  const [domainInput, setDomainInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  // Check if user is admin
  if (!userData || userData.role !== 'admin') {
    return (
      <div className="create-event-container">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You need admin privileges to create events.</p>
          <button onClick={() => navigate('/events')} className="back-btn">
            Go to Events
          </button>
        </div>
      </div>
    );
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddDomain = () => {
    if (domainInput.trim() && !formData.domain.includes(domainInput.trim())) {
      setFormData(prev => ({
        ...prev,
        domain: [...prev.domain, domainInput.trim()]
      }));
      setDomainInput('');
    }
  };

  const handleRemoveDomain = (domain) => {
    setFormData(prev => ({
      ...prev,
      domain: prev.domain.filter(d => d !== domain)
    }));
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
    setLoading(true);

    try {
      // Combine date and time
      const dateTime = formData.date && formData.time 
        ? new Date(`${formData.date}T${formData.time}`)
        : formData.date 
        ? new Date(formData.date)
        : new Date();

      const eventData = {
        title: formData.title,
        description: formData.description,
        organizer: formData.organizer,
        location: formData.location,
        date: dateTime,
        domain: formData.domain,
        tags: formData.tags,
        registrationLink: formData.registrationLink || undefined,
        image: formData.image || undefined,
        participants: []
      };

      await api.post('/events', {
        ...eventData,
        userId: userData._id
      });

      toast.success('Event created successfully!');
      navigate('/events');
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error(error.response?.data?.error || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-event-container">
      <div className="create-event-header">
        <h1>Create New Event</h1>
        <p>Fill in the details to create a new event</p>
      </div>

      <form onSubmit={handleSubmit} className="create-event-form">
        <div className="form-section">
          <h2>Basic Information</h2>
          
          <div className="form-group">
            <label htmlFor="title">
              <FiCalendar /> Event Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              placeholder="e.g., Annual Hackathon 2024"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows="5"
              placeholder="Describe the event in detail..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="organizer">
                <FiUsers /> Organizer *
              </label>
              <input
                type="text"
                id="organizer"
                name="organizer"
                value={formData.organizer}
                onChange={handleInputChange}
                required
                placeholder="e.g., Tech Club"
              />
            </div>

            <div className="form-group">
              <label htmlFor="location">
                <FiMapPin /> Location *
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                required
                placeholder="e.g., Main Auditorium"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="date">
                <FiCalendar /> Date *
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group">
              <label htmlFor="time">
                <FiCalendar /> Time *
              </label>
              <input
                type="time"
                id="time"
                name="time"
                value={formData.time}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Categories & Tags</h2>
          
          <div className="form-group">
            <label>
              <FiTag /> Domains
            </label>
            <div className="input-with-button">
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDomain())}
                placeholder="e.g., Web Development, AI/ML"
              />
              <button type="button" onClick={handleAddDomain} className="add-btn">
                Add
              </button>
            </div>
            {formData.domain.length > 0 && (
              <div className="tags-list">
                {formData.domain.map((domain, index) => (
                  <span key={index} className="tag-item">
                    {domain}
                    <button
                      type="button"
                      onClick={() => handleRemoveDomain(domain)}
                      className="remove-tag-btn"
                    >
                      <FiX />
                    </button>
                  </span>
                ))}
              </div>
            )}
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
                placeholder="e.g., hackathon, workshop, free"
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
        </div>

        <div className="form-section">
          <h2>Additional Information</h2>
          
          <div className="form-group">
            <label htmlFor="registrationLink">
              <FiLink /> Registration Link
            </label>
            <input
              type="url"
              id="registrationLink"
              name="registrationLink"
              value={formData.registrationLink}
              onChange={handleInputChange}
              placeholder="https://example.com/register"
            />
          </div>

          <div className="form-group">
            <label htmlFor="image">
              <FiImage /> Event Image URL
            </label>
            <input
              type="url"
              id="image"
              name="image"
              value={formData.image}
              onChange={handleInputChange}
              placeholder="https://example.com/image.jpg"
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/events')}
            className="cancel-btn"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="submit-btn"
          >
            <FiSave />
            {loading ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateEvent;

