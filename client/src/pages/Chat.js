import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { streamClient } from '../config/streamChat';
import api from '../config/api';
import { FiSend, FiUser, FiWifi, FiWifiOff } from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './Chat.css';

const Chat = () => {
  const { projectId, friendId } = useParams();
  const { userData, currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [channel, setChannel] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const messagesEndRef = useRef(null);
  const channelRef = useRef(null);

  // Connect user to Stream Chat when component mounts
  useEffect(() => {
    if (!userData?._id || !currentUser) return;

    const connectUser = async () => {
      try {
        console.log('🔌 Connecting to Stream Chat...');
        console.log('   User ID:', userData._id);
        console.log('   User Name:', userData.name);

        // Get token from backend
        const tokenResponse = await api.post('/stream-chat/token', {
          userId: userData._id.toString(),
        });

        const { token } = tokenResponse.data;

        // Connect user to Stream Chat with backend-generated token
        await streamClient.connectUser(
          {
            id: userData._id.toString(), // Stream Chat user ID (using MongoDB ID)
            name: userData.name || 'Unknown',
            image: userData.profilePicture || '',
          },
          token // Use token from backend
        );

        console.log('✅ Connected to Stream Chat');
        setConnectionStatus('connected');
      } catch (error) {
        console.error('❌ Failed to connect to Stream Chat:', error);
        setConnectionStatus('error');
        if (error.response?.status === 500) {
          toast.error('Chat server error. Please check backend configuration.');
        } else {
          toast.error('Failed to connect to chat. Please refresh the page.');
        }
      }
    };

    connectUser();

    // Cleanup: disconnect on unmount
    return () => {
      if (streamClient.userID) {
        streamClient.disconnectUser();
        console.log('🔌 Disconnected from Stream Chat');
      }
    };
  }, [userData, currentUser]);

  // Fetch friends list
  useEffect(() => {
    if (userData?._id) {
      fetchFriends();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData]);

  // Set up channel based on project or friend
  useEffect(() => {
    if (!streamClient.userID || connectionStatus !== 'connected') {
      return;
    }

    let channelId = null;
    let channelType = 'messaging';

    if (projectId) {
      channelId = `project-${projectId}`;
      channelType = 'team';
    } else if (friendId && userData?._id) {
      // Create a consistent channel ID for two friends (sorted IDs)
      const friendIds = [userData._id.toString(), friendId.toString()].sort();
      channelId = `friend-${friendIds[0]}-${friendIds[1]}`;
      channelType = 'messaging';
      
      // Find and set selected friend
      api.get(`/users/${friendId}`).then(res => {
        setSelectedFriend(res.data);
      }).catch(err => {
        console.error('Failed to load friend:', err);
      });
    }

    if (!channelId) {
      setChannel(null);
      channelRef.current = null;
      setMessages([]);
      return;
    }

    const setupChannel = async () => {
      try {
        console.log('📡 Setting up Stream Chat channel:', channelId);
        
        // Get or create channel
        const newChannel = streamClient.channel(channelType, channelId, {
          name: projectId ? `Project ${projectId}` : 'Direct Message',
          members: projectId 
            ? [userData._id.toString()] // For project chats, add members as needed
            : [userData._id.toString(), friendId.toString()], // For friend chats, add both users
        });

        // Watch the channel (this subscribes to real-time updates)
        await newChannel.watch();
        console.log('✅ Channel watched successfully');

        // Set up message listener
        newChannel.on('message.new', (event) => {
          console.log('📥 New message received:', event);
          loadMessages(newChannel);
        });

        // Load existing messages
        await loadMessages(newChannel);

        setChannel(newChannel);
        channelRef.current = newChannel;
      } catch (error) {
        console.error('❌ Error setting up channel:', error);
        setConnectionStatus('error');
        toast.error('Failed to load chat. Please try again.');
      }
    };

    setupChannel();

    // Cleanup: stop watching channel
    return () => {
      if (channelRef.current) {
        channelRef.current.stopWatching();
        channelRef.current = null;
      }
      setChannel(null);
      setMessages([]);
    };
  }, [projectId, friendId, userData, connectionStatus]);

  // Load messages from channel
  const loadMessages = async (channelInstance) => {
    try {
      const response = await channelInstance.query({
        messages: { limit: 100 },
      });

      const formattedMessages = response.messages.map((msg) => ({
        id: msg.id,
        message: msg.text || '',
        user: {
          _id: msg.user?.id || msg.user_id,
          name: msg.user?.name || 'Unknown',
          profilePicture: msg.user?.image || '',
        },
        timestamp: msg.created_at || new Date().toISOString(),
      }));

      setMessages(formattedMessages);
      console.log(`✅ Loaded ${formattedMessages.length} messages`);
    } catch (error) {
      console.error('❌ Error loading messages:', error);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchFriends = async () => {
    try {
      const response = await api.get(`/users/${userData._id}/friends`);
      setFriends(response.data);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !channel) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately

    try {
      console.log('📤 Sending message:', messageText);
      
      // Send message via Stream Chat
      await channel.sendMessage({
        text: messageText,
      });

      console.log('✅ Message sent successfully');
      
      // Message will appear automatically via the 'message.new' event listener
    } catch (error) {
      console.error('❌ Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
      setNewMessage(messageText); // Restore message on error
    }
  };

  const handleSelectFriend = (friend) => {
    setSelectedFriend(friend);
    // Channel will be set up automatically via useEffect
  };

  if (!channel && !projectId) {
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
                  <div className="connection-status">
                    {connectionStatus === 'connected' && (
                      <span className="status-connected" title="Connected">
                        <FiWifi /> Connected
                      </span>
                    )}
                    {connectionStatus === 'connecting' && (
                      <span className="status-connecting" title="Connecting...">
                        <FiWifi /> Connecting...
                      </span>
                    )}
                    {connectionStatus === 'error' && (
                      <span className="status-error" title="Connection Error">
                        <FiWifiOff /> Error
                      </span>
                    )}
                  </div>
                </div>

                <div className="chat-messages">
                  {connectionStatus === 'connecting' ? (
                    <div className="no-messages">
                      <p>Connecting to chat...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="no-messages">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwnMessage = msg.user?._id === userData?._id;
                      return (
                        <div
                          key={msg.id || `${msg.timestamp}-${msg.user?._id}`}
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
                                {msg.timestamp
                                  ? format(new Date(msg.timestamp), 'HH:mm')
                                  : 'Now'}
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
                    disabled={connectionStatus !== 'connected' || !channel}
                  />
                  <button 
                    type="submit" 
                    disabled={connectionStatus !== 'connected' || !channel || !newMessage.trim()}
                  >
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
        <div className="connection-status">
          {connectionStatus === 'connected' && (
            <span className="status-connected" title="Connected">
              <FiWifi /> Connected
            </span>
          )}
          {connectionStatus === 'connecting' && (
            <span className="status-connecting" title="Connecting...">
              <FiWifi /> Connecting...
            </span>
          )}
          {connectionStatus === 'error' && (
            <span className="status-error" title="Connection Error">
              <FiWifiOff /> Error
            </span>
          )}
        </div>
      </div>
      <div className="chat-messages">
        {connectionStatus === 'connecting' ? (
          <div className="no-messages">
            <p>Connecting to chat...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.user?._id === userData?._id;
            return (
              <div
                key={msg.id || `${msg.timestamp}-${msg.user?._id}`}
                className={`message ${isOwnMessage ? 'own-message' : ''}`}
              >
                {!isOwnMessage && (
                  <div className="message-avatar">
                    {msg.user?.profilePicture ? (
                      <img src={msg.user.profilePicture} alt={msg.user.name} />
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
                      {msg.timestamp
                        ? format(new Date(msg.timestamp), 'HH:mm')
                        : 'Now'}
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
          disabled={connectionStatus !== 'connected' || !channel}
        />
        <button 
          type="submit" 
          disabled={connectionStatus !== 'connected' || !channel || !newMessage.trim()}
        >
          <FiSend />
        </button>
      </form>
    </div>
  );
};

export default Chat;
