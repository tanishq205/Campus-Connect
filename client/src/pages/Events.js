import React, { useState, useEffect } from 'react';
import api from '../config/api';
import { useAuth } from '../context/AuthContext';
import { FiCalendar, FiMapPin, FiExternalLink, FiUsers } from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './Events.css';

const Events = () => {
  const { userData } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    domain: '',
    location: '',
    search: '',
  });

  useEffect(() => {
    fetchEvents();
  }, [filters]);

  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.domain) params.append('domain', filters.domain);
      if (filters.location) params.append('location', filters.location);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(`/events?${params.toString()}`);
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = async (eventId) => {
    if (!userData) return;
    try {
      await api.post(`/events/${eventId}/join`, { userId: userData._id });
      toast.success('Joined event successfully!');
      fetchEvents();
    } catch (error) {
      toast.error('Failed to join event');
    }
  };

  const handleLeaveEvent = async (eventId) => {
    if (!userData) return;
    try {
      await api.post(`/events/${eventId}/leave`, { userId: userData._id });
      toast.success('Left event');
      fetchEvents();
    } catch (error) {
      toast.error('Failed to leave event');
    }
  };

  if (loading) {
    return <div className="loading">Loading events...</div>;
  }

  return (
    <div className="events">
      <div className="events-header">
        <h1>Discover Events</h1>
      </div>

      <div className="events-filters">
        <input
          type="text"
          placeholder="Search events..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <input
          type="text"
          placeholder="Filter by domain (e.g., AI/ML, WebDev)"
          value={filters.domain}
          onChange={(e) => setFilters({ ...filters, domain: e.target.value })}
        />
        <input
          type="text"
          placeholder="Filter by location"
          value={filters.location}
          onChange={(e) => setFilters({ ...filters, location: e.target.value })}
        />
      </div>

      <div className="events-grid">
        {events.map((event) => {
          const isParticipant = event.participants?.some(
            (p) => p._id === userData?._id
          );
          return (
            <div key={event._id} className="event-card">
              {event.image && (
                <div className="event-image">
                  <img src={event.image} alt={event.title} />
                </div>
              )}
              <div className="event-content">
                <h3>{event.title}</h3>
                <p className="event-description">{event.description}</p>

                <div className="event-details">
                  <div className="event-detail">
                    <FiCalendar />
                    <span>{format(new Date(event.date), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="event-detail">
                    <FiMapPin />
                    <span>{event.location}</span>
                  </div>
                  <div className="event-detail">
                    <FiUsers />
                    <span>{event.participants?.length || 0} participants</span>
                  </div>
                </div>

                <div className="event-tags">
                  {event.domain?.map((domain, index) => (
                    <span key={index} className="event-tag">{domain}</span>
                  ))}
                </div>

                <div className="event-actions">
                  {event.registrationLink && (
                    <a
                      href={event.registrationLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="event-link"
                    >
                      <FiExternalLink /> Register
                    </a>
                  )}
                  {isParticipant ? (
                    <button
                      className="leave-btn"
                      onClick={() => handleLeaveEvent(event._id)}
                    >
                      Leave Event
                    </button>
                  ) : (
                    <button
                      className="join-btn"
                      onClick={() => handleJoinEvent(event._id)}
                    >
                      Join Event
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {events.length === 0 && (
        <div className="empty-state">
          <p>No events found. Try adjusting your filters.</p>
        </div>
      )}
    </div>
  );
};

export default Events;

