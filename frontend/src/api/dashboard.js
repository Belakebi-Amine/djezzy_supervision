// api/dashboard.js
// ─────────────────────────────────────────────────────────────
// Dashboard API functions. Uses fetch() instead of Axios for
// the main dashboard data. Includes JWT management inline
// (decode, refresh, inject) for each request. Handles all
// dashboard-related API calls: stats, reporting, sites, tickets,
// comments, and AI report generation.
// ─────────────────────────────────────────────────────────────
const API_URL = "http://127.0.0.1:8000/api";

// Decode JWT payload to check expiration
const decodePayload = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    } catch { return null; }
};

// Refresh the access token when it expires
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

// Build auth headers with automatic token refresh
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

// Redirect to login on 401 Unauthorized
const checkAuthAndRedirect = (status) => {
    if (status === 401) {
        ['token', 'access_token', 'refresh_token'].forEach(k => localStorage.removeItem(k));
    }
};

// ── Dashboard Stats & Reporting ──

export const getDashboardStats = async (jours = 30) => {
    const response = await fetch(`${API_URL}/dashboard/stats/?jours=${jours}`, {
        method: 'GET',
        headers: await getHeaders()
    });
    if (!response.ok) throw new Error(`Erreur serveur [${response.status}]`);
    return await response.json();
};

export const getDashboardReporting = async (jours = 30) => {
    const response = await fetch(`${API_URL}/dashboard/reporting/?jours=${jours}`, {
        method: 'GET',
        headers: await getHeaders()
    });
    if (!response.ok) throw new Error(`Erreur serveur [${response.status}]`);
    return await response.json();
};

export const getDashboardCartoSites = async () => {
    const response = await fetch(`${API_URL}/dashboard/carte-sites/`, {
        method: 'GET',
        headers: await getHeaders()
    });
    if (!response.ok) throw new Error(`Erreur serveur [${response.status}]`);
    return await response.json();
};

// ── Reclamations ──

export const getReclamationsList = async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/reclamations/?${qs}`, {
        method: 'GET',
        headers: await getHeaders()
    });
    if (!response.ok) throw new Error(`Erreur réclamations [${response.status}]`);
    return await response.json();
};

export const updateReclamation = async (id, data) => {
    const response = await fetch(`${API_URL}/reclamations/${id}/`, {
        method: 'PUT',
        headers: await getHeaders(),
        body: JSON.stringify(data),
    });
    checkAuthAndRedirect(response.status);
    if (!response.ok) throw new Error(`Erreur mise à jour [${response.status}]`);
    return await response.json();
};

// ── Sites ──

export const getSiteDetail = async (id) => {
    const response = await fetch(`${API_URL}/sites/${id}/`, {
        method: 'GET',
        headers: await getHeaders()
    });
    if (!response.ok) throw new Error(`Erreur site [${response.status}]`);
    return await response.json();
};

export const updateSite = async (id, data) => {
    const response = await fetch(`${API_URL}/sites/${id}/`, {
        method: 'PUT',
        headers: await getHeaders(),
        body: JSON.stringify(data),
    });
    checkAuthAndRedirect(response.status);
    if (!response.ok) throw new Error(`Erreur mise à jour site [${response.status}]`);
    return await response.json();
};

// ── Comments ──

export const addComment = async (ticketId, contenu) => {
    const response = await fetch(`${API_URL}/reclamations/${ticketId}/commentaire/`, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ contenu }),
    });
    if (!response.ok) throw new Error(`Erreur commentaire [${response.status}]`);
    return await response.json();
};

// ── AI Reports ──

export const genererRapportIA = async (prompt, dateDebut, dateFin) => {
    const body = { prompt };
    if (dateDebut) body.date_debut = dateDebut;
    if (dateFin) body.date_fin = dateFin;
    const response = await fetch(`${API_URL}/dashboard/rapport-ia/generer/`, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify(body),
    });
    checkAuthAndRedirect(response.status);
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Erreur génération [${response.status}]`);
    }
    return await response.json();
};

export const getRapportsIA = async () => {
    const response = await fetch(`${API_URL}/dashboard/rapport-ia/`, {
        method: 'GET',
        headers: await getHeaders(),
    });
    checkAuthAndRedirect(response.status);
    if (!response.ok) throw new Error(`Erreur récupération [${response.status}]`);
    return await response.json();
};

export const getRapportIA = async (id) => {
    const response = await fetch(`${API_URL}/dashboard/rapport-ia/${id}/`, {
        method: 'GET',
        headers: await getHeaders(),
    });
    checkAuthAndRedirect(response.status);
    if (!response.ok) throw new Error(`Erreur récupération [${response.status}]`);
    return await response.json();
};

export const sauvegarderRapportIA = async (titre, prompt, contenu, dateDebut, dateFin) => {
    const body = { titre, prompt, contenu };
    if (dateDebut) body.date_debut = dateDebut;
    if (dateFin) body.date_fin = dateFin;
    const response = await fetch(`${API_URL}/dashboard/rapport-ia/`, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify(body),
    });
    checkAuthAndRedirect(response.status);
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Erreur sauvegarde [${response.status}]`);
    }
    return await response.json();
};

export const updateRapportIA = async (id, data) => {
    const response = await fetch(`${API_URL}/dashboard/rapport-ia/${id}/`, {
        method: 'PUT',
        headers: await getHeaders(),
        body: JSON.stringify(data),
    });
    checkAuthAndRedirect(response.status);
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Erreur mise à jour [${response.status}]`);
    }
    return await response.json();
};

export const deleteRapportIA = async (id) => {
    const response = await fetch(`${API_URL}/dashboard/rapport-ia/${id}/`, {
        method: 'DELETE',
        headers: await getHeaders(),
    });
    checkAuthAndRedirect(response.status);
    if (!response.ok) throw new Error(`Erreur suppression [${response.status}]`);
};

// ── AI Report Archive (admin only) ──

export const getArchivedRapports = async () => {
    const response = await fetch(`${API_URL}/dashboard/rapport-ia/archives/`, {
        method: 'GET',
        headers: await getHeaders(),
    });
    if (!response.ok) throw new Error(`Erreur archives [${response.status}]`);
    return await response.json();
};

export const restoreRapportIA = async (id) => {
    const response = await fetch(`${API_URL}/dashboard/rapport-ia/archives/`, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ id }),
    });
    if (!response.ok) throw new Error(`Erreur restauration [${response.status}]`);
    return await response.json();
};
