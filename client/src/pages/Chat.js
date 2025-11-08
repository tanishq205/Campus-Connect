import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { streamClient } from '../config/streamChat';
import api from '../config/api';
import { FiSend, FiUser, FiWifi, FiWifiOff, FiArrowLeft } from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './Chat.css';

const Chat = () => {
  const { projectId, friendId } = useParams();
  const { userData, currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [friends, setFriends] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' or 'projects'
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
      fetchProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData]);

  // Set up channel based on project or friend
  useEffect(() => {
    if (!streamClient.userID || connectionStatus !== 'connected') {
      console.log('⏳ Waiting for Stream Chat connection...', {
        userID: streamClient.userID,
        connectionStatus
      });
      return;
    }

    let channelId = null;
    let channelType = 'messaging';
    let targetFriendId = null;

    if (projectId && userData?._id) {
      channelId = `project-${projectId}`;
      channelType = 'team';
    } else if (selectedProject?._id && userData?._id) {
      // Project selected from projects list
      channelId = `project-${selectedProject._id}`;
      channelType = 'team';
      console.log('📋 Project selected from list, setting up channel:', channelId);
    } else if (friendId && userData?._id) {
      // Friend selected via URL (e.g., /chat/friend/:friendId)
      targetFriendId = friendId;
      const friendIds = [userData._id.toString(), friendId.toString()].sort();
      channelId = `friend-${friendIds[0]}-${friendIds[1]}`;
      channelType = 'messaging';
      
      // Find and set selected friend
      api.get(`/users/${friendId}`).then(res => {
        setSelectedFriend(res.data);
      }).catch(err => {
        console.error('Failed to load friend:', err);
      });
    } else if (selectedFriend?._id && userData?._id) {
      // Friend selected from friends list
      targetFriendId = selectedFriend._id.toString();
      const friendIds = [userData._id.toString(), targetFriendId].sort();
      channelId = `friend-${friendIds[0]}-${friendIds[1]}`;
      channelType = 'messaging';
      console.log('📋 Friend selected from list, setting up channel:', channelId);
    }

    if (!channelId) {
      console.log('⏸️  No channel ID, clearing channel state');
      setChannel(null);
      channelRef.current = null;
      setMessages([]);
      return;
    }

    const setupChannel = async () => {
      try {
        console.log('📡 Setting up Stream Chat channel:', channelId);
        
        // Get or create channel
        let members = [userData._id.toString()]; // Always include current user
        
        if (projectId || selectedProject?._id) {
          // For project chats, include creator and all members
          const project = selectedProject || { _id: projectId };
          const projectMembers = new Set([userData._id.toString()]);
          
          // Add creator
          if (project.creator?._id) {
            projectMembers.add(project.creator._id.toString());
          } else if (project.creator) {
            projectMembers.add(project.creator.toString());
          }
          
          // Add all members
          if (project.members && Array.isArray(project.members)) {
            project.members.forEach(member => {
              const memberId = member.user?._id || member.user;
              if (memberId) {
                projectMembers.add(memberId.toString());
              }
            });
          }
          
          members = Array.from(projectMembers);
          console.log('👥 Project channel members:', members);
        } else if (targetFriendId) {
          // For friend chats, add both users
          members = [userData._id.toString(), targetFriendId];
          console.log('👥 Friend channel members:', members);
        }
        
        const channelName = projectId || selectedProject?._id
          ? (selectedProject?.title || `Project ${projectId || selectedProject?._id}`)
          : 'Direct Message';
        
        const newChannel = streamClient.channel(channelType, channelId, {
          name: channelName,
          members: members,
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

        console.log('✅ Channel setup complete, setting channel state');
        setChannel(newChannel);
        channelRef.current = newChannel;
        console.log('✅ Channel state updated, input should be enabled now');
      } catch (error) {
        console.error('❌ Error setting up channel:', error);
        console.error('   Error details:', error.message);
        setConnectionStatus('error');
        setChannel(null); // Ensure channel is null on error
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
  }, [projectId, friendId, selectedFriend, selectedProject, userData, connectionStatus]);

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

  const fetchProjects = async () => {
    try {
      // Fetch all projects and filter for ones where user is creator or member
      const response = await api.get('/projects');
      const userProjects = response.data.filter(project => {
        const isCreator = project.creator?._id === userData._id || 
                         project.creator?.toString() === userData._id.toString();
        const isMember = project.members?.some(member => 
          (member.user?._id === userData._id || 
           member.user?.toString() === userData._id.toString()) ||
          (typeof member.user === 'string' && member.user === userData._id.toString())
        );
        return isCreator || isMember;
      });
      setProjects(userProjects);
      console.log('📋 Fetched projects for chat:', userProjects.length);
    } catch (error) {
      console.error('Error fetching projects:', error);
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

  const handleBackToChats = () => {
    setSelectedFriend(null);
    setSelectedProject(null);
    setChannel(null);
    setMessages([]);
    // Clean up channel reference
    if (channelRef.current) {
      channelRef.current.stopWatching();
      channelRef.current = null;
    }
  };

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setSelectedFriend(null); // Clear friend selection
    // Channel will be set up automatically via useEffect
  };

  if (!channel && !projectId) {
    return (
      <div className="chat-container">
        <div className="chat-layout">
          <div className="chat-friends-list">
            <div className="chat-tabs">
              <button
                className={`chat-tab ${activeTab === 'friends' ? 'active' : ''}`}
                onClick={() => setActiveTab('friends')}
              >
                Friends
              </button>
              <button
                className={`chat-tab ${activeTab === 'projects' ? 'active' : ''}`}
                onClick={() => setActiveTab('projects')}
              >
                Projects
              </button>
            </div>
            {activeTab === 'friends' ? (
              <>
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
              </>
            ) : (
              <>
                <h3>Projects</h3>
                {projects.length === 0 ? (
                  <div className="no-friends">
                    <p>No projects yet. Join or create a project to start group chatting!</p>
                  </div>
                ) : (
                  <div className="friends-list">
                    {projects.map((project) => {
                      const memberCount = (project.members?.length || 0) + 1; // +1 for creator
                      return (
                        <div
                          key={project._id}
                          className={`friend-item ${selectedProject?._id === project._id ? 'active' : ''}`}
                          onClick={() => handleSelectProject(project)}
                        >
                          <div className="friend-avatar project-avatar">
                            {project.title?.charAt(0) || 'P'}
                          </div>
                          <div className="friend-info">
                            <h4>{project.title}</h4>
                            <p>{memberCount} {memberCount === 1 ? 'member' : 'members'}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="chat-main">
            {(selectedFriend || selectedProject) ? (
              <>
                <div className="chat-header">
                  <button 
                    className="back-button" 
                    onClick={handleBackToChats}
                    title="Back to all chats"
                  >
                    <FiArrowLeft />
                  </button>
                  {selectedFriend ? (
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
                  ) : selectedProject ? (
                    <div className="chat-header-user">
                      <div className="header-avatar project-avatar">
                        {selectedProject.title?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <h2>{selectedProject.title}</h2>
                        <p>{(selectedProject.members?.length || 0) + 1} members</p>
                      </div>
                    </div>
                  ) : null}
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
                    placeholder={connectionStatus === 'connecting' ? 'Connecting...' : channel ? 'Type a message...' : 'Loading chat...'}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={connectionStatus !== 'connected' || !channel}
                  />
                  <button 
                    type="submit" 
                    disabled={connectionStatus !== 'connected' || !channel || !newMessage.trim()}
                    title={!channel ? 'Chat is loading...' : connectionStatus !== 'connected' ? 'Connecting...' : 'Send message'}
                  >
                    <FiSend />
                  </button>
                </form>
              </>
            ) : (
              <div className="chat-placeholder">
                <FiUser size={64} />
                <h3>Select a friend or project to start chatting</h3>
                <p>Choose from the list to begin your conversation</p>
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
        {(selectedFriend || selectedProject) && (
          <button 
            className="back-button" 
            onClick={handleBackToChats}
            title="Back to all chats"
          >
            <FiArrowLeft />
          </button>
        )}
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
        {selectedProject && (
          <div className="chat-header-user">
            <div className="header-avatar project-avatar">
              {selectedProject.title?.charAt(0) || 'P'}
            </div>
            <div>
              <h3>{selectedProject.title}</h3>
              <p>{(selectedProject.members?.length || 0) + 1} members</p>
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
          placeholder={connectionStatus === 'connecting' ? 'Connecting...' : channel ? 'Type a message...' : 'Loading chat...'}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={connectionStatus !== 'connected' || !channel}
        />
        <button 
          type="submit" 
          disabled={connectionStatus !== 'connected' || !channel || !newMessage.trim()}
          title={!channel ? 'Chat is loading...' : connectionStatus !== 'connected' ? 'Connecting...' : 'Send message'}
        >
          <FiSend />
        </button>
      </form>
    </div>
  );
};

export default Chat;
