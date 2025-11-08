import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import ProjectCard from '../components/ProjectCard';
import EditProfileModal from '../components/EditProfileModal';
import { FiEdit2, FiGithub, FiLinkedin, FiLink, FiUserPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './Profile.css';

const Profile = () => {
  const { id } = useParams();
  const { userData: currentUserData } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [userProjects, setUserProjects] = useState([]);
  const [bookmarkedProjects, setBookmarkedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');
  const [isFriend, setIsFriend] = useState(false);
  const [hasFriendRequest, setHasFriendRequest] = useState(false);
  const isOwnProfile = currentUserData?._id === id;

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      const response = await api.get(`/users/${id}`);
      setProfileData(response.data);
      
      // Fetch user's projects
      const projectsResponse = await api.get('/projects');
      const allProjects = projectsResponse.data;
      setUserProjects(allProjects.filter(p => p.creator?._id === id || p.creator?._id?.toString() === id));
      
      // Fetch bookmarked projects with full details
      if (response.data.bookmarkedProjects && response.data.bookmarkedProjects.length > 0) {
        const bookmarkedIds = response.data.bookmarkedProjects.map(p => p._id || p);
        const allProjectsData = await api.get('/projects');
        const bookmarked = allProjectsData.data.filter(p => 
          bookmarkedIds.some(id => id.toString() === (p._id?.toString() || p._id))
        );
        setBookmarkedProjects(bookmarked);
      } else {
        setBookmarkedProjects([]);
      }
      
      // Check friend status
      if (currentUserData?._id && !isOwnProfile) {
        try {
          const currentUser = await api.get(`/users/${currentUserData._id}`);
          setIsFriend(
            currentUser.data.friends?.some(
              f => (f._id?.toString() || f.toString()) === id
            ) || false
          );
          
          const profileUser = await api.get(`/users/${id}`);
          setHasFriendRequest(
            profileUser.data.friendRequests?.some(
              req => (req.from?._id?.toString() || req.from?.toString()) === currentUserData._id && req.status === 'pending'
            ) || false
          );
        } catch (error) {
          console.error('Error checking friend status:', error);
        }
      }
    } catch (error) {
      toast.error('Failed to load profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = () => {
    setShowEditModal(false);
    fetchProfile();
  };

  const handleSendFriendRequest = async () => {
    if (!currentUserData?._id) return;
    try {
      await api.post(`/users/${id}/friend-request`, {
        fromUserId: currentUserData._id,
      });
      toast.success('Friend request sent!');
      setHasFriendRequest(true);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send friend request');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!profileData) {
    return <div className="error">Profile not found</div>;
  }

  return (
    <div className="profile">
      <div className="profile-header">
        <div className="profile-avatar-section">
          {profileData.profilePicture ? (
            <img src={profileData.profilePicture} alt={profileData.name} className="profile-avatar" />
          ) : (
            <div className="profile-avatar-placeholder">
              {profileData.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
        </div>

        <div className="profile-info">
          <div className="profile-name-section">
            <h1>{profileData.name}</h1>
            {isOwnProfile && (
              <button className="edit-profile-btn" onClick={() => setShowEditModal(true)}>
                <FiEdit2 /> Edit Profile
              </button>
            )}
          </div>

          <div className="profile-stats">
            <div className="stat">
              <span className="stat-value">{userProjects.length}</span>
              <span className="stat-label">Projects</span>
            </div>
            <div className="stat">
              <span className="stat-value">{bookmarkedProjects.length}</span>
              <span className="stat-label">Bookmarks</span>
            </div>
            {!isOwnProfile && (
              <div className="stat">
                <span className="stat-value">{profileData?.friends?.length || 0}</span>
                <span className="stat-label">Friends</span>
              </div>
            )}
          </div>
          
          {!isOwnProfile && currentUserData && (
            <div className="profile-actions">
              {isFriend ? (
                <button className="friend-btn" disabled>
                  Friends
                </button>
              ) : hasFriendRequest ? (
                <button className="friend-btn" disabled>
                  Request Sent
                </button>
              ) : (
                <button
                  className="friend-btn"
                  onClick={handleSendFriendRequest}
                >
                  <FiUserPlus /> Add Friend
                </button>
              )}
            </div>
          )}

          <div className="profile-details">
            <p className="profile-college">{profileData.college}</p>
            {profileData.branch && <p>{profileData.branch} • Year {profileData.year}</p>}
            {profileData.bio && <p className="profile-bio">{profileData.bio}</p>}
          </div>

          <div className="profile-links">
            {profileData.github && (
              <a href={profileData.github} target="_blank" rel="noopener noreferrer">
                <FiGithub /> GitHub
              </a>
            )}
            {profileData.linkedin && (
              <a href={profileData.linkedin} target="_blank" rel="noopener noreferrer">
                <FiLinkedin /> LinkedIn
              </a>
            )}
            {profileData.portfolio && (
              <a href={profileData.portfolio} target="_blank" rel="noopener noreferrer">
                <FiLink /> Portfolio
              </a>
            )}
          </div>

          {profileData.skills && profileData.skills.length > 0 && (
            <div className="profile-skills">
              <h3>Skills</h3>
              <div className="skills-list">
                {profileData.skills.map((skill, index) => (
                  <span key={index} className="skill-tag">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {profileData.interests && profileData.interests.length > 0 && (
            <div className="profile-interests">
              <h3>Interests</h3>
              <div className="interests-list">
                {profileData.interests.map((interest, index) => (
                  <span key={index} className="interest-tag">{interest}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-tabs">
          <button
            className={`tab ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            Projects
          </button>
          {isOwnProfile && (
            <button
              className={`tab ${activeTab === 'bookmarks' ? 'active' : ''}`}
              onClick={() => setActiveTab('bookmarks')}
            >
              Bookmarks
            </button>
          )}
        </div>

        {activeTab === 'projects' && (
          <div className="profile-projects">
            {userProjects.map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
            {userProjects.length === 0 && (
              <div className="empty-state">
                <p>No projects yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'bookmarks' && isOwnProfile && (
          <div className="profile-projects">
            {bookmarkedProjects.map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
            {bookmarkedProjects.length === 0 && (
              <div className="empty-state">
                <p>No bookmarked projects yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showEditModal && (
        <EditProfileModal
          userData={profileData}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleProfileUpdate}
        />
      )}
    </div>
  );
};

export default Profile;

