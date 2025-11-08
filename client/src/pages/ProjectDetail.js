import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import CommentSection from '../components/CommentSection';
import { FiHeart, FiBookmark, FiUsers, FiSend, FiCheck, FiX } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import './ProjectDetail.css';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestMessage, setRequestMessage] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const response = await api.get(`/projects/${id}`);
      setProject(response.data);
    } catch (error) {
      toast.error('Failed to load project');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async () => {
    if (!userData) return;
    try {
      const response = await api.post(`/projects/${id}/upvote`, { userId: userData._id });
      setProject(response.data);
    } catch (error) {
      toast.error('Failed to upvote');
    }
  };

  const handleBookmark = async () => {
    if (!userData) return;
    try {
      const response = await api.post(`/projects/${id}/bookmark`, { userId: userData._id });
      if (response.data.bookmarked) {
        toast.success('Project bookmarked');
      } else {
        toast.success('Bookmark removed');
      }
      fetchProject();
    } catch (error) {
      toast.error('Failed to bookmark');
    }
  };

  const handleJoinRequest = async () => {
    if (!userData) return;
    try {
      await api.post(`/projects/${id}/request`, {
        userId: userData._id,
        message: requestMessage,
      });
      toast.success('Join request sent!');
      setShowRequestModal(false);
      setRequestMessage('');
      fetchProject();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send request');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await api.post(`/projects/${id}/request/${requestId}`, { action: 'accept' });
      toast.success('Request accepted');
      fetchProject();
    } catch (error) {
      toast.error('Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await api.post(`/projects/${id}/request/${requestId}`, { action: 'reject' });
      toast.success('Request rejected');
      fetchProject();
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  const isUpvoted = project?.upvotes?.includes(userData?._id);
  const isBookmarked = project?.bookmarks?.includes(userData?._id);
  const isMember = project?.members?.some(m => m.user._id === userData?._id);
  const hasRequested = project?.pendingRequests?.some(r => r.user._id === userData?._id);
  const isCreator = project?.creator?._id === userData?._id;

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!project) {
    return <div className="error">Project not found</div>;
  }

  return (
    <div className="project-detail">
      <div className="project-detail-header">
        <div className="project-creator-info">
          {project.creator?.profilePicture ? (
            <img src={project.creator.profilePicture} alt={project.creator.name} />
          ) : (
            <div className="creator-avatar">
              {project.creator?.name?.charAt(0) || 'U'}
            </div>
          )}
          <div>
            <h3>{project.creator?.name}</h3>
            <p>{project.creator?.college}</p>
          </div>
        </div>
        <span className="project-date">
          {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
        </span>
      </div>

      <div className="project-detail-content">
        <h1>{project.title}</h1>
        <p className="project-description">{project.description}</p>

        <div className="project-tags-section">
          <h4>Tags</h4>
          <div className="tags-list">
            {project.tags?.map((tag, index) => (
              <span key={index} className="tag">{tag}</span>
            ))}
          </div>
        </div>

        <div className="project-skills-section">
          <h4>Required Skills</h4>
          <div className="skills-list">
            {project.requiredSkills?.map((skill, index) => (
              <span key={index} className="skill">{skill}</span>
            ))}
          </div>
        </div>

        <div className="project-actions">
          <button
            className={`action-btn ${isUpvoted ? 'active' : ''}`}
            onClick={handleUpvote}
          >
            <FiHeart /> {project.upvotes?.length || 0}
          </button>
          <button
            className={`action-btn ${isBookmarked ? 'active' : ''}`}
            onClick={handleBookmark}
          >
            <FiBookmark /> Bookmark
          </button>
          {!isCreator && !isMember && !hasRequested && (
            <button
              className="action-btn primary"
              onClick={() => setShowRequestModal(true)}
            >
              <FiSend /> Request to Join
            </button>
          )}
          {hasRequested && (
            <span className="request-status">Request sent</span>
          )}
        </div>
      </div>

      {project.members && project.members.length > 0 && (
        <div className="project-members">
          <h3>Team Members ({project.members.length})</h3>
          <div className="members-list">
            {project.members.map((member, index) => (
              <div key={index} className="member-item">
                {member.user?.profilePicture ? (
                  <img src={member.user.profilePicture} alt={member.user.name} />
                ) : (
                  <div className="member-avatar">
                    {member.user?.name?.charAt(0) || 'U'}
                  </div>
                )}
                <span>{member.user?.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isCreator && project.pendingRequests && project.pendingRequests.length > 0 && (
        <div className="pending-requests">
          <h3>Pending Join Requests</h3>
          {project.pendingRequests.map((request) => (
            <div key={request._id} className="request-item">
              <div className="request-user">
                {request.user?.profilePicture ? (
                  <img src={request.user.profilePicture} alt={request.user.name} />
                ) : (
                  <div className="request-avatar">
                    {request.user?.name?.charAt(0) || 'U'}
                  </div>
                )}
                <div>
                  <h4>{request.user?.name}</h4>
                  <p>{request.message}</p>
                </div>
              </div>
              <div className="request-actions">
                <button
                  className="accept-btn"
                  onClick={() => handleAcceptRequest(request._id)}
                >
                  <FiCheck /> Accept
                </button>
                <button
                  className="reject-btn"
                  onClick={() => handleRejectRequest(request._id)}
                >
                  <FiX /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CommentSection projectId={id} />

      {showRequestModal && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Request to Join</h2>
            <textarea
              placeholder="Why do you want to join this project?"
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              rows="4"
            />
            <div className="modal-actions">
              <button onClick={() => setShowRequestModal(false)}>Cancel</button>
              <button onClick={handleJoinRequest} className="primary">Send Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;

