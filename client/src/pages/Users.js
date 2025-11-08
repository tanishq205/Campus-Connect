import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import { FiSearch, FiUser } from 'react-icons/fi';
import './Users.css';

const Users = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers();
    } else {
      fetchRecommendedUsers();
    }
  }, [searchQuery]);

  const fetchRecommendedUsers = async () => {
    if (!userData?._id) return;
    try {
      setLoading(true);
      const response = await api.get(`/users/recommendations/${userData._id}`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching recommended users:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/users/search/${searchQuery}`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (userId) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <div className="users-page">
      <div className="users-header">
        <h1>Discover People</h1>
        <div className="users-search">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, college, or skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="users-grid">
          {users.map((user) => (
            <div
              key={user._id}
              className="user-card"
              onClick={() => handleUserClick(user._id)}
            >
              <div className="user-avatar-section">
                {user.profilePicture ? (
                  <img src={user.profilePicture} alt={user.name} />
                ) : (
                  <div className="user-avatar">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div className="user-info">
                <h3>{user.name}</h3>
                <p className="user-college">{user.college || 'No college specified'}</p>
                {user.branch && <p className="user-branch">{user.branch} • Year {user.year}</p>}
                {user.skills && user.skills.length > 0 && (
                  <div className="user-skills">
                    {user.skills.slice(0, 3).map((skill, index) => (
                      <span key={index} className="skill-tag">{skill}</span>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="view-profile-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUserClick(user._id);
                }}
              >
                <FiUser /> View Profile
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && users.length === 0 && (
        <div className="empty-state">
          <p>{searchQuery ? 'No users found. Try a different search.' : 'No users to display.'}</p>
        </div>
      )}
    </div>
  );
};

export default Users;

