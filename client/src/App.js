import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Explore from './pages/Explore';
import Users from './pages/Users';
import Profile from './pages/Profile';
import ProjectDetail from './pages/ProjectDetail';
import Events from './pages/Events';
import DiscoverEvents from './pages/DiscoverEvents';
import CreateEvent from './pages/CreateEvent';
import Discussions from './pages/Discussions';
import ThreadDetail from './pages/ThreadDetail';
import Chat from './pages/Chat';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Toaster position="top-center" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <Navbar />
                  <div className="app-body">
                    <Sidebar />
                    <div className="app-content">
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/explore" element={<Explore />} />
                        <Route path="/users" element={<Users />} />
                        <Route path="/profile/:id" element={<Profile />} />
                        <Route path="/project/:id" element={<ProjectDetail />} />
                        <Route path="/events" element={<Events />} />
                        <Route path="/discover-events" element={<DiscoverEvents />} />
                        <Route path="/create-event" element={<CreateEvent />} />
                        <Route path="/discussions" element={<Discussions />} />
                        <Route path="/discussions/:id" element={<ThreadDetail />} />
                        <Route path="/chat" element={<Chat />} />
                        <Route path="/chat/project/:projectId" element={<Chat />} />
                        <Route path="/chat/friend/:friendId" element={<Chat />} />
                        <Route path="*" element={<Navigate to="/" />} />
                      </Routes>
                    </div>
                  </div>
                </PrivateRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

