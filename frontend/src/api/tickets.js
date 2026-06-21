// src/api/tickets.js
const API_URL = "http://127.0.0.1:8000/api"; 

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

/**
 * Récupère la liste des réclamations
 * @param {string} statut - Filtre optionnel (ex: 'Ouvert', 'Résolu')
 */
export const getTickets = async (statut = '') => {
    try {
        let url = `${API_URL}/reclamations/`;
        if (statut) {
            url += `?statut=${encodeURIComponent(statut)}`;
        }

        const response = await fetch(url, { 
            method: 'GET', 
            headers: getHeaders() 
        });
        
        if (!response.ok) {
            throw new Error(`Erreur serveur [${response.status}]`);
        }
        
        return await response.json();
    } catch (error) {
        console.error("Erreur getTickets:", error);
        throw new Error(error.message || "Impossible de charger les tickets");
    }
};

/**
 * Crée un nouveau ticket d'incident
 */
export const createTicket = async (ticketData) => {
    const response = await fetch(`${API_URL}/reclamations/`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(ticketData)
    });
    if (!response.ok) throw new Error('Erreur lors de la création du ticket');
    return response.json();
};

/**
 * Récupère le profil de l'utilisateur connecté
 */
export const getMe = async () => {
    try {
        const response = await fetch(`${API_URL}/accounts/me/`, { method: 'GET', headers: getHeaders() });
        if (!response.ok) return { nom_user: "Agent Call Center" };
        return response.json();
    } catch {
        return { nom_user: "Agent Call Center" };
    }
};

/**
 * Récupère les utilisateurs ayant le rôle d'ingénieur pour l'assignation
 */
export const getEngineers = async () => {
    try {
        // Remplace l'endpoint par ta vraie route Django (ex: /utilisateurs/, /accounts/engineers/, etc.)
        const response = await fetch(`${API_URL}/utilisateurs/`, { 
            method: 'GET', 
            headers: getHeaders() 
        });
        
        if (!response.ok) {
            throw new Error(`Erreur serveur [${response.status}]`);
        }
        
        return await response.json();
    } catch (error) {
        console.error("Erreur getEngineers:", error);
        throw new Error("Impossible de charger la liste des ingénieurs réseau");
    }
};

/**
 * Récupère les infrastructures réseaux (Table SiteReseau) pour la localisation de la panne
 */
export const getSites = async () => {
    try {
        // Remplace l'endpoint par ta vraie route Django pour l'application sites_reseau
        const response = await fetch(`${API_URL}/sites-reseau/`, { 
            method: 'GET', 
            headers: getHeaders() 
        });
        
        if (!response.ok) {
            throw new Error(`Erreur serveur [${response.status}]`);
        }
        
        return await response.json();
    } catch (error) {
        console.error("Erreur getSites:", error);
        throw new Error("Impossible de charger la cartographie des sites Djezzy");
    }
};