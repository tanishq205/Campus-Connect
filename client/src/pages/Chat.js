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
  Timestamp,
  enableNetwork,
  disableNetwork,
  waitForPendingWrites
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
          console.log('   From cache:', snapshot.metadata.fromCache);
          
          // If there are pending writes, it means messages are being synced
          // This is normal - Firestore writes locally first, then syncs to server
          if (snapshot.metadata.hasPendingWrites) {
            console.log('⏳ Some writes are still pending (syncing to server)...');
          }
          
          const newMessages = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            
            // Skip documents that are only in local cache and haven't been committed yet
            // (unless they're from the current user - we want to show our own messages immediately)
            const isPending = doc.metadata?.hasPendingWrites;
            const isFromCurrentUser = data.userId === currentUser.uid;
            
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
              isPending: isPending && !isFromCurrentUser, // Mark if pending (for UI indication if needed)
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

    // Detailed validation checks
    console.log('\n🔍 === PRE-SEND VALIDATION ===');
    console.log('roomId:', roomId);
    console.log('userData:', userData ? 'Exists' : 'MISSING');
    console.log('currentUser:', currentUser ? 'Exists' : 'MISSING');
    console.log('currentUser.uid:', currentUser?.uid);
    console.log('db:', db ? 'Initialized' : 'NOT INITIALIZED');
    console.log('db type:', typeof db);
    console.log('🔍 === END VALIDATION ===\n');

    if (!roomId || !userData || !currentUser) {
      const missing = [];
      if (!roomId) missing.push('roomId');
      if (!userData) missing.push('userData');
      if (!currentUser) missing.push('currentUser');
      toast.error(`Missing: ${missing.join(', ')}. Please select a friend to chat with.`);
      console.error('❌ Cannot send message - missing:', missing);
      return;
    }

    if (!db) {
      toast.error('Firestore is not initialized. Please refresh the page.');
      console.error('❌ Firestore db is not initialized');
      return;
    }

    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately

    // Prepare message data (outside try block so it's accessible in catch)
    const messageData = {
      text: messageText,
      userId: currentUser.uid, // Firebase UID for security rules
      mongoUserId: userData._id, // MongoDB ID for display/matching
      userName: userData.name || 'Unknown',
      userProfilePicture: userData.profilePicture || '',
      createdAt: serverTimestamp(),
      timestamp: new Date().toISOString(), // Fallback timestamp
    };

    try {
      console.log('\n📤 === SENDING MESSAGE ===');
      console.log('Room ID:', roomId);
      console.log('Firebase UID:', currentUser.uid);
      console.log('MongoDB User ID:', userData._id);
      console.log('User Name:', userData.name);
      console.log('Message:', messageText);
      console.log('Firestore DB:', db ? 'Initialized' : 'NOT INITIALIZED');
      console.log('Firestore DB type:', typeof db);
      console.log('Firestore DB constructor:', db?.constructor?.name);

      // Create a reference to the messages collection
      console.log('Creating messages collection reference...');
      const messagesRef = collection(db, 'chats', roomId, 'messages');
      console.log('✅ Messages collection reference created:', messagesRef);
      console.log('   Collection path: chats/' + roomId + '/messages');

      console.log('Message data prepared:', {
        ...messageData,
        createdAt: '[serverTimestamp]' // Don't log the function
      });
      console.log('   userId (Firebase UID):', messageData.userId);
      console.log('   mongoUserId:', messageData.mongoUserId);
      console.log('   userName:', messageData.userName);

      // Add message to Firestore
      console.log('⏳ Attempting to add document to Firestore...');
      console.log('   Collection path:', 'chats/' + roomId + '/messages');
      console.log('   Message text:', messageText);
      console.log('   This may take a moment...');
      
      // Ensure network is enabled
      try {
        await enableNetwork(db);
        console.log('   Network enabled');
      } catch (networkError) {
        console.warn('   Network enable warning:', networkError);
      }
      
      // Add message (this writes locally immediately, then syncs)
      console.log('   Calling addDoc...');
      const addDocPromise = addDoc(messagesRef, messageData);
      
      // Add timeout wrapper to detect hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('addDoc timed out after 10 seconds - likely a security rules or network issue')), 10000)
      );
      
      console.log('   Waiting for addDoc to complete...');
      let docRef;
      try {
        docRef = await Promise.race([addDocPromise, timeoutPromise]);
        console.log('✅ addDoc promise resolved!');
      } catch (raceError) {
        // If timeout, try to wait for pending writes to see if it's just slow
        if (raceError.message.includes('timed out')) {
          console.warn('⚠️  addDoc timed out, but checking if write is pending...');
          try {
            await waitForPendingWrites(db);
            console.log('✅ Pending writes completed - message was written!');
            // If we get here, the write succeeded but addDoc promise didn't resolve
            // This is unusual but can happen with network issues
            throw new Error('Write completed but addDoc promise did not resolve. This usually indicates a security rules issue or network problem.');
          } catch (waitError) {
            throw raceError; // Re-throw original timeout error
          }
        }
        throw raceError;
      }
      
      console.log('✅ Message added to Firestore (local write)');
      console.log('   Document ID:', docRef.id);
      console.log('   Document path:', docRef.path);
      console.log('   Note: Message is being synced to server...');
      console.log('   It will appear for all users once sync completes');
      console.log('📤 === MESSAGE SENT ===\n');
      
      // Message will appear automatically via the real-time listener
      // Firestore writes locally first (optimistic update), then syncs to server
      // The listener will receive updates as the message syncs
      
    } catch (error) {
      console.error('\n❌ === ERROR SENDING MESSAGE ===');
      console.error('Error name:', error.name);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Full error object:', error);
      
      // Check if it's a timeout
      if (error.message?.includes('timed out')) {
        console.error('⚠️  addDoc is hanging - the promise is not resolving');
        console.error('   This usually means:');
        console.error('   1. ❌ Firestore security rules are blocking the write (MOST LIKELY)');
        console.error('   2. Network connection issue');
        console.error('   3. Firestore is not properly initialized');
        console.error('');
        console.error('🔧 TO FIX:');
        console.error('   1. Go to Firebase Console → Firestore Database → Rules');
        console.error('   2. Make sure you have these rules:');
        console.error('      match /chats/{roomId}/messages/{messageId} {');
        console.error('        allow read: if request.auth != null;');
        console.error('        allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;');
        console.error('      }');
        console.error('   3. Click "Publish"');
        console.error('   4. Verify userId in message matches currentUser.uid');
        console.error('      Current UID:', currentUser?.uid);
        console.error('      Message userId:', messageData?.userId);
        console.error('');
        console.error('   Check Network tab for failed requests to firestore.googleapis.com');
        toast.error('Message write timed out. Check Firestore security rules!');
      }
      
      console.error('❌ === END ERROR ===\n');
      
      if (error.code === 'permission-denied') {
        toast.error('Permission denied. Check Firestore security rules and make sure Firestore is enabled.');
        console.error('💡 Make sure:');
        console.error('   1. Firestore is enabled in Firebase Console');
        console.error('   2. Security rules allow authenticated users to write');
        console.error('   3. userId in message matches currentUser.uid');
        console.error('   4. Current user Firebase UID:', currentUser.uid);
        console.error('   5. Message userId:', messageData.userId);
      } else if (error.code === 'failed-precondition') {
        toast.error('Firestore index required. Check console for link to create index.');
        if (error.message?.includes('index')) {
          console.error('Index error details:', error.message);
        }
      } else if (error.message?.includes('not initialized') || error.message?.includes('Firestore')) {
        toast.error('Firestore not initialized. Check Firebase configuration.');
        console.error('Firestore initialization check:');
        console.error('   db exists:', !!db);
        console.error('   db type:', typeof db);
      } else if (error.name === 'FirebaseError') {
        toast.error(`Firebase error: ${error.message}`);
        console.error('This is a Firebase-specific error. Check:');
        console.error('   1. Firestore is enabled in Firebase Console');
        console.error('   2. Security rules are correct');
        console.error('   3. Network connection is stable');
      } else {
        toast.error(`Failed to send message: ${error.message || 'Unknown error'}`);
        console.error('Unexpected error type. Please check the console for details.');
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
