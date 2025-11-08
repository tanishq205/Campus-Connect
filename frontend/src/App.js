import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignupFlow from './components/Auth/SignupFlow';
import Login from './components/Auth/Login';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/signup" />} />
          <Route path="/signup" element={<SignupFlow />} />
          <Route path="/login" element={<Login />} />
          {/* Add more routes for Dashboard, Profile, etc. */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
