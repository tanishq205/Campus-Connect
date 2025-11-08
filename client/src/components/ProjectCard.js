import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { FiHeart, FiBookmark, FiUsers } from 'react-icons/fi';
import './ProjectCard.css';

const ProjectCard = ({ project }) => {
  return (
    <Link to={`/project/${project._id}`} className="project-card">
      <div className="project-card-header">
        <div className="project-creator">
          {project.creator?.profilePicture ? (
            <img src={project.creator.profilePicture} alt={project.creator.name} />
          ) : (
            <div className="creator-avatar">
              {project.creator?.name?.charAt(0) || 'U'}
            </div>
          )}
          <div>
            <h4>{project.creator?.name || 'Unknown'}</h4>
            <p>{project.creator?.college || ''}</p>
          </div>
        </div>
      </div>

      {project.images && project.images.length > 0 && (
        <div className="project-image">
          <img src={project.images[0]} alt={project.title} />
        </div>
      )}

      <div className="project-card-content">
        <h3>{project.title}</h3>
        <p className="project-description">
          {project.description.length > 150
            ? `${project.description.substring(0, 150)}...`
            : project.description}
        </p>

        <div className="project-tags">
          {project.tags?.slice(0, 3).map((tag, index) => (
            <span key={index} className="tag">{tag}</span>
          ))}
        </div>

        <div className="project-skills">
          <span className="skills-label">Skills needed:</span>
          {project.requiredSkills?.slice(0, 3).map((skill, index) => (
            <span key={index} className="skill">{skill}</span>
          ))}
        </div>
      </div>

      <div className="project-card-footer">
        <div className="project-stats">
          <span>
            <FiHeart /> {project.upvotes?.length || 0}
          </span>
          <span>
            <FiUsers /> {project.members?.length || 0}
          </span>
        </div>
        <span className="project-date">
          {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
        </span>
      </div>
    </Link>
  );
};

export default ProjectCard;

