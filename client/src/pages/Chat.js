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
  const [unreadCounts, setUnreadCounts] = useState({}); // { 'friend-id': count, 'project-id': count }
  const messagesEndRef = useRef(null);
  const channelRef = useRef(null);
  const lastReadMessageRef = useRef({}); // Track last read message ID per chat

  // Calculate total unread count and broadcast it to Navbar
  useEffect(() => {
    const totalUnread = Object.values(unreadCounts).reduce((sum, count) => {
      // Ensure count is a valid number
      const numCount = typeof count === 'number' ? count : parseInt(count, 10) || 0;
      return sum + numCount;
    }, 0);
    
    console.log('📊 Total unread messages:', totalUnread, 'from counts:', unreadCounts);
    
    // Broadcast unread count update to Navbar
    window.dispatchEvent(new CustomEvent('unreadMessageCountUpdated', { 
      detail: { totalUnread } 
    }));
    
    // Also store in localStorage for persistence across page refreshes
    localStorage.setItem('unreadMessageCount', totalUnread.toString());
  }, [unreadCounts]);

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

  // Set up unread message tracking when friends/projects are loaded and connected
  useEffect(() => {
    if (streamClient.userID && connectionStatus === 'connected' && friends.length > 0 || projects.length > 0) {
      setupUnreadTracking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friends, projects, connectionStatus]);

  // Set up unread message tracking for all chats
  const setupUnreadTracking = async () => {
    if (!streamClient.userID || !userData?._id) return;

    try {
      // Watch all friend channels
      for (const friend of friends) {
        const friendIds = [userData._id.toString(), friend._id.toString()].sort();
        const channelId = `friend-${friendIds[0]}-${friendIds[1]}`;
        const channel = streamClient.channel('messaging', channelId);
        
        try {
          await channel.watch();
          channel.on('message.new', (event) => {
            const message = event.message;
            const messageUserId = message.user?.id || message.user_id;
            const isCurrentChat = selectedFriend?._id === friend._id;
            
            if (messageUserId !== userData._id.toString() && !isCurrentChat) {
              setUnreadCounts(prev => {
                const newCounts = {
                  ...prev,
                  [friend._id]: (prev[friend._id] || 0) + 1
                };
                return newCounts;
              });
            }
          });
        } catch (err) {
          console.warn(`Failed to watch channel for friend ${friend._id}:`, err);
        }
      }

      // Watch all project channels
      for (const project of projects) {
        const channelId = `project-${project._id}`;
        const channel = streamClient.channel('messaging', channelId); // Use 'messaging' instead of 'team'
        
        try {
          await channel.watch();
          channel.on('message.new', (event) => {
            const message = event.message;
            const messageUserId = message.user?.id || message.user_id;
            const isCurrentChat = selectedProject?._id === project._id;
            
            if (messageUserId !== userData._id.toString() && !isCurrentChat) {
              setUnreadCounts(prev => {
                const newCounts = {
                  ...prev,
                  [`project-${project._id}`]: (prev[`project-${project._id}`] || 0) + 1
                };
                return newCounts;
              });
            }
          });
        } catch (err) {
          console.warn(`Failed to watch channel for project ${project._id}:`, err);
        }
      }
    } catch (error) {
      console.error('Error setting up unread tracking:', error);
    }
  };

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
      channelType = 'messaging'; // Use 'messaging' instead of 'team' for better permissions
    } else if (selectedProject?._id && userData?._id) {
      // Project selected from projects list
      channelId = `project-${selectedProject._id}`;
      channelType = 'messaging'; // Use 'messaging' instead of 'team' for better permissions
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
        let project = null; // Declare project in wider scope for use in channelName
        
        if (projectId || selectedProject?._id) {
          // For project chats, we need to fetch full project data if not available
          project = selectedProject;
          
          // If we only have projectId from URL, fetch the project data
          if (projectId && !selectedProject) {
            try {
              console.log('📥 Fetching project data for channel setup...');
              const projectResponse = await api.get(`/projects/${projectId}`);
              project = projectResponse.data;
              console.log('✅ Project data fetched:', project.title);
            } catch (error) {
              console.error('❌ Failed to fetch project data:', error);
              toast.error('Failed to load project. Please try again.');
              return;
            }
          }
          
          if (!project) {
            console.error('❌ No project data available');
            toast.error('Project not found');
            return;
          }
          
          // Build members list
          const projectMembers = new Set([userData._id.toString()]);
          
          // Add creator
          if (project.creator) {
            const creatorId = project.creator._id || project.creator;
            if (creatorId) {
              projectMembers.add(creatorId.toString());
              console.log('   Added creator:', creatorId.toString());
            }
          }
          
          // Add all members
          if (project.members && Array.isArray(project.members)) {
            project.members.forEach((member, index) => {
              // Handle both populated and non-populated member objects
              let memberId = null;
              
              // Try different ways to extract member ID
              if (member.user) {
                // Could be populated (member.user._id) or just ID (member.user)
                if (typeof member.user === 'object' && member.user._id) {
                  memberId = member.user._id;
                } else if (typeof member.user === 'string') {
                  memberId = member.user;
                } else if (member.user.toString) {
                  memberId = member.user;
                }
              } else if (member._id) {
                // Sometimes member might be directly the user ID
                memberId = member._id;
              } else if (typeof member === 'string') {
                // Member might be a direct string ID
                memberId = member;
              }
              
              if (memberId) {
                const memberIdStr = memberId.toString();
                // Only add if it's a valid ObjectId-like string
                if (memberIdStr && memberIdStr.length > 0) {
                  projectMembers.add(memberIdStr);
                  console.log(`   Added member ${index + 1}:`, memberIdStr);
                } else {
                  console.warn(`   Skipped member ${index + 1} - invalid ID format:`, memberIdStr);
                }
              } else {
                console.warn(`   Skipped member ${index + 1} - no valid ID found:`, member);
              }
            });
          }
          
          members = Array.from(projectMembers);
          console.log('👥 Project channel members (total):', members.length);
          console.log('   Member IDs:', members);
          
          // Ensure we have at least 2 members for group chat
          if (members.length < 2) {
            console.warn('⚠️  Project has less than 2 members, adding creator as fallback');
            if (project.creator) {
              const creatorId = (project.creator._id || project.creator).toString();
              if (!members.includes(creatorId)) {
                members.push(creatorId);
                console.log('   Added creator as fallback:', creatorId);
              }
            }
          }
        } else if (targetFriendId) {
          // For friend chats, add both users
          members = [userData._id.toString(), targetFriendId];
          console.log('👥 Friend channel members:', members);
        }
        
        const channelName = projectId || selectedProject?._id
          ? (selectedProject?.title || project?.title || `Project ${projectId || selectedProject?._id}`)
          : 'Direct Message';
        
        // Validate members array
        if (!members || members.length === 0) {
          throw new Error('No members found for channel');
        }
        
        // Remove any duplicate or invalid member IDs
        const validMembers = [...new Set(members.filter(id => id && id.toString().trim() !== ''))];
        
        if (validMembers.length === 0) {
          throw new Error('No valid members found for channel');
        }
        
        console.log('📋 Creating channel with members:', validMembers.length);
        console.log('   Member IDs:', validMembers);
        
        // Create channel with initial config
        const newChannel = streamClient.channel(channelType, channelId, {
          name: channelName,
        });

        // Watch the channel (this subscribes to real-time updates and creates it if it doesn't exist)
        try {
          await newChannel.watch();
          console.log('✅ Channel watched successfully');
          
          // For messaging channels with multiple members, explicitly add all members after watching
          // This ensures all members are properly added to the channel
          if (channelType === 'messaging' && validMembers.length > 1) {
            try {
              console.log('👥 Adding members to messaging channel...');
              // Add all members at once - Stream Chat's addMembers accepts an array
              await newChannel.addMembers(validMembers);
              console.log(`✅ Added ${validMembers.length} members to channel`);
            } catch (addMembersError) {
              // If some members are already in channel, try adding them individually
              if (addMembersError.message?.includes('already') || addMembersError.code === 4) {
                console.log('⚠️  Some members may already be in channel, attempting individual adds...');
                // Try adding members individually to handle partial failures
                for (const memberId of validMembers) {
                  try {
                    await newChannel.addMembers([memberId]);
                    console.log(`   ✅ Added member: ${memberId}`);
                  } catch (addError) {
                    // If member is already in channel, that's okay
                    if (addError.message?.includes('already') || addError.code === 4) {
                      console.log(`   ℹ️  Member ${memberId} already in channel`);
                    } else {
                      console.warn(`   ⚠️  Failed to add member ${memberId}:`, addError.message);
                    }
                  }
                }
              } else {
                console.warn('⚠️  Error adding members to channel:', addMembersError);
                // Don't fail the whole setup if adding members fails - channel might already have them
              }
            }
          }
        } catch (watchError) {
          console.error('❌ Error watching channel:', watchError);
          console.error('   Channel ID:', channelId);
          console.error('   Channel type:', channelType);
          console.error('   Members count:', validMembers.length);
          console.error('   Members:', validMembers);
          
          // If watch fails, try to create the channel first
          if (watchError.message?.includes('not found') || watchError.code === 'channel_not_found') {
            console.log('🔄 Channel not found, attempting to create...');
            // Channel will be created automatically when we watch, so this might be a permissions issue
            throw new Error('Failed to access channel. Please check Stream Chat permissions.');
          }
          throw watchError;
        }

        // Set up message listener
        newChannel.on('message.new', (event) => {
          console.log('📥 New message received:', event);
          const message = event.message;
          const messageUserId = message.user?.id || message.user_id;
          
          // Check if this is the currently open chat
          const isCurrentChat = (selectedFriend?._id && channelId.includes(selectedFriend._id.toString())) ||
                               (selectedProject?._id && channelId.includes(selectedProject._id.toString())) ||
                               (projectId && channelId.includes(projectId));
          
          // Only count as unread if:
          // 1. Message is not from current user
          // 2. This chat is not currently open
          if (messageUserId !== userData._id.toString() && !isCurrentChat) {
            // Increment unread count
            if (channelId.startsWith('friend-')) {
              // Extract friend ID from channel ID
              const friendIds = channelId.replace('friend-', '').split('-');
              const otherFriendId = friendIds.find(id => id !== userData._id.toString());
              if (otherFriendId) {
                setUnreadCounts(prev => {
                  const newCounts = {
                    ...prev,
                    [otherFriendId]: (prev[otherFriendId] || 0) + 1
                  };
                  return newCounts;
                });
              }
            } else if (channelId.startsWith('project-')) {
              const projectIdFromChannel = channelId.replace('project-', '');
              setUnreadCounts(prev => {
                const newCounts = {
                  ...prev,
                  [`project-${projectIdFromChannel}`]: (prev[`project-${projectIdFromChannel}`] || 0) + 1
                };
                return newCounts;
              });
            }
          }
          
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
      
      // Mark messages as read when loading (reset unread count)
      const channelId = channelInstance.id || channelInstance.cid?.replace(`${channelInstance.type}:`, '');
      if (channelId) {
        if (channelId.startsWith('friend-')) {
          const friendIds = channelId.replace('friend-', '').split('-');
          const otherFriendId = friendIds.find(id => id !== userData._id.toString());
          if (otherFriendId) {
            setUnreadCounts(prev => {
              const newCounts = { ...prev };
              delete newCounts[otherFriendId];
              return newCounts;
            });
          }
        } else if (channelId.startsWith('project-')) {
          const projectIdFromChannel = channelId.replace('project-', '');
          setUnreadCounts(prev => {
            const newCounts = { ...prev };
            delete newCounts[`project-${projectIdFromChannel}`];
            return newCounts;
          });
        }
      }
      
      // Store last read message ID
      if (formattedMessages.length > 0) {
        const lastMessage = formattedMessages[formattedMessages.length - 1];
        lastReadMessageRef.current[channelId] = lastMessage.id;
      }
      
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
    // Reset unread count for this friend
    setUnreadCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[friend._id];
      return newCounts;
    });
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
    // Reset unread count for this project
    setUnreadCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[`project-${project._id}`];
      return newCounts;
    });
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
                    {friends.map((friend) => {
                      const unreadCount = unreadCounts[friend._id] || 0;
                      return (
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
                          {unreadCount > 0 && (
                            <div className="unread-indicator"></div>
                          )}
                        </div>
                      );
                    })}
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
                      const unreadCount = unreadCounts[`project-${project._id}`] || 0;
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
                          {unreadCount > 0 && (
                            <div className="unread-indicator"></div>
                          )}
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
