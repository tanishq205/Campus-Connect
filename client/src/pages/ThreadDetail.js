import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEmailVerification } from '../hooks/useEmailVerification';
import api from '../config/api';
import { 
  FiThumbsUp, 
  FiMessageCircle, 
  FiArrowLeft,
  FiEye,
  FiClock,
  FiTag,
  FiEdit,
  FiTrash2,
  FiSend
} from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './ThreadDetail.css';

const ThreadDetail = () => {
  const { id } = useParams();
  const { userData } = useAuth();
  const { requireVerification } = useEmailVerification();
  const navigate = useNavigate();
  const [discussion, setDiscussion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState('');
  const [replyContent, setReplyContent] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => {
    fetchDiscussion();
  }, [id]);

  const fetchDiscussion = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/discussions/${id}`);
      setDiscussion(response.data);
    } catch (error) {
      console.error('Error fetching discussion:', error);
      toast.error('Failed to load discussion');
      navigate('/discussions');
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (isUpvoted) => {
    if (!userData) {
      toast.error('Please login to upvote');
      return;
    }

    try {
      await api.post(`/discussions/${id}/upvote`, {
        userId: userData._id
      });
      
      setDiscussion(prev => ({
        ...prev,
        upvotes: isUpvoted 
          ? prev.upvotes.filter(u => (typeof u === 'object' ? u._id : u) !== userData._id)
          : [...prev.upvotes, userData._id]
      }));
    } catch (error) {
      console.error('Error upvoting:', error);
      toast.error('Failed to upvote');
    }
  };

  const handleCommentUpvote = async (commentId, isUpvoted) => {
    if (!userData) {
      toast.error('Please login to upvote');
      return;
    }

    try {
      await api.post(`/discussions/${id}/comments/${commentId}/upvote`, {
        userId: userData._id
      });
      
      setDiscussion(prev => ({
        ...prev,
        comments: prev.comments.map(comment => {
          if (comment._id === commentId) {
            return {
              ...comment,
              upvotes: isUpvoted
                ? comment.upvotes.filter(u => (typeof u === 'object' ? u._id : u) !== userData._id)
                : [...comment.upvotes, userData._id]
            };
          }
          return comment;
        })
      }));
    } catch (error) {
      console.error('Error upvoting comment:', error);
      toast.error('Failed to upvote');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    
    if (!requireVerification('add comments')) {
      return;
    }
    
    if (!commentContent.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    if (!userData) {
      toast.error('Please login to comment');
      return;
    }

    try {
      const response = await api.post(`/discussions/${id}/comments`, {
        content: commentContent,
        userId: userData._id
      });
      
      setDiscussion(response.data);
      setCommentContent('');
      toast.success('Comment added!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error(error.response?.data?.error || 'Failed to add comment');
    }
  };

  const handleAddReply = async (commentId) => {
    if (!requireVerification('reply to comments')) {
      return;
    }
    
    const content = replyContent[commentId];
    
    if (!content?.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }

    if (!userData) {
      toast.error('Please login to reply');
      return;
    }

    try {
      const response = await api.post(`/discussions/${id}/comments/${commentId}/replies`, {
        content: content,
        userId: userData._id
      });
      
      setDiscussion(response.data);
      setReplyContent(prev => ({ ...prev, [commentId]: '' }));
      setReplyingTo(null);
      toast.success('Reply added!');
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error(error.response?.data?.error || 'Failed to add reply');
    }
  };

  const isUpvoted = (upvotes) => {
    if (!userData || !upvotes) return false;
    return upvotes.some(u => (typeof u === 'object' ? u._id : u) === userData._id);
  };

  if (loading) {
    return (
      <div className="thread-detail">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading discussion...</p>
        </div>
      </div>
    );
  }

  if (!discussion) {
    return null;
  }

  const discussionUpvoted = isUpvoted(discussion.upvotes);
  const commentCount = discussion.comments?.length || 0;
  const upvoteCount = discussion.upvotes?.length || 0;

  return (
    <div className="thread-detail">
      <button className="back-btn" onClick={() => navigate('/discussions')}>
        <FiArrowLeft /> Back to Discussions
      </button>

      <div className="thread-main">
        <div className="thread-header">
          <div className="thread-author">
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
          <div className="thread-meta">
            <span className="category-badge" data-category={discussion.category}>
              {discussion.category}
            </span>
            <span className="thread-date">
              <FiClock /> {format(new Date(discussion.createdAt), 'MMM dd, yyyy • h:mm a')}
            </span>
          </div>
        </div>

        <h1>{discussion.title}</h1>
        
        <div className="thread-content">
          <p>{discussion.content}</p>
        </div>

        {discussion.tags && discussion.tags.length > 0 && (
          <div className="thread-tags">
            {discussion.tags.map((tag, index) => (
              <span key={index} className="tag">
                <FiTag /> {tag}
              </span>
            ))}
          </div>
        )}

        <div className="thread-actions">
          <button
            className={`upvote-btn ${discussionUpvoted ? 'upvoted' : ''}`}
            onClick={() => handleUpvote(discussionUpvoted)}
            disabled={!userData}
          >
            <FiThumbsUp /> {upvoteCount}
          </button>
          <div className="thread-stats">
            <span>
              <FiMessageCircle /> {commentCount} comments
            </span>
            <span>
              <FiEye /> {discussion.views || 0} views
            </span>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="comments-section">
        <h2>Comments ({commentCount})</h2>

        {userData && (
          <form onSubmit={handleAddComment} className="comment-form">
            <textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Add a comment..."
              rows="3"
            />
            <button type="submit" className="submit-comment-btn">
              <FiSend /> Post Comment
            </button>
          </form>
        )}

        <div className="comments-list">
          {discussion.comments && discussion.comments.length > 0 ? (
            discussion.comments.map((comment) => {
              const commentUpvoted = isUpvoted(comment.upvotes);
              const commentUpvoteCount = comment.upvotes?.length || 0;
              const isReplying = replyingTo === comment._id;

              return (
                <div key={comment._id} className="comment-item">
                  <div className="comment-header">
                    <div className="comment-author">
                      {comment.author?.profilePicture ? (
                        <img 
                          src={comment.author.profilePicture} 
                          alt={comment.author.name}
                          className="comment-avatar"
                        />
                      ) : (
                        <div className="comment-avatar placeholder">
                          {comment.author?.name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <Link 
                          to={`/profile/${comment.author?._id}`}
                          className="comment-author-name"
                        >
                          {comment.author?.name}
                        </Link>
                        <span className="comment-date">
                          {format(new Date(comment.createdAt), 'MMM dd, yyyy • h:mm a')}
                        </span>
                      </div>
                    </div>
                    <button
                      className={`comment-upvote ${commentUpvoted ? 'upvoted' : ''}`}
                      onClick={() => handleCommentUpvote(comment._id, commentUpvoted)}
                      disabled={!userData}
                    >
                      <FiThumbsUp /> {commentUpvoteCount}
                    </button>
                  </div>
                  
                  <div className="comment-content">
                    <p>{comment.content}</p>
                  </div>

                  {userData && (
                    <button
                      className="reply-btn"
                      onClick={() => setReplyingTo(isReplying ? null : comment._id)}
                    >
                      <FiMessageCircle /> Reply
                    </button>
                  )}

                  {isReplying && (
                    <div className="reply-form">
                      <textarea
                        value={replyContent[comment._id] || ''}
                        onChange={(e) => setReplyContent(prev => ({
                          ...prev,
                          [comment._id]: e.target.value
                        }))}
                        placeholder="Write a reply..."
                        rows="2"
                      />
                      <div className="reply-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyContent(prev => ({ ...prev, [comment._id]: '' }));
                          }}
                          className="cancel-reply-btn"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddReply(comment._id)}
                          className="submit-reply-btn"
                        >
                          <FiSend /> Reply
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="replies-list">
                      {comment.replies.map((reply, index) => (
                        <div key={index} className="reply-item">
                          <div className="reply-author">
                            {reply.author?.profilePicture ? (
                              <img 
                                src={reply.author.profilePicture} 
                                alt={reply.author.name}
                                className="reply-avatar"
                              />
                            ) : (
                              <div className="reply-avatar placeholder">
                                {reply.author?.name?.charAt(0)?.toUpperCase()}
                              </div>
                            )}
                            <div>
                              <Link 
                                to={`/profile/${reply.author?._id}`}
                                className="reply-author-name"
                              >
                                {reply.author?.name}
                              </Link>
                              <span className="reply-date">
                                {format(new Date(reply.createdAt), 'MMM dd, yyyy • h:mm a')}
                              </span>
                            </div>
                          </div>
                          <div className="reply-content">
                            <p>{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="no-comments">
              <FiMessageCircle size={48} />
              <p>No comments yet. Be the first to comment!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThreadDetail;

