import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import CallCenter from './pages/CallCenter'; // 🚀 Étape 1 : On importe ton vrai composant connecté au backend

// Composants temporaires restants pour tester les autres rôles sans planter
const AdminDashboard = () => <div style={{ padding: 40, color: '#fff' }}><h2>Interface Administrateur</h2><p>Gestion des comptes.</p></div>;
const EngineerDashboard = () => <div style={{ padding: 40, color: '#fff' }}><h2>Interface Ingénieur</h2><p>Fiches d'interventions terrain.</p></div>;
const SupervisorDashboard = () => <div style={{ padding: 40, color: '#fff' }}><h2>Interface Superviseur</h2><p>Reporting et Statistiques / KPIs.</p></div>;

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Redirection par défaut vers le Login */}
          <Route path="/" element={<Navigate to="/login" />} />
          
          {/* Route de la page de Connexion */}
          <Route path="/login" element={<Login />} />
          
          {/* Étape 2 : On remplace le composant temporaire par ton vrai CallCenter */}
          <Route path="/call-center-dashboard" element={<CallCenter />} />
          
          {/* Routes spécifiques aux autres rôles métiers */}
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/engineer-dashboard" element={<EngineerDashboard />} />
          <Route path="/supervisor-dashboard" element={<SupervisorDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;