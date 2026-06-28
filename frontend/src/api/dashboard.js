const API_URL = "http://127.0.0.1:8000/api";

const decodePayload = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    } catch { return null; }
};

const getHeaders = () => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const payload = token ? decodePayload(token) : null;
    const valid = payload && Date.now() < payload.exp * 1000;
    if (!valid && payload) {
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': valid ? `Bearer ${token}` : ''
    };
};

export const getDashboardStats = async (jours = 30) => {
    const response = await fetch(`${API_URL}/dashboard/stats/?jours=${jours}`, {
        method: 'GET',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error(`Erreur serveur [${response.status}]`);
    return await response.json();
};

export const getDashboardReporting = async (jours = 30) => {
    const response = await fetch(`${API_URL}/dashboard/reporting/?jours=${jours}`, {
        method: 'GET',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error(`Erreur serveur [${response.status}]`);
    return await response.json();
};

export const getDashboardCartoSites = async () => {
    const response = await fetch(`${API_URL}/dashboard/carte-sites/`, {
        method: 'GET',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error(`Erreur serveur [${response.status}]`);
    return await response.json();
};

export const getReclamationsList = async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/reclamations/?${qs}`, {
        method: 'GET',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error(`Erreur réclamations [${response.status}]`);
    return await response.json();
};

export const updateReclamation = async (id, data) => {
    const response = await fetch(`${API_URL}/reclamations/${id}/`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`Erreur mise à jour [${response.status}]`);
    return await response.json();
};

export const getSiteDetail = async (id) => {
    const response = await fetch(`${API_URL}/sites/${id}/`, {
        method: 'GET',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error(`Erreur site [${response.status}]`);
    return await response.json();
};

export const updateSite = async (id, data) => {
    const response = await fetch(`${API_URL}/sites/${id}/`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`Erreur mise à jour site [${response.status}]`);
    return await response.json();
};

export const addComment = async (ticketId, contenu) => {
    const response = await fetch(`${API_URL}/reclamations/${ticketId}/commentaire/`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ contenu }),
    });
    if (!response.ok) throw new Error(`Erreur commentaire [${response.status}]`);
    return await response.json();
};
