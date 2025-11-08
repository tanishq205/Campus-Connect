import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  FiClock,
  FiTag
} from 'react-icons/fi';
import { format, isPast, isToday, isFuture } from 'date-fns';
import toast from 'react-hot-toast';
import './DiscoverEvents.css';

const DiscoverEvents = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    domain: '',
    location: '',
    dateFilter: 'all', // 'all', 'upcoming', 'today', 'past'
  });

  // Common domains for filtering
  const commonDomains = [
    'AI/ML',
    'Web Development',
    'Mobile Development',
    'Data Science',
    'Cybersecurity',
    'Blockchain',
    'Cloud Computing',
    'DevOps',
    'UI/UX Design',
    'Game Development',
    'IoT',
    'Other'
  ];

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [events, filters]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.domain) params.append('domain', filters.domain);
      if (filters.location) params.append('location', filters.location);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(`/events?${params.toString()}`);
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...events];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.title?.toLowerCase().includes(searchLower) ||
          event.description?.toLowerCase().includes(searchLower) ||
          event.organizer?.toLowerCase().includes(searchLower)
      );
    }

    // Apply date filter
    if (filters.dateFilter !== 'all') {
      filtered = filtered.filter((event) => {
        const eventDate = new Date(event.date);
        switch (filters.dateFilter) {
          case 'upcoming':
            return isFuture(eventDate) || isToday(eventDate);
          case 'today':
            return isToday(eventDate);
          case 'past':
            return isPast(eventDate) && !isToday(eventDate);
          default:
            return true;
        }
      });
    }

    // Sort: upcoming first, then by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (isPast(dateA) && !isToday(dateA) && (isFuture(dateB) || isToday(dateB))) return 1;
      if ((isFuture(dateA) || isToday(dateA)) && isPast(dateB) && !isToday(dateB)) return -1;
      return dateA - dateB;
    });

    setFilteredEvents(filtered);
  };

  const handleJoinEvent = async (eventId) => {
    if (!userData) {
      toast.error('Please login to join events');
      return;
    }
    try {
      await api.post(`/events/${eventId}/join`, { userId: userData._id });
      toast.success('Joined event successfully!');
      fetchEvents();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to join event');
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

  const clearFilters = () => {
    setFilters({
      search: '',
      domain: '',
      location: '',
      dateFilter: 'all',
    });
  };

  const getEventStatus = (eventDate) => {
    const date = new Date(eventDate);
    if (isPast(date) && !isToday(date)) return 'past';
    if (isToday(date)) return 'today';
    return 'upcoming';
  };

  const featuredEvents = filteredEvents
    .filter((e) => getEventStatus(e.date) === 'upcoming')
    .slice(0, 3);

  if (loading) {
    return (
      <div className="discover-events">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="discover-events">
      <div className="discover-events-header">
        <div>
          <h1>Discover Events</h1>
          <p>Find exciting events happening around campus</p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="search-filter-bar">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search events by title, description, or organizer..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <button
          className="filter-toggle-btn"
          onClick={() => setShowFilters(!showFilters)}
        >
          <FiFilter />
          Filters
          {(filters.domain || filters.location || filters.dateFilter !== 'all') && (
            <span className="filter-badge">
              {[filters.domain, filters.location, filters.dateFilter !== 'all' ? filters.dateFilter : null].filter(Boolean).length}
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
              {commonDomains.map((domain) => (
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
              placeholder="Filter by location..."
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            />
          </div>

          <div className="filter-group">
            <label>
              <FiClock /> Date
            </label>
            <select
              value={filters.dateFilter}
              onChange={(e) => setFilters({ ...filters, dateFilter: e.target.value })}
            >
              <option value="all">All Events</option>
              <option value="upcoming">Upcoming</option>
              <option value="today">Today</option>
              <option value="past">Past Events</option>
            </select>
          </div>

          {(filters.domain || filters.location || filters.dateFilter !== 'all') && (
            <button className="clear-filters-btn" onClick={clearFilters}>
              <FiX /> Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Featured Events Section */}
      {featuredEvents.length > 0 && (
        <div className="featured-section">
          <h2>Featured Events</h2>
          <div className="featured-events-grid">
            {featuredEvents.map((event) => {
              const isParticipant = event.participants?.some(
                (p) => (p._id || p) === userData?._id
              );
              return (
                <div key={event._id} className="featured-event-card">
                  {event.image && (
                    <div className="event-image">
                      <img src={event.image} alt={event.title} />
                      <div className="event-badge upcoming">Upcoming</div>
                    </div>
                  )}
                  <div className="event-content">
                    <h3>{event.title}</h3>
                    <p className="event-organizer">by {event.organizer}</p>
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
                        <span>{event.participants?.length || 0} going</span>
                      </div>
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
                          Leave
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
        </div>
      )}

      {/* All Events Section */}
      <div className="all-events-section">
        <div className="section-header">
          <h2>
            All Events
            <span className="event-count">({filteredEvents.length})</span>
          </h2>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="empty-state">
            <FiCalendar size={64} />
            <h3>No events found</h3>
            <p>Try adjusting your search or filters to find more events.</p>
            {(filters.search || filters.domain || filters.location || filters.dateFilter !== 'all') && (
              <button className="clear-filters-btn" onClick={clearFilters}>
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="events-grid">
            {filteredEvents.map((event) => {
              const isParticipant = event.participants?.some(
                (p) => (p._id || p) === userData?._id
              );
              const status = getEventStatus(event.date);
              
              return (
                <div key={event._id} className="event-card">
                  {event.image && (
                    <div className="event-image">
                      <img src={event.image} alt={event.title} />
                      <div className={`event-badge ${status}`}>
                        {status === 'past' ? 'Past' : status === 'today' ? 'Today' : 'Upcoming'}
                      </div>
                    </div>
                  )}
                  <div className="event-content">
                    <h3>{event.title}</h3>
                    <p className="event-organizer">by {event.organizer}</p>
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
                          <span key={index} className="event-tag">
                            {domain}
                          </span>
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
        )}
      </div>
    </div>
  );
};

export default DiscoverEvents;

