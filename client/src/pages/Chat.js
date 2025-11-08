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
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const roomIdRef = useRef(null);

  // Fetch friends list
  useEffect(() => {
    if (userData?._id) {
      fetchFriends();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData]);

  // Set room ID based on project or friend
  useEffect(() => {
    if (projectId) {
      const newRoomId = `project-${projectId}`;
      setRoomId(newRoomId);
      roomIdRef.current = newRoomId;
      setSelectedFriend(null);
    } else if (friendId && userData?._id) {
      // Create a consistent room ID for two friends (sorted IDs)
      const friendIds = [userData._id, friendId].sort();
      const newRoomId = `friend-${friendIds[0]}-${friendIds[1]}`;
      setRoomId(newRoomId);
      roomIdRef.current = newRoomId;
      // Find and set selected friend
      api.get(`/users/${friendId}`).then(res => {
        setSelectedFriend(res.data);
      }).catch(err => {
        toast.error('Failed to load friend');
      });
    } else {
      setRoomId(null);
      roomIdRef.current = null;
      setSelectedFriend(null);
    }
  }, [projectId, friendId, userData]);

  // Initialize socket connection once
  useEffect(() => {
    if (!userData?._id) return;

    const socketURL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    console.log('🔌 Initializing socket connection:', socketURL);
    
    const newSocket = io(socketURL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      query: {
        userId: userData._id
      }
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setSocket(newSocket);
      socketRef.current = newSocket;
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      toast.error('Failed to connect to chat server');
    });

    newSocket.on('receive-message', (data) => {
      console.log('📥 Received message event:', {
        roomId: data.roomId,
        from: data.user?.name,
        message: data.message,
        messageId: data.id
      });
      
      // Check if message is for current room using ref (always up-to-date)
      const currentRoom = roomIdRef.current;
      const isForCurrentRoom = data.roomId === currentRoom;
      
      console.log(`Checking room match: ${data.roomId} === ${currentRoom} = ${isForCurrentRoom}`);
      
      if (isForCurrentRoom) {
        setMessages((prev) => {
          // Check for duplicates using message ID if available
          const exists = data.id 
            ? prev.some(msg => msg.id === data.id)
            : prev.some(msg => {
                const sameUser = msg.user?._id === data.user?._id;
                const sameMessage = msg.message === data.message;
                const sameTime = Math.abs(new Date(msg.timestamp) - new Date(data.timestamp)) < 2000;
                return sameUser && sameMessage && sameTime;
              });
          
          if (exists) {
            console.log('⚠️ Duplicate message detected, skipping');
            return prev;
          }
          
          console.log('✅ Adding new message to state');
          return [...prev, data];
        });
      } else {
        console.log(`⚠️ Message for different room (${data.roomId} vs ${currentRoom}), ignoring`);
      }
    });

    newSocket.on('room-joined', ({ roomId }) => {
      console.log('✅ Confirmed: Joined room', roomId);
    });

    newSocket.on('message-error', ({ error }) => {
      console.error('❌ Message error from server:', error);
      toast.error(error || 'Failed to send message');
    });

    setSocket(newSocket);
    socketRef.current = newSocket;

    return () => {
      if (newSocket && newSocket.connected) {
        if (currentRoomId) {
          newSocket.emit('leave-room', currentRoomId);
        }
        newSocket.close();
      }
    };
  }, [userData?._id]); // Only depend on userData._id

  // Handle room joining when roomId changes
  useEffect(() => {
    if (!socket || !socket.connected || !roomId) {
      return;
    }

    // Leave previous room if exists
    if (currentRoomId && currentRoomId !== roomId) {
      console.log('🚪 Leaving previous room:', currentRoomId);
      socket.emit('leave-room', currentRoomId);
    }

    // Join new room
    console.log('🚪 Joining new room:', roomId);
    socket.emit('join-room', roomId);
    setCurrentRoomId(roomId);
    roomIdRef.current = roomId; // Update ref for message handler
    
    // Clear messages and load new ones
    setMessages([]);
    setTimeout(() => {
      loadMessages(roomId);
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, socket]);

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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    if (!socket || !socket.connected) {
      toast.error('Not connected to chat server. Please wait...');
      return;
    }

    if (!roomId || !userData) {
      toast.error('Please select a friend to chat with');
      return;
    }

    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately

    const messageData = {
      roomId: roomId,
      user: {
        _id: userData._id,
        name: userData.name,
        profilePicture: userData.profilePicture,
      },
      message: messageText,
      timestamp: new Date().toISOString(),
    };

    try {
      console.log('📤 Sending message:', {
        roomId: messageData.roomId,
        user: messageData.user?.name,
        message: messageData.message,
        socketId: socket.id,
        connected: socket.connected
      });
      
      // Send message via socket
      socket.emit('send-message', messageData);
      console.log('✅ Message sent to server');
      
      // Don't add to local state - wait for server to broadcast it back
      // This ensures all users (including sender) see the message consistently
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      toast.error('Failed to send message');
      setNewMessage(messageText); // Restore message
    }
  };

  const handleSelectFriend = (friend) => {
    setSelectedFriend(friend);
    if (userData?._id && friend._id) {
      const friendIds = [userData._id, friend._id].sort();
      const newRoomId = `friend-${friendIds[0]}-${friendIds[1]}`;
      setRoomId(newRoomId);
      roomIdRef.current = newRoomId;
      setMessages([]);
      // Messages will be loaded when socket connects to new room
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

