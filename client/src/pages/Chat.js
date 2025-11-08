import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { FiSend } from 'react-icons/fi';
import { format } from 'date-fns';
import './Chat.css';

const Chat = () => {
  const { projectId } = useParams();
  const { userData } = useAuth();
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [roomId, setRoomId] = useState(projectId || 'general');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.emit('join-room', roomId);

    newSocket.on('receive-message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      newSocket.emit('leave-room', roomId);
      newSocket.close();
    };
  }, [roomId]);

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

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>Chat</h2>
        {projectId && <p>Project Chat Room</p>}
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

