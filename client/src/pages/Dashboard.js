import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import ProjectCard from '../components/ProjectCard';
import CreateProjectModal from '../components/CreateProjectModal';
import { FiPlus } from 'react-icons/fi';
import './Dashboard.css';

const Dashboard = () => {
  const { userData } = useAuth();
  const [projects, setProjects] = useState([]);
  const [recommendedProjects, setRecommendedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchRecommendedProjects();
  }, [userData]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendedProjects = async () => {
    if (!userData?._id) return;
    try {
      const response = await api.get(`/projects/recommendations/${userData._id}`);
      setRecommendedProjects(response.data);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const handleProjectCreated = () => {
    setShowCreateModal(false);
    fetchProjects();
    fetchRecommendedProjects();
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <button className="create-project-btn" onClick={() => setShowCreateModal(true)}>
          <FiPlus /> Create Project
        </button>
      </div>

      {recommendedProjects.length > 0 && (
        <section className="dashboard-section">
          <h2>Recommended for You</h2>
          <div className="projects-grid">
            {recommendedProjects.map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
          </div>
        </section>
      )}

      <section className="dashboard-section">
        <h2>All Projects</h2>
        <div className="projects-grid">
          {projects.map((project) => (
            <ProjectCard key={project._id} project={project} />
          ))}
        </div>
        {projects.length === 0 && (
          <div className="empty-state">
            <p>No projects yet. Be the first to create one!</p>
          </div>
        )}
      </section>

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleProjectCreated}
        />
      )}
    </div>
  );
};

export default Dashboard;

