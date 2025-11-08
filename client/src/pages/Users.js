import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import { FiSearch, FiUser, FiCheck, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './Users.css';

const Users = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('discover');

  useEffect(() => {
    if (userData?._id) {
      fetchFriendRequests();
    }
  }, [userData]);

  // Refresh friend requests when tab changes to requests
  useEffect(() => {
    if (activeTab === 'requests' && userData?._id) {
      fetchFriendRequests();
    }
  }, [activeTab, userData]);

  useEffect(() => {
    if (activeTab === 'discover') {
      if (searchQuery.trim()) {
        searchUsers();
      } else {
        fetchRecommendedUsers();
      }
    }
  }, [searchQuery, activeTab]);

  // Check URL parameter for tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'requests') {
      setActiveTab('requests');
    }
  }, []);

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

  const fetchFriendRequests = async () => {
    if (!userData?._id) return;
    try {
      const response = await api.get(`/users/${userData._id}/friend-requests`);
      setFriendRequests(response.data || []);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  };

  const handleAcceptFriendRequest = async (requestId) => {
    if (!userData?._id) return;
    try {
      await api.post(`/users/${userData._id}/friend-request/${requestId}`, {
        action: 'accept',
      });
      toast.success('Friend request accepted!');
      // Immediately remove from local state for instant UI update
      setFriendRequests(prev => prev.filter(req => req._id !== requestId));
      // Then refresh from server to ensure consistency
      await fetchFriendRequests();
      // Refresh recommended users to update friends list
      if (activeTab === 'discover') {
        fetchRecommendedUsers();
      }
      // Trigger a custom event to notify Navbar to refresh
      window.dispatchEvent(new CustomEvent('friendRequestUpdated'));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to accept request');
      // Refresh on error to ensure state is correct
      fetchFriendRequests();
    }
  };

  const handleRejectFriendRequest = async (requestId) => {
    if (!userData?._id) return;
    try {
      await api.post(`/users/${userData._id}/friend-request/${requestId}`, {
        action: 'reject',
      });
      toast.success('Friend request rejected');
      // Immediately remove from local state for instant UI update
      setFriendRequests(prev => prev.filter(req => req._id !== requestId));
      // Then refresh from server to ensure consistency
      await fetchFriendRequests();
      // Trigger a custom event to notify Navbar to refresh
      window.dispatchEvent(new CustomEvent('friendRequestUpdated'));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reject request');
      // Refresh on error to ensure state is correct
      fetchFriendRequests();
    }
  };

  const handleUserClick = (userId) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <div className="users-page">
      <div className="users-header">
        <h1>Discover People</h1>
        <div className="users-tabs">
          <button
            className={`tab ${activeTab === 'discover' ? 'active' : ''}`}
            onClick={() => setActiveTab('discover')}
          >
            Discover
          </button>
          <button
            className={`tab ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Friend Requests
            {friendRequests.length > 0 && (
              <span className="tab-badge">{friendRequests.length}</span>
            )}
          </button>
        </div>
        {activeTab === 'discover' && (
          <div className="users-search">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, college, or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      {activeTab === 'requests' && (
        <div className="friend-requests-section">
          {friendRequests.length === 0 ? (
            <div className="empty-state">
              <p>No pending friend requests</p>
            </div>
          ) : (
            <div className="friend-requests-list">
              {friendRequests.map((request) => (
                <div key={request._id} className="friend-request-item">
                  <div 
                    className="request-user-info"
                    onClick={() => handleUserClick(request.from?._id)}
                    style={{ cursor: 'pointer' }}
                  >
                    {request.from?.profilePicture ? (
                      <img src={request.from.profilePicture} alt={request.from.name} />
                    ) : (
                      <div className="request-avatar">
                        {request.from?.name?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div>
                      <h4>{request.from?.name}</h4>
                      <p>{request.from?.college}</p>
                    </div>
                  </div>
                  <div className="request-actions">
                    <button
                      className="accept-request-btn"
                      onClick={() => handleAcceptFriendRequest(request._id)}
                    >
                      <FiCheck /> Accept
                    </button>
                    <button
                      className="reject-request-btn"
                      onClick={() => handleRejectFriendRequest(request._id)}
                    >
                      <FiX /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'discover' && (
        <>
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

          {!loading && users.length === 0 && activeTab === 'discover' && (
            <div className="empty-state">
              <p>{searchQuery ? 'No users found. Try a different search.' : 'No users to display.'}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Users;

