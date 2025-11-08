import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Feed from './Feed';
import Profile from './Profile';
import './Dashboard.css';

const Dashboard = () => {
  const [activeView, setActiveView] = useState('feed');
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    const name = localStorage.getItem('name');

    if (!token || !userId) {
      navigate('/login');
      return;
    }

    setUserData({ userId, username, name });
  }, [navigate]);

  if (!userData) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView}
        userData={userData}
      />
      <div className="dashboard-main">
        {activeView === 'feed' && <Feed userData={userData} />}
        {activeView === 'profile' && <Profile userData={userData} />}
      </div>
    </div>
  );
};

export default Dashboard;
