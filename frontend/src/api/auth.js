// api/auth.js
// ─────────────────────────────────────────────────────────────
// Authentication API functions. Handles login (JWT token request)
// and fetching the current user's profile from the backend.
// ─────────────────────────────────────────────────────────────
import API from './axios';

/**
 * Sends login credentials to the backend and returns JWT tokens.
 * @param {string} username - User's email (used as username)
 * @param {string} password - User's password
 * @returns {Object} { access, refresh, user }
 */
export const loginUser = async (username, password) => {
    try {
        const response = await API.post('token/', {
            username: username,
            password: password
        });
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error("Erreur de connexion au serveur");
    }
};

/**
 * Fetches the authenticated user's profile data.
 * Used on initial load to verify the token is still valid.
 */
export const getMe = async () => {
    try {
        const token = localStorage.getItem('access_token');
        const response = await API.get('me/', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error("Impossible de récupérer le profil");
    }
};
