// api/dashboard.js
// ─────────────────────────────────────────────────────────────
// Dashboard API functions. Uses fetch() instead of Axios for
// the main dashboard data. Includes JWT management inline
// (decode, refresh, inject) for each request. Handles all
// dashboard-related API calls: stats, reporting, sites, tickets,
// comments, and AI report generation.
// Tokens stored in sessionStorage (per-tab) for multi-user support.
// ─────────────────────────────────────────────────────────────
const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

const decodePayload = (token) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    } catch { return null; }
};

const getAccessToken = () => sessionStorage.getItem('access_token');
const setAccessToken = (t) => sessionStorage.setItem('access_token', t);
const clearAccessToken = () => sessionStorage.removeItem('access_token');
const getRefreshToken = () => sessionStorage.getItem('refresh_token');
const setRefreshToken = (t) => sessionStorage.setItem('refresh_token', t);
const clearRefreshToken = () => sessionStorage.removeItem('refresh_token');
const clearAllTokens = () => { clearAccessToken(); clearRefreshToken(); };

const refreshToken = async () => {
    const refresh = getRefreshToken();
    if (!refresh) return null;
    try {
        const response = await fetch(`${API_URL}/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh })
        });
        if (!response.ok) throw new Error('Refresh failed');
        const data = await response.json();
        setAccessToken(data.access);
        if (data.refresh) setRefreshToken(data.refresh);
        return data.access;
    } catch {
        clearAllTokens();
        return null;
    }
};

const getHeaders = async () => {
    let token = getAccessToken();
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

// On 401, try refresh first. Only clear if refresh also fails.
const checkAuthAndRedirect = async (status) => {
    if (status === 401) {
        const newToken = await refreshToken();
        if (!newToken) clearAllTokens();
    }
};

// ── Dashboard Stats & Reporting ──

export const getDashboardStats = async (jours = 30, annee = null) => {
    const params = annee ? `annee=${annee}` : `jours=${jours}`;
    const response = await fetch(`${API_URL}/dashboard/stats/?${params}`, {
        method: 'GET',
        headers: await getHeaders()
    });
    if (!response.ok) throw new Error(`Erreur serveur [${response.status}]`);
    return await response.json();
};

export const getDashboardReporting = async (jours = 30, annee = null) => {
    const params = annee ? `annee=${annee}` : `jours=${jours}`;
    const response = await fetch(`${API_URL}/dashboard/reporting/?${params}`, {
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

export const getSystemInfo = async () => {
    const response = await fetch(`${API_URL}/dashboard/system-info/`, {
        headers: await getHeaders(),
    });
    if (!response.ok) throw new Error(`Erreur system-info [${response.status}]`);
    return await response.json();
};

export const getSystemHealth = async () => {
    const response = await fetch(`${API_URL}/audit/health/`, {
        headers: await getHeaders(),
    });
    if (!response.ok) throw new Error(`Erreur system-health [${response.status}]`);
    return await response.json();
};

export const getAuditLogs = async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/audit/logs/?${qs}`, {
        headers: await getHeaders(),
    });
    if (!response.ok) throw new Error(`Erreur audit-logs [${response.status}]`);
    return await response.json();
};

export const getAuditStats = async (jours = 7, annee = null) => {
    const params = annee ? `annee=${annee}` : `jours=${jours}`;
    const response = await fetch(`${API_URL}/audit/stats/?${params}`, {
        headers: await getHeaders(),
    });
    if (!response.ok) throw new Error(`Erreur audit-stats [${response.status}]`);
    return await response.json();
};

export const getServerLoad = async () => {
    const response = await fetch(`${API_URL}/audit/server-load/`, {
        headers: await getHeaders(),
    });
    if (!response.ok) throw new Error(`Erreur server-load [${response.status}]`);
    return await response.json();
};
