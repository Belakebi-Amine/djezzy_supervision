// ========================================================
// Point d'entrée de l'application React - Djezzy Hub
// --------------------------------------------------------
// Définit les routes :
//   /login                  → page de connexion
//   /call-center-dashboard  → tableau de bord call center
//   /admin-dashboard        → tableau de bord administrateur
//   /engineer-dashboard     → tableau de bord ingénieur
//   /supervisor-dashboard   → tableau de bord superviseur
//   /profile                → page de profil
// Change aussi le favicon selon le rôle de l'utilisateur.
// ========================================================

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './styles/themes.css';
import { NotificationProvider } from './context/NotificationContext';
import Login from './pages/Login';
import CallCenter from './pages/CallCenter';
import EngineerDashboard from './pages/EngineerDashboard';
import SupervisorDashboard from './pages/SupervisorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import PrivateRoute from './components/PrivateRoute';

// --- Association rôle → chemin du favicon ---
const ROLE_ICONS = {
  ADMIN: '/Icon/Admin-M.png',
  SUPERVISEUR: '/Icon/Supervisor-M.png',
  AGENT_CALL_CENTER: '/Icon/CallCenter.png',
  INGENIEUR_RESEAUX: '/Icon/Reseau.png',
};

// --- Met à jour le favicon de la page selon le rôle ---
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

// --- Contenu principal avec les routes et le favicon dynamique ---
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
        <Route path="/call-center-dashboard" element={<PrivateRoute><CallCenter /></PrivateRoute>} />
        <Route path="/admin-dashboard" element={<PrivateRoute requiredRole="ADMIN"><AdminDashboard /></PrivateRoute>} />
        <Route path="/engineer-dashboard" element={<PrivateRoute><EngineerDashboard /></PrivateRoute>} />
        <Route path="/supervisor-dashboard" element={<PrivateRoute><SupervisorDashboard /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </Router>
  );
}

export default App;
