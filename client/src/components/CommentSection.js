import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import { FiHeart, FiSend } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import './CommentSection.css';

const CommentSection = ({ projectId }) => {
  const { userData } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments();
  }, [projectId]);

  const fetchComments = async () => {
    try {
      const response = await api.get(`/comments/project/${projectId}`);
      setComments(response.data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !userData) return;

    try {
      const response = await api.post('/comments', {
        content: newComment,
        author: userData._id,
        project: projectId,
      });
      setComments([response.data, ...comments]);
      setNewComment('');
    } catch (error) {
      toast.error('Failed to post comment');
    }
  };

  const handleUpvote = async (commentId) => {
    if (!userData) {
      toast.error('Please log in to upvote');
      return;
    }
    try {
      const response = await api.post(`/comments/${commentId}/upvote`, {
        userId: userData._id,
      });
      setComments(
        comments.map((c) => (c._id === commentId ? response.data : c))
      );
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to upvote');
    }
  };

  if (loading) {
    return <div className="loading">Loading comments...</div>;
  }

  return (
    <div className="comment-section">
      <h3>Comments ({comments.length})</h3>

      {userData && (
        <form onSubmit={handleSubmitComment} className="comment-form">
          <input
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button type="submit">
            <FiSend />
          </button>
        </form>
      )}

      <div className="comments-list">
        {comments.map((comment) => {
          const isUpvoted = comment.upvotes?.some(
            upvoteId => upvoteId.toString() === userData?._id?.toString()
          );
          return (
            <div key={comment._id} className="comment-item">
              <div className="comment-author">
                {comment.author?.profilePicture ? (
                  <img
                    src={comment.author.profilePicture}
                    alt={comment.author.name}
                  />
                ) : (
                  <div className="comment-avatar">
                    {comment.author?.name?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="comment-content">
                  <div className="comment-header">
                    <span className="comment-author-name">
                      {comment.author?.name}
                    </span>
                    <span className="comment-date">
                      {formatDistanceToNow(new Date(comment.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p>{comment.content}</p>
                  <button
                    className={`comment-upvote ${isUpvoted ? 'active' : ''}`}
                    onClick={() => handleUpvote(comment._id)}
                  >
                    <FiHeart /> {comment.upvotes?.length || 0}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {comments.length === 0 && (
          <p className="no-comments">No comments yet. Be the first to comment!</p>
        )}
      </div>
    </div>
  );
};

export default CommentSection;

