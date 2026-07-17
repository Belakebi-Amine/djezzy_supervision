// api/tickets.js
// ─────────────────────────────────────────────────────────────
// Ticket and site management API functions. Handles CRUD for
// reclamation tickets, network sites, and user management.
// Includes JWT token handling for authenticated requests.
// ─────────────────────────────────────────────────────────────
const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

// Extract user role from the JWT token payload
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

// On 401, clear tokens — components will handle the redirect gracefully
const checkAuthAndRedirect = (status) => {
    if (status === 401) {
        ['token', 'access_token', 'refresh_token'].forEach(k => localStorage.removeItem(k));
    }
};

// ── Ticket Operations ──

/**
 * Fetches reclamation tickets with optional status filtering.
 * @param {string} statut - Comma-separated statuses (e.g., 'ouvert,resolu')
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
 * Creates a new complaint ticket.
 * @param {Object} ticketData - Ticket fields matching ReclamationSerializer
 */
export const createTicket = async (ticketData) => {
    const response = await fetch(`${API_URL}/reclamations/creer/`, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify(ticketData)
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
 * Updates an existing ticket (partial PUT).
 */
export const updateTicket = async (id, ticketData) => {
    const response = await fetch(`${API_URL}/reclamations/${id}/`, {
        method: 'PUT',
        headers: await getHeaders(),
        body: JSON.stringify(ticketData)
    });
    checkAuthAndRedirect(response.status);
    if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du ticket');
    }
    return response.json();
};

// ── User Profile ──

export const getMe = async () => {
    try {
        const response = await fetch(`${API_URL}/accounts/me/`, { method: 'GET', headers: await getHeaders() });
        if (!response.ok) return { username: 'Agent Call Center' };
        return response.json();
    } catch {
        return { username: 'Agent Call Center' };
    }
};

// ── Dropdown Lists ──

/** Fetches network engineers for ticket assignment */
export const getEngineers = async () => {
    const response = await fetch(`${API_URL}/accounts/ingenieurs/`, { method: 'GET', headers: await getHeaders() });
    if (!response.ok) {
        throw new Error(`Erreur serveur [${response.status}]`);
    }
    return await response.json();
};

/** Fetches call center agents for filtering */
export const getAgentsCC = async () => {
    const response = await fetch(`${API_URL}/accounts/agents-cc/`, { method: 'GET', headers: await getHeaders() });
    if (!response.ok) {
        throw new Error(`Erreur serveur [${response.status}]`);
    }
    return await response.json();
};

// ── Network Sites ──

/** Fetches all network sites for forms and dropdowns */
export const getSites = async () => {
    const response = await fetch(`${API_URL}/sites/`, { method: 'GET', headers: await getHeaders() });
    if (!response.ok) {
        throw new Error(`Erreur serveur [${response.status}]`);
    }
    return await response.json();
};

/** Fetches ALL sites including archived ones (for engineer inline view) */
export const getAllSites = async () => {
    const response = await fetch(`${API_URL}/sites/?archive=true`, { method: 'GET', headers: await getHeaders() });
    if (!response.ok) {
        throw new Error(`Erreur serveur [${response.status}]`);
    }
    return await response.json();
};

/** Fetches only archived sites (for admin archives tab) */
export const getArchivedSites = async () => {
    const response = await fetch(`${API_URL}/sites/?archived_only=true`, { method: 'GET', headers: await getHeaders() });
    if (!response.ok) {
        throw new Error(`Erreur serveur [${response.status}]`);
    }
    return await response.json();
};

/** Restores an archived site (sets archive=False) */
export const restoreSite = async (id) => {
    const response = await fetch(`${API_URL}/sites/${id}/desarchiver/`, {
        method: 'PUT',
        headers: await getHeaders(),
    });
    checkAuthAndRedirect(response.status);
    if (!response.ok) {
        throw new Error(`Erreur serveur [${response.status}]`);
    }
    return response.json();
};

/** Updates a site's status or details */
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

/** Creates a new network site */
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

// ── Admin: User Management ──

/** Fetches all users (admin only) */
export const getUsers = async () => {
    const response = await fetch(`${API_URL}/accounts/users/`, { method: 'GET', headers: await getHeaders() });
    if (!response.ok) throw new Error(`Erreur serveur [${response.status}]`);
    return await response.json();
};

/** Creates a new user account (admin only) */
export const createUser = async (userData) => {
    const response = await fetch(`${API_URL}/accounts/users/register/`, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify(userData)
    });
    if (!response.ok) throw new Error(`Erreur création utilisateur [${response.status}]`);
    return await response.json();
};

/** Soft-deletes a site (sets archive=True) */
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

/** Archives a user (sets is_archived=True, user disappears from list) */
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

/** Toggles a user's active status (active/inactive, user stays in list) */
export const toggleActiveUser = async (codeUser) => {
    const response = await fetch(`${API_URL}/accounts/users/${codeUser}/toggle-active/`, {
        method: 'POST',
        headers: await getHeaders(),
    });
    if (!response.ok) {
        throw new Error(`Erreur serveur [${response.status}]`);
    }
    return response.json();
};

/** Updates a user's info (admin only) */
export const updateUser = async (codeUser, data) => {
    const response = await fetch(`${API_URL}/accounts/users/${codeUser}/`, {
        method: 'PATCH',
        headers: await getHeaders(),
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || err.error || `Erreur serveur [${response.status}]`);
    }
    return response.json();
};

/** Restores an archived user (sets is_archived=False) */
export const restoreUser = async (codeUser) => {
    const response = await fetch(`${API_URL}/accounts/users/${codeUser}/restore/`, {
        method: 'POST',
        headers: await getHeaders(),
    });
    if (!response.ok) {
        throw new Error(`Erreur serveur [${response.status}]`);
    }
    return response.json();
};

/** Permanently deletes a user from the database */
export const deleteUser = async (codeUser) => {
    const response = await fetch(`${API_URL}/accounts/users/${codeUser}/delete/`, {
        method: 'DELETE',
        headers: await getHeaders(),
    });
    if (!response.ok) {
        throw new Error(`Erreur serveur [${response.status}]`);
    }
    return response.json();
};

// ── Reclamation Archive Operations ──

/** Archives a reclamation ticket (admin only) */
export const archiverReclamation = async (id) => {
    const response = await fetch(`${API_URL}/reclamations/${id}/archiver/`, {
        method: 'POST',
        headers: await getHeaders(),
    });
    if (!response.ok) throw new Error(`Erreur archivage [${response.status}]`);
    return response.json();
};

/** Unarchives a reclamation ticket (admin only) */
export const desarchiverReclamation = async (id) => {
    const response = await fetch(`${API_URL}/reclamations/${id}/desarchiver/`, {
        method: 'POST',
        headers: await getHeaders(),
    });
    if (!response.ok) throw new Error(`Erreur désarchivage [${response.status}]`);
    return response.json();
};

/** Fetches archived reclamation tickets (admin only) */
export const getArchivedTickets = async () => {
    const response = await fetch(`${API_URL}/reclamations/?archived=true`, {
        method: 'GET',
        headers: await getHeaders(),
    });
    if (!response.ok) throw new Error(`Erreur serveur [${response.status}]`);
    return await response.json();
};

// ── GroupeTicket Operations ──

/**
 * Fetches grouped tickets with optional filtering.
 */
export const getGroupeTickets = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.statut) params.append('statut', filters.statut);
    if (filters.site_id) params.append('site_id', filters.site_id);
    if (filters.search) params.append('search', filters.search);
    if (filters.archived) params.append('archived', filters.archived);

    const qs = params.toString();
    const url = `${API_URL}/reclamations/groupes/${qs ? '?' + qs : ''}`;

    const response = await fetch(url, { method: 'GET', headers: await getHeaders() });
    if (!response.ok) throw new Error(`Erreur serveur [${response.status}]`);
    return await response.json();
};

/**
 * Fetches stats for grouped tickets.
 */
export const getGroupeTicketStats = async () => {
    const response = await fetch(`${API_URL}/reclamations/groupes/stats/`, {
        method: 'GET', headers: await getHeaders()
    });
    if (!response.ok) throw new Error(`Erreur serveur [${response.status}]`);
    return await response.json();
};

/**
 * Fetches a single grouped ticket detail with all its reclamations.
 */
export const getGroupeTicketDetail = async (id) => {
    const response = await fetch(`${API_URL}/reclamations/groupes/${id}/`, {
        method: 'GET', headers: await getHeaders()
    });
    if (!response.ok) throw new Error(`Erreur serveur [${response.status}]`);
    return await response.json();
};

/**
 * Updates a grouped ticket (status, assignment, priority, etc.)
 */
export const updateGroupeTicket = async (id, data) => {
    const response = await fetch(`${API_URL}/reclamations/groupes/${id}/modifier/`, {
        method: 'PUT', headers: await getHeaders(),
        body: JSON.stringify(data)
    });
    checkAuthAndRedirect(response.status);
    if (!response.ok) throw new Error('Erreur lors de la mise à jour du ticket groupé');
    return await response.json();
};

/**
 * Resolves a grouped ticket and all its child reclamations.
 */
export const resoudreGroupeTicket = async (id) => {
    const response = await fetch(`${API_URL}/reclamations/groupes/${id}/resoudre/`, {
        method: 'POST', headers: await getHeaders()
    });
    checkAuthAndRedirect(response.status);
    if (!response.ok) throw new Error('Erreur lors de la résolution du ticket groupé');
    return await response.json();
};

/**
 * Assigns the current user to a grouped ticket and all its reclamations.
 */
export const assignerGroupeTicket = async (id) => {
    const response = await fetch(`${API_URL}/reclamations/groupes/${id}/assigner/`, {
        method: 'POST', headers: await getHeaders()
    });
    checkAuthAndRedirect(response.status);
    if (!response.ok) throw new Error("Erreur lors de l'assignation du ticket groupé");
    return await response.json();
};

// ── Keywords System ──

/** Fetches all telecom keywords organized by category with scores */
export const getKeywords = async () => {
    const response = await fetch(`${API_URL}/reclamations/keywords/`, {
        method: 'GET',
        headers: await getHeaders(),
    });
    if (!response.ok) throw new Error(`Erreur serveur [${response.status}]`);
    return await response.json();
};

/** Preview priority from selected keywords (live calculation) */
export const previewPriorite = async (motsCles) => {
    const response = await fetch(`${API_URL}/reclamations/keywords/preview/`, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ mots_cles: motsCles }),
    });
    if (!response.ok) throw new Error(`Erreur serveur [${response.status}]`);
    return await response.json();
};
