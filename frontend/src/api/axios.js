// api/axios.js
// ─────────────────────────────────────────────────────────────
// Axios instance configured for the Django REST API. Includes
// automatic JWT token injection and refresh logic via request
// interceptor. All API calls through this instance will have
// valid authentication headers.
// ─────────────────────────────────────────────────────────────
import axios from 'axios';

// Create a shared Axios instance with base configuration
const API = axios.create({
    baseURL: 'http://127.0.0.1:8000/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
});

// Decodes JWT payload without verification (for expiration check)
const decodePayload = (token) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch { return null; }
};

// Refreshes the access token using the stored refresh token
const refreshToken = async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) return null;
    try {
        const response = await axios.post('http://127.0.0.1:8000/api/token/refresh/', { refresh });
        const data = response.data;
        // Store new tokens (both 'token' and 'access_token' for compatibility)
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('token', data.access);
        if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
        return data.access;
    } catch {
        // Refresh failed — clear all tokens, user must log in again
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        return null;
    }
};

// Request interceptor: auto-injects and refreshes JWT tokens
API.interceptors.request.use(
    async (config) => {
        let token = localStorage.getItem('access_token') || localStorage.getItem('token');
        const payload = token ? decodePayload(token) : null;
        const valid = payload && Date.now() < payload.exp * 1000;

        // Token expired but refresh token exists — refresh silently
        if (!valid && token && payload) {
            token = await refreshToken();
        }

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default API;
