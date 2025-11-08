import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  addDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
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
  const [roomId, setRoomId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connected'); // Firestore is always connected
  const messagesEndRef = useRef(null);
  const unsubscribeRef = useRef(null);

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
      setSelectedFriend(null);
    } else if (friendId && userData?._id) {
      // Create a consistent room ID for two friends (sorted IDs)
      // IMPORTANT: Both users must generate the SAME room ID
      const friendIds = [userData._id.toString(), friendId.toString()].sort();
      const newRoomId = `friend-${friendIds[0]}-${friendIds[1]}`;
      console.log('🔑 Generated room ID:', newRoomId);
      console.log('   User IDs:', friendIds);
      setRoomId(newRoomId);
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

  // Set up Firestore real-time listener for messages
  useEffect(() => {
    if (!roomId || !userData?._id || !currentUser) {
      // Clean up previous listener if roomId is cleared
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      setMessages([]);
      return;
    }

    console.log('📡 Setting up Firestore listener for room:', roomId);
    console.log('   Current user Firebase UID:', currentUser.uid);
    console.log('   Current user MongoDB ID:', userData._id);
    setConnectionStatus('connected'); // Firestore handles connection automatically

    try {
      // Create a reference to the messages collection for this room
      const messagesRef = collection(db, 'chats', roomId, 'messages');
      
      // Create a query: order by timestamp, limit to last 100 messages
      // Note: If collection is empty, orderBy might require an index, but it should work
      let messagesQuery;
      try {
        messagesQuery = query(
          messagesRef,
          orderBy('createdAt', 'asc'),
          limit(100)
        );
      } catch (queryError) {
        // If orderBy fails (e.g., no index), try without orderBy
        console.warn('⚠️  orderBy failed, using simple query:', queryError);
        messagesQuery = query(messagesRef, limit(100));
      }

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        messagesQuery,
        (snapshot) => {
          console.log('📥 Received Firestore snapshot update');
          console.log('   Snapshot size:', snapshot.size);
          console.log('   Has pending writes:', snapshot.metadata.hasPendingWrites);
          
          const newMessages = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            // Use mongoUserId if available (for matching with userData), otherwise use userId (Firebase UID)
            const userId = data.mongoUserId || data.userId;
            newMessages.push({
              id: doc.id,
              message: data.text || data.message || '',
              user: {
                _id: userId, // MongoDB ID for matching with userData
                firebaseUid: data.userId, // Firebase UID (for reference)
                name: data.userName || data.user?.name || 'Unknown',
                profilePicture: data.userProfilePicture || data.user?.profilePicture || '',
              },
              timestamp: data.createdAt?.toDate?.() 
                ? data.createdAt.toDate().toISOString()
                : (data.timestamp || new Date().toISOString()),
              createdAt: data.createdAt,
            });
          });

          // Sort messages by timestamp if not already sorted (fallback if orderBy didn't work)
          newMessages.sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return timeA - timeB;
          });

          console.log(`✅ Loaded ${newMessages.length} messages from Firestore`);
          setMessages(newMessages);
        },
        (error) => {
          console.error('❌ Firestore listener error:', error);
          console.error('   Error code:', error.code);
          console.error('   Error message:', error.message);
          setConnectionStatus('error');
          
          if (error.code === 'permission-denied') {
            toast.error('Permission denied. Check Firestore security rules.');
          } else if (error.code === 'failed-precondition') {
            toast.error('Firestore index required. Check console for link.');
          } else {
            toast.error('Error loading messages: ' + error.message);
          }
        }
      );

      // Store unsubscribe function
      unsubscribeRef.current = unsubscribe;

      // Cleanup function
      return () => {
        console.log('🧹 Cleaning up Firestore listener for room:', roomId);
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      };
    } catch (error) {
      console.error('❌ Error setting up Firestore listener:', error);
      setConnectionStatus('error');
      toast.error('Failed to set up chat. Please refresh the page.');
    }
  }, [roomId, userData?._id, currentUser]);

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
    
    if (!newMessage.trim()) return;

    if (!roomId || !userData || !currentUser) {
      toast.error('Please select a friend to chat with');
      return;
    }

    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately

    try {
      console.log('\n📤 === SENDING MESSAGE ===');
      console.log('Room ID:', roomId);
      console.log('Firebase UID:', currentUser.uid);
      console.log('MongoDB User ID:', userData._id);
      console.log('User Name:', userData.name);
      console.log('Message:', messageText);
      console.log('Firestore DB:', db ? 'Initialized' : 'NOT INITIALIZED');

      // Verify Firestore is initialized
      if (!db) {
        throw new Error('Firestore is not initialized. Check Firebase configuration.');
      }

      // Create a reference to the messages collection
      const messagesRef = collection(db, 'chats', roomId, 'messages');
      console.log('Messages collection reference created');

      // Prepare message data
      const messageData = {
        text: messageText,
        userId: currentUser.uid, // Firebase UID for security rules
        mongoUserId: userData._id, // MongoDB ID for display/matching
        userName: userData.name || 'Unknown',
        userProfilePicture: userData.profilePicture || '',
        createdAt: serverTimestamp(),
        timestamp: new Date().toISOString(), // Fallback timestamp
      };

      console.log('Message data prepared:', messageData);

      // Add message to Firestore
      const docRef = await addDoc(messagesRef, messageData);
      console.log('✅ Message sent to Firestore successfully');
      console.log('   Document ID:', docRef.id);
      console.log('📤 === MESSAGE SENT ===\n');
      
      // Message will appear automatically via the real-time listener
      
    } catch (error) {
      console.error('\n❌ === ERROR SENDING MESSAGE ===');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error);
      console.error('❌ === END ERROR ===\n');
      
      if (error.code === 'permission-denied') {
        toast.error('Permission denied. Check Firestore security rules and make sure Firestore is enabled.');
        console.error('💡 Make sure:');
        console.error('   1. Firestore is enabled in Firebase Console');
        console.error('   2. Security rules allow authenticated users to write');
        console.error('   3. userId in message matches currentUser.uid');
      } else if (error.code === 'failed-precondition') {
        toast.error('Firestore index required. Check console for link to create index.');
      } else if (error.message?.includes('not initialized')) {
        toast.error('Firestore not initialized. Check Firebase configuration.');
      } else {
        toast.error(`Failed to send message: ${error.message || 'Unknown error'}`);
      }
      setNewMessage(messageText); // Restore message on error
    }
  };

  const handleSelectFriend = (friend) => {
    setSelectedFriend(friend);
    if (userData?._id && friend._id) {
      // Create a consistent room ID for two friends (sorted IDs)
      // IMPORTANT: Both users must generate the SAME room ID
      const friendIds = [userData._id.toString(), friend._id.toString()].sort();
      const newRoomId = `friend-${friendIds[0]}-${friendIds[1]}`;
      console.log('🔑 Generated room ID:', newRoomId);
      console.log('   User IDs:', friendIds);
      setRoomId(newRoomId);
      setMessages([]);
      // Messages will be loaded automatically via Firestore listener
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
                  <div className="connection-status">
                    {connectionStatus === 'connected' && (
                      <span className="status-connected" title="Connected">
                        <FiWifi /> Connected
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
                  {messages.length === 0 ? (
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
                    disabled={connectionStatus === 'error'}
                  />
                  <button type="submit" disabled={connectionStatus === 'error' || !newMessage.trim()}>
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
          {connectionStatus === 'error' && (
            <span className="status-error" title="Connection Error">
              <FiWifiOff /> Error
            </span>
          )}
        </div>
      </div>
      <div className="chat-messages">
        {messages.length === 0 ? (
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
          disabled={connectionStatus === 'error'}
        />
        <button type="submit" disabled={connectionStatus === 'error' || !newMessage.trim()}>
          <FiSend />
        </button>
      </form>
    </div>
  );
};

export default Chat;
