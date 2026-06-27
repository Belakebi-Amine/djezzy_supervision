import axios from 'axios';

const API = axios.create({
    baseURL: 'http://127.0.0.1:8000/api', // Assure-toi que c'est bien l'URL de ton API Django
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
});

const isTokenValid = () => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) return false;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return Date.now() < payload.exp * 1000;
    } catch { return false; }
};

// Intercepteur pour injecter automatiquement ton token s'il existe
API.interceptors.request.use(
    (config) => {
        const token = isTokenValid() ? localStorage.getItem('access_token') || localStorage.getItem('token') : null;
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