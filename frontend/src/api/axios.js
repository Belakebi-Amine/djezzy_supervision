import axios from 'axios';

const API = axios.create({
    baseURL: 'http://127.0.0.1:8000/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
});

const decodePayload = (token) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch { return null; }
};

const refreshToken = async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) return null;
    try {
        const response = await axios.post('http://127.0.0.1:8000/api/token/refresh/', { refresh });
        const data = response.data;
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('token', data.access);
        if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
        return data.access;
    } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        return null;
    }
};

// Intercepteur pour injecter et rafraîchir automatiquement le token
API.interceptors.request.use(
    async (config) => {
        let token = localStorage.getItem('access_token') || localStorage.getItem('token');
        const payload = token ? decodePayload(token) : null;
        const valid = payload && Date.now() < payload.exp * 1000;

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