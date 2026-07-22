// components/PrivateRoute.jsx
// ─────────────────────────────────────────────────────────────
// Route guard that checks for a valid JWT token and optionally
// verifies the user's role before rendering child routes.
// Redirects to /login if not authenticated.
// ─────────────────────────────────────────────────────────────
import React from 'react';
import { Navigate } from 'react-router-dom';

const decodePayload = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    } catch { return null; }
};

const ROLE_ROUTES = {
    ADMIN: '/admin-dashboard',
    AGENT_CALL_CENTER: '/call-center-dashboard',
    INGENIEUR_RESEAUX: '/engineer-dashboard',
    SUPERVISEUR: '/supervisor-dashboard',
    RESPONSABLE_REPORTING: '/supervisor-dashboard',
};

export default function PrivateRoute({ children, requiredRole }) {
    const token = sessionStorage.getItem('access_token');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    const payload = decodePayload(token);

    // Check if token is expired
    if (!payload || Date.now() >= payload.exp * 1000) {
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
        return <Navigate to="/login" replace />;
    }

    // Check role if required
    if (requiredRole) {
        const userRole = (payload.role || '').toString().toUpperCase();
        if (userRole !== requiredRole.toUpperCase()) {
            const correctRoute = ROLE_ROUTES[userRole] || '/login';
            return <Navigate to={correctRoute} replace />;
        }
    }

    return children;
}
