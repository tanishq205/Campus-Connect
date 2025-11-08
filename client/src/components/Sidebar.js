import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const { userData } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-content">
        <Link to={`/profile/${userData?._id}`} className="sidebar-profile">
          <div className="sidebar-avatar">
            {userData?.profilePicture ? (
              <img src={userData.profilePicture} alt={userData.name} />
            ) : (
              <div className="avatar-placeholder">
                {userData?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div className="sidebar-user-info">
            <h3>{userData?.name || 'User'}</h3>
            <p>{userData?.college || 'College'}</p>
          </div>
        </Link>

        <div className="sidebar-stats">
          <div className="stat-item">
            <span className="stat-value">{userData?.joinedProjects?.length || 0}</span>
            <span className="stat-label">Projects</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{userData?.bookmarkedProjects?.length || 0}</span>
            <span className="stat-label">Bookmarks</span>
          </div>
        </div>

        <div className="sidebar-skills">
          <h4>Skills</h4>
          <div className="skills-list">
            {userData?.skills?.slice(0, 5).map((skill, index) => (
              <span key={index} className="skill-tag">{skill}</span>
            ))}
            {(!userData?.skills || userData.skills.length === 0) && (
              <p className="no-skills">Add skills to your profile</p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

