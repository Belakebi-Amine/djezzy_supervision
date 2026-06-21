import API from './axios';

/**
 * Appelle l'endpoint de connexion du backend Django pour générer les tokens JWT
 * @param {string} username 
 * @param {string} password 
 */
export const loginUser = async (username, password) => {
    try {
        const response = await API.post('token/', {
            username: username,
            password: password
        });
        
        // Retourne les données contenant { access, refresh, user }
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error("Erreur de connexion au serveur");
    }
};

/**
 * Récupère le profil complet de l'utilisateur connecté depuis le backend
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