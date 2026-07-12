// App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './styles/themes.css';
import Login from './pages/Login';
import CallCenter from './pages/CallCenter';
import EngineerDashboard from './pages/EngineerDashboard';
import SupervisorDashboard from './pages/SupervisorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';

const ROLE_ICONS = {
  ADMIN: '/Icon/Admin-M.png',
  SUPERVISEUR: '/Icon/Supervisor-M.png',
  AGENT_CALL_CENTER: '/Icon/CallCenter.png',
  INGENIEUR_RESEAUX: '/Icon/Reseau.png',
};

function setDynamicFavicon(role) {
  const iconPath = ROLE_ICONS[role] || '/Icon/Login.png';
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/png';
  link.href = iconPath;
}

function AppContent() {
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(atob(base64));
        const role = (decoded?.role || '').toString().toUpperCase();
        setDynamicFavicon(role);
      } catch {
        setDynamicFavicon(null);
      }
    } else {
      setDynamicFavicon(null);
    }
  }, [location.pathname]);

  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/call-center-dashboard" element={<CallCenter />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/engineer-dashboard" element={<EngineerDashboard />} />
        <Route path="/supervisor-dashboard" element={<SupervisorDashboard />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
