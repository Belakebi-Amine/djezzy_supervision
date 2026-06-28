// src/api/tickets.js
const API_URL = "http://127.0.0.1:8000/api";

export const getTokenRole = () => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) return null;
    const payload = decodePayload(token);
    return payload?.role || null;
};

const decodePayload = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    } catch { return null; }
};

const refreshToken = async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) return null;
    try {
        const response = await fetch(`${API_URL}/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh })
        });
        if (!response.ok) throw new Error('Refresh failed');
        const data = await response.json();
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

const getHeaders = async () => {
    let token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const payload = token ? decodePayload(token) : null;
    const valid = payload && Date.now() < payload.exp * 1000;

    if (!valid && token && payload) {
        const newToken = await refreshToken();
        if (newToken) token = newToken;
        else token = null;
    }

    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

/**
 * Récupère la liste des réclamations.
 * @param {string} statut - ex: 'ouvert,en_cours' ou 'resolu,ferme'
 */
export const getTickets = async (statut = '') => {
    let url = `${API_URL}/reclamations/`;
    if (statut) {
        url += `?statut=${encodeURIComponent(statut)}`;
    }

    const response = await fetch(url, { method: 'GET', headers: await getHeaders() });
    if (!response.ok) {
        throw new Error(`Erreur serveur [${response.status}]`);
    }
    return await response.json();
};

/**
 * Crée un nouveau ticket de réclamation.
 * Les clés doivent correspondre aux champs du ReclamationSerializer.
 */
export const createTicket = async (ticketData) => {
    const response = await fetch(`${API_URL}/reclamations/creer/`, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify(ticketData)
    });
    if (!response.ok) {
        const textBody = await response.text().catch(() => '');
        console.error('Statut HTTP:', response.status);
        console.error('Corps brut de la réponse:', textBody);
        let errorData;
        try { errorData = JSON.parse(textBody); } catch { errorData = textBody; }
        throw new Error('[' + response.status + '] ' + JSON.stringify(errorData));
    }
    return response.json();
};

/**
 * Met à jour un ticket existant (PUT partiel).
 */
export const updateTicket = async (id, ticketData) => {
    const response = await fetch(`${API_URL}/reclamations/${id}/`, {
        method: 'PUT',
        headers: await getHeaders(),
        body: JSON.stringify(ticketData)
    });
    checkAuthAndRedirect(response.status);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Détails rejet API Django:', errorData);
        throw new Error('Erreur lors de la mise à jour du ticket');
    }
    return response.json();
};

/**
 * Récupère le profil de l'utilisateur connecté.
 */
export const getMe = async () => {
    try {
        const response = await fetch(`${API_URL}/accounts/me/`, { method: 'GET', headers: await getHeaders() });
        if (!response.ok) return { username: 'Agent Call Center' };
        return response.json();
    } catch {
        return { username: 'Agent Call Center' };
    }
};

/**
 * Récupère les ingénieurs réseau pour l'assignation.
 */
export const getEngineers = async () => {
    const response = await fetch(`${API_URL}/accounts/ingenieurs/`, { method: 'GET', headers: await getHeaders() });
    if (!response.ok) {
        throw new Error(`Erreur serveur [${response.status}]`);
    }
    return await response.json();
};

/**
 * Récupère les agents Call Center.
 */
export const getAgentsCC = async () => {
    const response = await fetch(`${API_URL}/accounts/agents-cc/`, { method: 'GET', headers: await getHeaders() });
    if (!response.ok) {
        throw new Error(`Erreur serveur [${response.status}]`);
    }
    return await response.json();
};

/**
 * Récupère les sites réseau Djezzy pour le formulaire de création.
 * NOTE: vérifie que sites_reseau/urls.py expose bien un endpoint de liste à cette racine.
 */
export const getSites = async () => {
    const response = await fetch(`${API_URL}/sites/`, { method: 'GET', headers: await getHeaders() });
    if (!response.ok) {
        throw new Error(`Erreur serveur [${response.status}]`);
    }
    return await response.json();
};

/**
 * Met à jour le statut d'un site (UP/DOWN).
 */
const checkAuthAndRedirect = (status) => {
    if (status === 401) {
        ['token', 'access_token', 'refresh_token'].forEach(k => localStorage.removeItem(k));
        window.location.href = '/login';
    }
};

export const updateSiteStatus = async (id, data) => {
    const response = await fetch(`${API_URL}/sites/${id}/`, {
        method: 'PUT',
        headers: await getHeaders(),
        body: JSON.stringify(data)
    });
    checkAuthAndRedirect(response.status);
    if (!response.ok) {
        throw new Error(`Erreur serveur [${response.status}]`);
    }
    return await response.json();
};

/**
 * Crée un nouveau site réseau.
 */
export const createSite = async (siteData) => {
    const response = await fetch(`${API_URL}/sites/creer/`, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify(siteData)
    });
    if (!response.ok) {
        const textBody = await response.text().catch(() => '');
        let errorData;
        try { errorData = JSON.parse(textBody); } catch { errorData = textBody; }
        throw new Error('[' + response.status + '] ' + JSON.stringify(errorData));
    }
    return response.json();
};

/**
 * Récupère la liste de tous les utilisateurs (admin seulement).
 */
export const getUsers = async () => {
    const response = await fetch(`${API_URL}/accounts/users/`, { method: 'GET', headers: await getHeaders() });
    if (!response.ok) throw new Error(`Erreur serveur [${response.status}]`);
    return await response.json();
};

/**
 * Crée un nouvel utilisateur (admin seulement).
 */
export const createUser = async (userData) => {
    const response = await fetch(`${API_URL}/accounts/users/register/`, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify(userData)
    });
    if (!response.ok) throw new Error(`Erreur création utilisateur [${response.status}]`);
    return await response.json();
};

/**
 * Archive un site (passe son statut en DOWN).
 */
export const archiverSite = async (id) => {
    const response = await fetch(`${API_URL}/sites/${id}/archiver/`, {
        method: 'PUT',
        headers: await getHeaders(),
    });
    checkAuthAndRedirect(response.status);
    if (!response.ok) {
        throw new Error(`Erreur serveur [${response.status}]`);
    }
    return response.json();
};

/**
 * Désactive un utilisateur (admin seulement).
 */
export const archiveUser = async (codeUser) => {
    const response = await fetch(`${API_URL}/accounts/users/${codeUser}/archive/`, {
        method: 'DELETE',
        headers: await getHeaders(),
    });
    if (!response.ok) {
        throw new Error(`Erreur serveur [${response.status}]`);
    }
    return response.json();
};
