const API_URL = "http://127.0.0.1:8000/api";

const isTokenValid = () => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) return false;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return Date.now() < payload.exp * 1000;
    } catch { return false; }
};

const getHeaders = () => {
    const token = isTokenValid() ? localStorage.getItem('access_token') || localStorage.getItem('token') : null;
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
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
