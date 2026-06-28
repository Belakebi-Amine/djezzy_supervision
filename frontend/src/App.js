import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import CallCenter from './pages/CallCenter';
import EngineerDashboard from './pages/EngineerDashboard';
import SupervisorDashboard from './pages/SupervisorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/call-center-dashboard" element={<CallCenter />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/engineer-dashboard" element={<EngineerDashboard />} />
          <Route path="/supervisor-dashboard" element={<SupervisorDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
