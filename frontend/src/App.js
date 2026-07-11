// App.js
// ─────────────────────────────────────────────────────────────
// Root component for the Djezzy Supervision React app.
// Defines all routes and maps them to the corresponding
// dashboard components. Each role has its own dedicated page.
// ─────────────────────────────────────────────────────────────
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './styles/themes.css';
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
          {/* Root redirects to login */}
          <Route path="/" element={<Navigate to="/login" />} />
          {/* Authentication */}
          <Route path="/login" element={<Login />} />
          {/* Role-based dashboards */}
          <Route path="/call-center-dashboard" element={<CallCenter />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/engineer-dashboard" element={<EngineerDashboard />} />
          <Route path="/supervisor-dashboard" element={<SupervisorDashboard />} />
          {/* User profile (shared across roles) */}
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
