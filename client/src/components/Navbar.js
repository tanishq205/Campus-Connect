import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import { FiSearch, FiHome, FiCompass, FiCalendar, FiMessageCircle, FiUser, FiUsers, FiBell, FiPlus, FiMessageSquare } from 'react-icons/fi';
import './Navbar.css';

const Navbar = () => {
  const { userData, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?search=${searchQuery}`);
    }
  };

  useEffect(() => {
    if (userData?._id) {
      fetchFriendRequestCount();
      // Refresh count every 30 seconds
      const interval = setInterval(fetchFriendRequestCount, 30000);
      
      // Listen for friend request updates
      const handleFriendRequestUpdate = () => {
        fetchFriendRequestCount();
      };
      window.addEventListener('friendRequestUpdated', handleFriendRequestUpdate);
      
      // Listen for unread message count updates
      const handleUnreadMessageUpdate = (event) => {
        setUnreadMessageCount(event.detail.totalUnread || 0);
      };
      window.addEventListener('unreadMessageCountUpdated', handleUnreadMessageUpdate);
      
      // Load initial unread count from localStorage
      const savedCount = localStorage.getItem('unreadMessageCount');
      if (savedCount) {
        setUnreadMessageCount(parseInt(savedCount, 10) || 0);
      }
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('friendRequestUpdated', handleFriendRequestUpdate);
        window.removeEventListener('unreadMessageCountUpdated', handleUnreadMessageUpdate);
      };
    } else {
      // Reset count when user logs out
      setUnreadMessageCount(0);
      localStorage.removeItem('unreadMessageCount');
    }
  }, [userData]);

  const fetchFriendRequestCount = async () => {
    if (!userData?._id) return;
    try {
      const response = await api.get(`/users/${userData._id}/friend-requests`);
      setFriendRequestCount(response.data?.length || 0);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <h2>Campus Connect</h2>
        </Link>

        <form className="navbar-search" onSubmit={handleSearch}>
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search projects, events, people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        <div className="navbar-links">
          <Link to="/" className="nav-link">
            <FiHome />
          </Link>
          <Link to="/explore" className="nav-link">
            <FiCompass />
          </Link>
          <Link to="/events" className="nav-link">
            <FiCalendar />
          </Link>
          <Link to="/discussions" className="nav-link" title="Discussions">
            <FiMessageSquare />
          </Link>
          {userData?.role === 'admin' && (
            <Link to="/create-event" className="nav-link" title="Create Event">
              <FiPlus />
            </Link>
          )}
          <Link to="/users" className="nav-link profile-link" title="Discover People">
            <FiUsers />
            {friendRequestCount > 0 && (
              <span className="notification-badge">{friendRequestCount}</span>
            )}
          </Link>
          <Link to="/chat" className="nav-link" style={{ position: 'relative' }}>
            <FiMessageCircle />
            {unreadMessageCount > 0 && (
              <span className="notification-badge">{unreadMessageCount > 99 ? '99+' : unreadMessageCount}</span>
            )}
          </Link>
          <Link to={`/profile/${userData?._id}`} className="nav-link">
            <FiUser />
          </Link>
          <button onClick={handleSignOut} className="nav-signout">
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

