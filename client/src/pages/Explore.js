import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../config/api';
import ProjectCard from '../components/ProjectCard';
import { FiFilter } from 'react-icons/fi';
import './Explore.css';

const Explore = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    tag: '',
    skill: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [filters]);

  const fetchProjects = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.tag) params.append('tag', filters.tag);
      if (filters.skill) params.append('skill', filters.skill);

      const response = await api.get(`/projects?${params.toString()}`);
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
    if (key === 'search') {
      setSearchParams({ search: value });
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="explore">
      <div className="explore-header">
        <h1>Explore Projects</h1>
        <button
          className="filter-btn"
          onClick={() => setShowFilters(!showFilters)}
        >
          <FiFilter /> Filters
        </button>
      </div>

      {showFilters && (
        <div className="filters-panel">
          <input
            type="text"
            placeholder="Search projects..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          <input
            type="text"
            placeholder="Filter by tag (e.g., AI/ML, WebDev)"
            value={filters.tag}
            onChange={(e) => handleFilterChange('tag', e.target.value)}
          />
          <input
            type="text"
            placeholder="Filter by skill (e.g., React, Python)"
            value={filters.skill}
            onChange={(e) => handleFilterChange('skill', e.target.value)}
          />
        </div>
      )}

      <div className="projects-grid">
        {projects.map((project) => (
          <ProjectCard key={project._id} project={project} />
        ))}
      </div>

      {projects.length === 0 && (
        <div className="empty-state">
          <p>No projects found. Try adjusting your filters.</p>
        </div>
      )}
    </div>
  );
};

export default Explore;

