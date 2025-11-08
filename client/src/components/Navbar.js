import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiSearch, FiHome, FiCompass, FiCalendar, FiMessageCircle, FiUser, FiUsers } from 'react-icons/fi';
import './Navbar.css';

const Navbar = () => {
  const { userData, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?search=${searchQuery}`);
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
          <Link to="/users" className="nav-link" title="Discover People">
            <FiUsers />
          </Link>
          <Link to="/chat" className="nav-link">
            <FiMessageCircle />
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

