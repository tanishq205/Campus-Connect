import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import api from '../config/api';
import { FiSend, FiUser } from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './Chat.css';

const Chat = () => {
  const { projectId, friendId } = useParams();
  const { userData } = useAuth();
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const messagesEndRef = useRef(null);

  // Fetch friends list
  useEffect(() => {
    if (userData?._id) {
      fetchFriends();
    }
  }, [userData]);

  // Set room ID based on project or friend
  useEffect(() => {
    if (projectId) {
      setRoomId(`project-${projectId}`);
      setSelectedFriend(null);
    } else if (friendId && userData?._id) {
      // Create a consistent room ID for two friends (sorted IDs)
      const friendIds = [userData._id, friendId].sort();
      setRoomId(`friend-${friendIds[0]}-${friendIds[1]}`);
      // Find and set selected friend
      api.get(`/users/${friendId}`).then(res => {
        setSelectedFriend(res.data);
      }).catch(err => {
        toast.error('Failed to load friend');
      });
    } else {
      setRoomId(null);
      setSelectedFriend(null);
    }
  }, [projectId, friendId, userData]);

  // Socket connection
  useEffect(() => {
    if (!roomId) return;

    const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');
    setSocket(newSocket);

    newSocket.emit('join-room', roomId);

    newSocket.on('receive-message', (data) => {
      if (data.roomId === roomId) {
        setMessages((prev) => [...prev, data]);
      }
    });

    // Load previous messages
    loadMessages(roomId);

    return () => {
      if (roomId) {
        newSocket.emit('leave-room', roomId);
      }
      newSocket.close();
    };
  }, [roomId]);

  const fetchFriends = async () => {
    try {
      const response = await api.get(`/users/${userData._id}/friends`);
      setFriends(response.data);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const loadMessages = async (currentRoomId) => {
    if (!currentRoomId) return;
    try {
      const response = await api.get(`/chat/messages/${currentRoomId}`);
      setMessages(response.data || []);
    } catch (error) {
      // If endpoint doesn't exist, start with empty messages
      setMessages([]);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !userData) return;

    const messageData = {
      roomId,
      user: {
        _id: userData._id,
        name: userData.name,
        profilePicture: userData.profilePicture,
      },
      message: newMessage,
      timestamp: new Date(),
    };

    socket.emit('send-message', messageData);
    setMessages((prev) => [...prev, messageData]);
    setNewMessage('');
  };

  const handleSelectFriend = (friend) => {
    setSelectedFriend(friend);
    if (userData?._id && friend._id) {
      const friendIds = [userData._id, friend._id].sort();
      setRoomId(`friend-${friendIds[0]}-${friendIds[1]}`);
      setMessages([]);
    }
  };

  if (!roomId && !projectId) {
    return (
      <div className="chat-container">
        <div className="chat-layout">
          <div className="chat-friends-list">
            <h3>Friends</h3>
            {friends.length === 0 ? (
              <div className="no-friends">
                <p>No friends yet. Add friends to start chatting!</p>
              </div>
            ) : (
              <div className="friends-list">
                {friends.map((friend) => (
                  <div
                    key={friend._id}
                    className={`friend-item ${selectedFriend?._id === friend._id ? 'active' : ''}`}
                    onClick={() => handleSelectFriend(friend)}
                  >
                    {friend.profilePicture ? (
                      <img src={friend.profilePicture} alt={friend.name} />
                    ) : (
                      <div className="friend-avatar">
                        {friend.name?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div className="friend-info">
                      <h4>{friend.name}</h4>
                      <p>{friend.college}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="chat-main">
            {selectedFriend ? (
              <>
                <div className="chat-header">
                  <div className="chat-header-user">
                    {selectedFriend.profilePicture ? (
                      <img src={selectedFriend.profilePicture} alt={selectedFriend.name} />
                    ) : (
                      <div className="header-avatar">
                        {selectedFriend.name?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div>
                      <h2>{selectedFriend.name}</h2>
                      <p>{selectedFriend.college}</p>
                    </div>
                  </div>
                </div>

                <div className="chat-messages">
                  {messages.length === 0 ? (
                    <div className="no-messages">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const isOwnMessage = msg.user?._id === userData?._id;
                      return (
                        <div
                          key={index}
                          className={`message ${isOwnMessage ? 'own-message' : ''}`}
                        >
                          {!isOwnMessage && (
                            <div className="message-avatar">
                              {msg.user?.profilePicture ? (
                                <img
                                  src={msg.user.profilePicture}
                                  alt={msg.user.name}
                                />
                              ) : (
                                <div className="avatar-placeholder">
                                  {msg.user?.name?.charAt(0) || 'U'}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="message-content">
                            {!isOwnMessage && (
                              <span className="message-author">{msg.user?.name}</span>
                            )}
                            <div className="message-bubble">
                              <p>{msg.message}</p>
                              <span className="message-time">
                                {format(new Date(msg.timestamp), 'HH:mm')}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="chat-input">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <button type="submit">
                    <FiSend />
                  </button>
                </form>
              </>
            ) : (
              <div className="chat-placeholder">
                <FiUser size={64} />
                <h3>Select a friend to start chatting</h3>
                <p>Choose a friend from the list to begin your conversation</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>Chat</h2>
        {projectId && <p>Project Chat Room</p>}
        {selectedFriend && (
          <div className="chat-header-user">
            {selectedFriend.profilePicture ? (
              <img src={selectedFriend.profilePicture} alt={selectedFriend.name} />
            ) : (
              <div className="header-avatar">
                {selectedFriend.name?.charAt(0) || 'U'}
              </div>
            )}
            <div>
              <h3>{selectedFriend.name}</h3>
              <p>{selectedFriend.college}</p>
            </div>
          </div>
        )}
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwnMessage = msg.user?._id === userData?._id;
            return (
              <div
                key={index}
                className={`message ${isOwnMessage ? 'own-message' : ''}`}
              >
                {!isOwnMessage && (
                  <div className="message-avatar">
                    {msg.user?.profilePicture ? (
                      <img
                        src={msg.user.profilePicture}
                        alt={msg.user.name}
                      />
                    ) : (
                      <div className="avatar-placeholder">
                        {msg.user?.name?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                )}
                <div className="message-content">
                  {!isOwnMessage && (
                    <span className="message-author">{msg.user?.name}</span>
                  )}
                  <div className="message-bubble">
                    <p>{msg.message}</p>
                    <span className="message-time">
                      {format(new Date(msg.timestamp), 'HH:mm')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="chat-input">
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button type="submit">
          <FiSend />
        </button>
      </form>
    </div>
  );
};

export default Chat;

