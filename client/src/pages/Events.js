import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/api';
import { useAuth } from '../context/AuthContext';
import { 
  FiCalendar, 
  FiMapPin, 
  FiExternalLink, 
  FiUsers, 
  FiSearch,
  FiFilter,
  FiX,
  FiTag
} from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './Events.css';

const Events = () => {
  const { userData } = useAuth();
  const [allEvents, setAllEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableDomains, setAvailableDomains] = useState([]);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    domain: '',
    location: '',
    search: '',
  });

  // Fetch all events on mount
  useEffect(() => {
    fetchAllEvents();
  }, []);

  const fetchAllEvents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/events');
      const eventsData = response.data || [];
      setAllEvents(eventsData);
      
      // Extract unique domains from all events
      const domains = new Set();
      const locations = new Set();
      
      eventsData.forEach(event => {
        if (event.domain && Array.isArray(event.domain)) {
          event.domain.forEach(domain => {
            if (domain) domains.add(domain);
          });
        }
        if (event.location) {
          locations.add(event.location);
        }
      });
      
      setAvailableDomains(Array.from(domains).sort());
      setAvailableLocations(Array.from(locations).sort());
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = useCallback(() => {
    if (allEvents.length === 0) {
      setFilteredEvents([]);
      return;
    }
    
    let filtered = [...allEvents];

    // Apply search filter
    if (filters.search && filters.search.trim()) {
      const searchLower = filters.search.toLowerCase().trim();
      filtered = filtered.filter(
        (event) => {
          const titleMatch = event.title?.toLowerCase().includes(searchLower) || false;
          const descMatch = event.description?.toLowerCase().includes(searchLower) || false;
          const organizerMatch = event.organizer?.toLowerCase().includes(searchLower) || false;
          const locationMatch = event.location?.toLowerCase().includes(searchLower) || false;
          
          return titleMatch || descMatch || organizerMatch || locationMatch;
        }
      );
    }

    // Apply domain filter
    if (filters.domain) {
      filtered = filtered.filter((event) =>
        event.domain?.some((domain) => 
          domain && domain.toLowerCase() === filters.domain.toLowerCase()
        )
      );
    }

    // Apply location filter
    if (filters.location && filters.location.trim()) {
      const locationLower = filters.location.toLowerCase().trim();
      filtered = filtered.filter((event) =>
        event.location?.toLowerCase().includes(locationLower)
      );
    }

    // Sort by date (upcoming first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA - dateB;
    });

    setFilteredEvents(filtered);
  }, [filters, allEvents]);

  // Apply filters when filters or allEvents change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const clearFilters = () => {
    setFilters({
      domain: '',
      location: '',
      search: '',
    });
  };

  const handleJoinEvent = async (eventId) => {
    if (!userData) {
      toast.error('Please login to join events');
      return;
    }
    try {
      await api.post(`/events/${eventId}/join`, { userId: userData._id });
      toast.success('Joined event successfully!');
      fetchAllEvents();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to join event');
    }
  };

  const handleLeaveEvent = async (eventId) => {
    if (!userData) return;
    try {
      await api.post(`/events/${eventId}/leave`, { userId: userData._id });
      toast.success('Left event');
      fetchAllEvents();
    } catch (error) {
      toast.error('Failed to leave event');
    }
  };

  if (loading) {
    return (
      <div className="events">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading events...</p>
        </div>
      </div>
    );
  }

  const hasActiveFilters = filters.search || filters.domain || filters.location;

  return (
    <div className="events">
      <div className="events-header">
        <h1>Discover Events</h1>
        <p>Find exciting events happening around campus</p>
      </div>

      {/* Search Bar */}
      <div className="search-filter-bar">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search events by title, description, organizer, or location..."
            value={filters.search || ''}
            onChange={(e) => {
              const newValue = e.target.value;
              setFilters(prev => ({ ...prev, search: newValue }));
            }}
          />
        </div>
        <button
          className="filter-toggle-btn"
          onClick={() => setShowFilters(!showFilters)}
        >
          <FiFilter />
          Filters
          {hasActiveFilters && (
            <span className="filter-badge">
              {[filters.domain, filters.location].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="advanced-filters">
          <div className="filter-group">
            <label>
              <FiTag /> Domain
            </label>
            <select
              value={filters.domain}
              onChange={(e) => setFilters({ ...filters, domain: e.target.value })}
            >
              <option value="">All Domains</option>
              {availableDomains.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>
              <FiMapPin /> Location
            </label>
            <input
              type="text"
              list="locations-list"
              placeholder="Search by location..."
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            />
            <datalist id="locations-list">
              {availableLocations.map((location) => (
                <option key={location} value={location} />
              ))}
            </datalist>
          </div>

          {hasActiveFilters && (
            <button className="clear-filters-btn" onClick={clearFilters}>
              <FiX /> Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Results Count */}
      {!loading && (
        <div className="results-count">
          <p>
            Showing <strong>{filteredEvents.length}</strong> of <strong>{allEvents.length}</strong> events
            {hasActiveFilters && ' (filtered)'}
          </p>
        </div>
      )}

      <div className="events-grid">
        {filteredEvents.map((event) => {
          const isParticipant = event.participants?.some(
            (p) => {
              const participantId = typeof p === 'object' ? (p._id || p) : p;
              return participantId?.toString() === userData?._id?.toString();
            }
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
                {event.organizer && (
                  <p className="event-organizer">by {event.organizer}</p>
                )}
                <p className="event-description">{event.description}</p>

                <div className="event-details">
                  <div className="event-detail">
                    <FiCalendar />
                    <span>{format(new Date(event.date), 'MMM dd, yyyy • h:mm a')}</span>
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

                {event.domain && event.domain.length > 0 && (
                  <div className="event-tags">
                    {event.domain.map((domain, index) => (
                      <span key={index} className="event-tag">{domain}</span>
                    ))}
                  </div>
                )}

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

      {!loading && filteredEvents.length === 0 && (
        <div className="empty-state">
          <FiCalendar size={64} />
          <h3>No events found</h3>
          <p>
            {hasActiveFilters 
              ? 'Try adjusting your search or filters to find more events.'
              : 'No events are available at the moment. Check back later!'}
          </p>
          {hasActiveFilters && (
            <button className="clear-filters-btn" onClick={clearFilters}>
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Events;

