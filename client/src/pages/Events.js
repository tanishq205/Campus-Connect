import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  FiTag,
  FiCode,
  FiBook,
  FiUser,
  FiClock
} from 'react-icons/fi';
import { format, isPast, isToday, isFuture } from 'date-fns';
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
    eventType: '', // 'hackathon', 'workshop', 'student-event', or ''
    dateFilter: 'all', // 'all', 'upcoming', 'today', 'this-week'
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

  // Helper function to detect event type
  const getEventType = (event) => {
    const title = (event.title || '').toLowerCase();
    const description = (event.description || '').toLowerCase();
    const tags = (event.tags || []).map(t => t.toLowerCase());
    const allText = `${title} ${description} ${tags.join(' ')}`;
    
    if (allText.includes('hackathon') || allText.includes('hack') || allText.includes('coding competition')) {
      return 'hackathon';
    }
    if (allText.includes('workshop') || allText.includes('training') || allText.includes('session')) {
      return 'workshop';
    }
    if (allText.includes('student') || allText.includes('campus') || allText.includes('college')) {
      return 'student-event';
    }
    return 'other';
  };

  // Apply filters whenever filters or allEvents change
  useEffect(() => {
    if (allEvents.length === 0) {
      setFilteredEvents([]);
      return;
    }
    
    let filtered = [...allEvents];

    // Apply search filter
    if (filters.search && filters.search.trim()) {
      const searchLower = filters.search.toLowerCase().trim();
      filtered = filtered.filter((event) => {
        const title = (event.title || '').toLowerCase();
        const description = (event.description || '').toLowerCase();
        const organizer = (event.organizer || '').toLowerCase();
        const location = (event.location || '').toLowerCase();
        
        return title.includes(searchLower) || 
               description.includes(searchLower) || 
               organizer.includes(searchLower) || 
               location.includes(searchLower);
      });
    }

    // Apply event type filter
    if (filters.eventType) {
      filtered = filtered.filter((event) => getEventType(event) === filters.eventType);
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
        (event.location || '').toLowerCase().includes(locationLower)
      );
    }

    // Apply date filter
    if (filters.dateFilter && filters.dateFilter !== 'all') {
      const now = new Date();
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      filtered = filtered.filter((event) => {
        const eventDate = new Date(event.date);
        switch (filters.dateFilter) {
          case 'upcoming':
            return isFuture(eventDate) || isToday(eventDate);
          case 'today':
            return isToday(eventDate);
          case 'this-week':
            return eventDate >= now && eventDate <= oneWeekFromNow;
          default:
            return true;
        }
      });
    }

    // Sort by date (upcoming first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA - dateB;
    });

    setFilteredEvents(filtered);
  }, [filters, allEvents]);

  const clearFilters = () => {
    setFilters({
      domain: '',
      location: '',
      search: '',
      eventType: '',
      dateFilter: 'all',
    });
  };

  // Get curated events by type (always from allEvents, not filtered)
  const getCuratedEvents = (type) => {
    return allEvents
      .filter(event => {
        const eventType = getEventType(event);
        const eventDate = new Date(event.date);
        return eventType === type && (isFuture(eventDate) || isToday(eventDate));
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 6); // Show max 6 per category
  };

  const hackathons = getCuratedEvents('hackathon');
  const workshops = getCuratedEvents('workshop');
  const studentEvents = getCuratedEvents('student-event');

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

  const hasActiveFilters = filters.search || filters.domain || filters.location || filters.eventType || filters.dateFilter !== 'all';

  return (
    <div className="events">
      <div className="events-header">
        <div>
          <h1>Discover Events</h1>
          <p>Find exciting events happening around campus</p>
        </div>
        {userData?.role === 'admin' && (
          <Link to="/create-event" className="create-event-btn">
            <FiTag /> Create Event
          </Link>
        )}
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
              {[filters.domain, filters.location, filters.eventType, filters.dateFilter !== 'all' ? filters.dateFilter : null].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="advanced-filters">
          <div className="filter-group">
            <label>
              <FiTag /> Event Type
            </label>
            <select
              value={filters.eventType}
              onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
            >
              <option value="">All Types</option>
              <option value="hackathon">Hackathons</option>
              <option value="workshop">Workshops</option>
              <option value="student-event">Student Events</option>
            </select>
          </div>

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

          <div className="filter-group">
            <label>
              <FiClock /> Date
            </label>
            <select
              value={filters.dateFilter}
              onChange={(e) => setFilters({ ...filters, dateFilter: e.target.value })}
            >
              <option value="all">All Dates</option>
              <option value="upcoming">Upcoming</option>
              <option value="today">Today</option>
              <option value="this-week">This Week</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button className="clear-filters-btn" onClick={clearFilters}>
              <FiX /> Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Curated Sections - Always show at top */}
      <>
          {/* Hackathons Section */}
          {hackathons.length > 0 && (
            <div className="curated-section">
              <div className="curated-section-header">
                <div className="curated-icon hackathon">
                  <FiCode />
                </div>
                <div>
                  <h2>Active Hackathons</h2>
                  <p>Join coding competitions and build amazing projects</p>
                </div>
              </div>
              <div className="curated-events-grid">
                {hackathons.map((event) => {
                  const isParticipant = event.participants?.some(
                    (p) => {
                      const participantId = typeof p === 'object' ? (p._id || p) : p;
                      return participantId?.toString() === userData?._id?.toString();
                    }
                  );
                  return (
                    <div key={event._id} className="curated-event-card hackathon-card">
                      {event.image && (
                        <div className="event-image">
                          <img src={event.image} alt={event.title} />
                          <div className="event-type-badge hackathon-badge">
                            <FiCode /> Hackathon
                          </div>
                        </div>
                      )}
                      <div className="event-content">
                        <h3>{event.title}</h3>
                        {event.organizer && (
                          <p className="event-organizer">by {event.organizer}</p>
                        )}
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
                        <div className="event-actions">
                          {event.registrationLink ? (
                            <a
                              href={event.registrationLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="register-btn-primary"
                            >
                              <FiExternalLink /> Register Now
                            </a>
                          ) : (
                            isParticipant ? (
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
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Workshops Section */}
          {workshops.length > 0 && (
            <div className="curated-section">
              <div className="curated-section-header">
                <div className="curated-icon workshop">
                  <FiBook />
                </div>
                <div>
                  <h2>Workshops & Training</h2>
                  <p>Learn new skills and expand your knowledge</p>
                </div>
              </div>
              <div className="curated-events-grid">
                {workshops.map((event) => {
                  const isParticipant = event.participants?.some(
                    (p) => {
                      const participantId = typeof p === 'object' ? (p._id || p) : p;
                      return participantId?.toString() === userData?._id?.toString();
                    }
                  );
                  return (
                    <div key={event._id} className="curated-event-card workshop-card">
                      {event.image && (
                        <div className="event-image">
                          <img src={event.image} alt={event.title} />
                          <div className="event-type-badge workshop-badge">
                            <FiBook /> Workshop
                          </div>
                        </div>
                      )}
                      <div className="event-content">
                        <h3>{event.title}</h3>
                        {event.organizer && (
                          <p className="event-organizer">by {event.organizer}</p>
                        )}
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
                        <div className="event-actions">
                          {event.registrationLink ? (
                            <a
                              href={event.registrationLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="register-btn-primary"
                            >
                              <FiExternalLink /> Register Now
                            </a>
                          ) : (
                            isParticipant ? (
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
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Student Events Section */}
          {studentEvents.length > 0 && (
            <div className="curated-section">
              <div className="curated-section-header">
                <div className="curated-icon student-event">
                  <FiUser />
                </div>
                <div>
                  <h2>Student Events</h2>
                  <p>Connect with peers at campus events and activities</p>
                </div>
              </div>
              <div className="curated-events-grid">
                {studentEvents.map((event) => {
                  const isParticipant = event.participants?.some(
                    (p) => {
                      const participantId = typeof p === 'object' ? (p._id || p) : p;
                      return participantId?.toString() === userData?._id?.toString();
                    }
                  );
                  return (
                    <div key={event._id} className="curated-event-card student-event-card">
                      {event.image && (
                        <div className="event-image">
                          <img src={event.image} alt={event.title} />
                          <div className="event-type-badge student-event-badge">
                            <FiUser /> Student Event
                          </div>
                        </div>
                      )}
                      <div className="event-content">
                        <h3>{event.title}</h3>
                        {event.organizer && (
                          <p className="event-organizer">by {event.organizer}</p>
                        )}
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
                        <div className="event-actions">
                          {event.registrationLink ? (
                            <a
                              href={event.registrationLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="register-btn-primary"
                            >
                              <FiExternalLink /> Register Now
                            </a>
                          ) : (
                            isParticipant ? (
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
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
      </>

      {/* Results Count */}
      {!loading && (
        <div className="results-count">
          <p>
            Showing <strong>{filteredEvents.length}</strong> of <strong>{allEvents.length}</strong> events
            {hasActiveFilters && ' (filtered)'}
          </p>
        </div>
      )}

      {/* All Events Grid */}
      <div className="events-section-header">
        <h2>{hasActiveFilters ? 'Filtered Events' : 'All Events'}</h2>
      </div>
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
                  {event.registrationLink ? (
                    <a
                      href={event.registrationLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="register-btn-primary"
                    >
                      <FiExternalLink /> Register Now
                    </a>
                  ) : (
                    isParticipant ? (
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
                    )
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

