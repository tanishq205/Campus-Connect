import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import { 
  FiMessageSquare, 
  FiPlus, 
  FiSearch,
  FiFilter,
  FiThumbsUp,
  FiEye,
  FiClock,
  FiTag,
  FiTrendingUp,
  FiMessageCircle
} from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import CreateThreadModal from '../components/CreateThreadModal';
import './Discussions.css';

const Discussions = () => {
  const { userData } = useAuth();
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    search: '',
    sort: 'newest'
  });
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchDiscussions();
  }, [filters]);

  const fetchDiscussions = async (reset = false) => {
    try {
      setLoading(true);
      const currentPage = reset ? 0 : page;
      const params = new URLSearchParams({
        category: filters.category,
        search: filters.search,
        sort: filters.sort,
        limit: '20',
        skip: (currentPage * 20).toString()
      });

      const response = await api.get(`/discussions?${params}`);
      const { discussions: newDiscussions, hasMore: more } = response.data;

      if (reset) {
        setDiscussions(newDiscussions);
        setPage(1);
      } else {
        setDiscussions(prev => [...prev, ...newDiscussions]);
        setPage(prev => prev + 1);
      }
      
      setHasMore(more);
    } catch (error) {
      console.error('Error fetching discussions:', error);
      toast.error('Failed to load discussions');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const handleUpvote = async (discussionId, isUpvoted) => {
    if (!userData) {
      toast.error('Please login to upvote');
      return;
    }

    try {
      await api.post(`/discussions/${discussionId}/upvote`, {
        userId: userData._id
      });
      
      setDiscussions(prev => prev.map(disc => {
        if (disc._id === discussionId) {
          return {
            ...disc,
            upvotes: isUpvoted 
              ? disc.upvotes.filter(id => id !== userData._id)
              : [...disc.upvotes, userData._id]
          };
        }
        return disc;
      }));
    } catch (error) {
      console.error('Error upvoting:', error);
      toast.error('Failed to upvote');
    }
  };

  const handleThreadCreated = () => {
    setShowCreateModal(false);
    fetchDiscussions(true);
  };

  const categories = [
    { value: 'all', label: 'All Topics' },
    { value: 'brainstorming', label: 'Brainstorming' },
    { value: 'feedback', label: 'Peer Feedback' },
    { value: 'technical', label: 'Technical' },
    { value: 'collaboration', label: 'Collaboration' },
    { value: 'general', label: 'General' }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'popular', label: 'Most Upvoted' },
    { value: 'most-commented', label: 'Most Comments' }
  ];

  const isUpvoted = (discussion) => {
    if (!userData) return false;
    return discussion.upvotes?.some(id => 
      (typeof id === 'object' ? id._id : id) === userData._id
    );
  };

  return (
    <div className="discussions">
      <div className="discussions-header">
        <div>
          <h1>Discussion Threads</h1>
          <p>Share ideas, get feedback, and collaborate with peers</p>
        </div>
        {userData && (
          <button 
            className="create-thread-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <FiPlus /> Start Discussion
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="discussions-filters">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search discussions..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <FiFilter />
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <FiTrendingUp />
          <select
            value={filters.sort}
            onChange={(e) => handleFilterChange('sort', e.target.value)}
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Discussions List */}
      {loading && discussions.length === 0 ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading discussions...</p>
        </div>
      ) : (
        <div className="discussions-list">
          {discussions.map((discussion) => {
            const upvoted = isUpvoted(discussion);
            const commentCount = discussion.comments?.length || 0;
            const upvoteCount = discussion.upvotes?.length || 0;

            return (
              <div 
                key={discussion._id} 
                className={`discussion-card ${discussion.isPinned ? 'pinned' : ''}`}
              >
                {discussion.isPinned && (
                  <div className="pinned-badge">
                    <FiTag /> Pinned
                  </div>
                )}
                
                <div className="discussion-header">
                  <div className="discussion-author">
                    {discussion.author?.profilePicture ? (
                      <img 
                        src={discussion.author.profilePicture} 
                        alt={discussion.author.name}
                        className="author-avatar"
                      />
                    ) : (
                      <div className="author-avatar placeholder">
                        {discussion.author?.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <Link 
                        to={`/profile/${discussion.author?._id}`}
                        className="author-name"
                      >
                        {discussion.author?.name}
                      </Link>
                      <span className="author-college">
                        {discussion.author?.college}
                      </span>
                    </div>
                  </div>
                  <div className="discussion-meta">
                    <span className="category-badge" data-category={discussion.category}>
                      {categories.find(c => c.value === discussion.category)?.label || discussion.category}
                    </span>
                    <span className="discussion-date">
                      <FiClock /> {format(new Date(discussion.createdAt), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>

                <Link to={`/discussions/${discussion._id}`} className="discussion-content">
                  <h3>{discussion.title}</h3>
                  <p>{discussion.content.substring(0, 200)}{discussion.content.length > 200 ? '...' : ''}</p>
                </Link>

                {discussion.tags && discussion.tags.length > 0 && (
                  <div className="discussion-tags">
                    {discussion.tags.map((tag, index) => (
                      <span key={index} className="tag">{tag}</span>
                    ))}
                  </div>
                )}

                <div className="discussion-footer">
                  <button
                    className={`upvote-btn ${upvoted ? 'upvoted' : ''}`}
                    onClick={() => handleUpvote(discussion._id, upvoted)}
                    disabled={!userData}
                  >
                    <FiThumbsUp /> {upvoteCount}
                  </button>
                  <div className="discussion-stats">
                    <span>
                      <FiMessageCircle /> {commentCount}
                    </span>
                    <span>
                      <FiEye /> {discussion.views || 0}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && discussions.length === 0 && (
        <div className="empty-state">
          <FiMessageSquare size={64} />
          <h3>No discussions yet</h3>
          <p>Be the first to start a discussion thread!</p>
          {userData && (
            <button 
              className="create-thread-btn"
              onClick={() => setShowCreateModal(true)}
            >
              <FiPlus /> Start Discussion
            </button>
          )}
        </div>
      )}

      {hasMore && !loading && (
        <div className="load-more-container">
          <button 
            className="load-more-btn"
            onClick={() => fetchDiscussions()}
          >
            Load More
          </button>
        </div>
      )}

      {showCreateModal && (
        <CreateThreadModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleThreadCreated}
        />
      )}
    </div>
  );
};

export default Discussions;

