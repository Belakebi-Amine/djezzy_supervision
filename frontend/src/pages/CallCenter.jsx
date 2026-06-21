import React, { useState, useEffect } from 'react';
import logoDjezzy from '../assets/Djezzy_Logo.png';
import { getTickets, createTicket, getMe, getEngineers, getSites } from '../api/tickets';

const THEME_COLORS = {
    primary: '#E8401A',      // Rouge Djezzy
    secondary: '#FF6B3D',    
    navy: '#0A1628',         // Navy Dark
    bgMain: '#F8FAFC',       
    border: '#E2E8F0'
};

const BADGE_STYLES = {
    BASSE: { bg: '#EFF6FF', text: '#1D4ED8' },
    NORMALE: { bg: '#ECFDF5', text: '#047857' },
    HAUTE: { bg: '#FFFBEB', text: '#B45309' },
    CRITIQUE: { bg: '#FEF2F2', text: '#B91C1C' },
    OUVERT: { bg: '#EFF6FF', text: '#1D4ED8' },
    EN_COURS: { bg: '#FFF7ED', text: '#C2410C' },
    RESOLU: { bg: '#ECFDF5', text: '#047857' },
    FERME: { bg: '#F1F5F9', text: '#475569' }
};

const CallCenter = () => {
    const [view, setView] = useState('non-traites'); 
    const [tickets, setTickets] = useState([]);
    const [engineers, setEngineers] = useState([]); 
    const [sites, setSites] = useState([]);         
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // États de saisie temporaires (Interface graphique)
    const [inputSite, setInputSite] = useState('');
    const [inputDate, setInputDate] = useState('');

    // États appliqués après clic sur le bouton "Filtrer"
    const [appliedSite, setAppliedSite] = useState('');
    const [appliedDate, setAppliedDate] = useState('');

    const [formData, setFormData] = useState({
        nom_client: '', prenom_client: '', telephone_client: '', site: '', priorite: 'normale', description: '', mots_cles_ia: '', assigne_a: '' 
    });

    useEffect(() => {
        getMe().then(data => setUser(data)).catch(err => console.error(err));
        chargerToutesLesDonnees();
    }, []);

    const chargerToutesLesDonnees = () => {
        setLoading(true);
        Promise.all([getTickets(), getEngineers(), getSites()])
            .then(([ticketsData, engineersData, sitesData]) => {
                const listeTickets = Array.isArray(ticketsData) ? ticketsData : (ticketsData?.results || []);
                const listeEngineers = Array.isArray(engineersData) ? engineersData : (engineersData?.results || []);
                const listeSites = Array.isArray(sitesData) ? sitesData : (sitesData?.results || []);

                setTickets(listeTickets);
                setEngineers(listeEngineers);
                setSites(listeSites);
                setLoading(false);
            })
            .catch(err => {
                console.error("Erreur de communication avec l'API Django:", err);
                setLoading(false);
            });
    };

    const handleCreateTicketSubmit = async (e) => {
        e.preventDefault();
        const nomCompletClient = `${formData.nom_client} ${formData.prenom_client}`.trim();

        const ticketDataBackend = {
            nom_client: nomCompletClient,
            telephone_client: formData.telephone_client,
            site: formData.site ? parseInt(formData.site) : null, 
            priorite: formData.priorite,
            description: formData.description,
            mots_cles_ia: formData.mots_cles_ia,
            statut: 'ouvert', 
            assigne_a: formData.assigne_a ? parseInt(formData.assigne_a) : null 
        };

        try {
            await createTicket(ticketDataBackend);
            chargerToutesLesDonnees();
            setView('non-traites'); 
            setFormData({ nom_client: '', prenom_client: '', telephone_client: '', site: '', priorite: 'normale', description: '', mots_cles_ia: '', assigne_a: '' });
        } catch (err) {
            alert("Erreur de création : " + err.message);
        }
    };

    // Application stricte au clic sur le bouton
    const handleApplyFilters = () => {
        setAppliedSite(inputSite);
        setAppliedDate(inputDate);
    };

    // Filtrage automatique selon l'onglet actif (Tickets Actifs / Historique)
    const ticketsFiltresParStatut = tickets.filter(t => {
        const statut = t.statut ? t.statut.toLowerCase().trim() : 'ouvert';
        if (view === 'non-traites') {
            return statut === 'ouvert' || statut === 'en_cours';
        }
        if (view === 'traites') {
            return statut === 'resolu' || statut === 'ferme';
        }
        return true;
    });

    // Filtrage final appliqué par le bouton
    const ticketsFinaux = ticketsFiltresParStatut.filter(t => {
        // Supporte à la fois un ID direct ou un objet imbriqué renvoyé par Django
        const siteId = t.site && typeof t.site === 'object' ? t.site.id : t.site;
        const matchSite = appliedSite === '' || (siteId && siteId.toString() === appliedSite);
        
        const dateCreationFormatee = t.created_at ? t.created_at.substring(0, 10) : '';
        const matchDate = appliedDate === '' || dateCreationFormatee === appliedDate;

        return matchSite && matchDate;
    });

    return (
        <div style={styles.appContainer}>
            <Sidebar view={view} setView={setView} />
            <main style={styles.mainContent}>
                <Header user={user} />
                <div style={styles.contentWrapper}>
                    {loading ? (
                        <div style={styles.stateMessage}>Récupération des flux réseau...</div>
                    ) : (
                        view !== 'nouveau-ticket' ? (
                            <TicketTable 
                                view={view} 
                                tickets={ticketsFinaux} 
                                sites={sites}
                                inputSite={inputSite}
                                setInputSite={setInputSite}
                                inputDate={inputDate}
                                setInputDate={setInputDate}
                                onApplyFilters={handleApplyFilters}
                                setView={setView} 
                            />
                        ) : (
                            <TicketForm 
                                formData={formData} 
                                setFormData={setFormData} 
                                engineers={engineers}
                                sites={sites}
                                onSubmit={handleCreateTicketSubmit} 
                                onCancel={() => setView('non-traites')} 
                            />
                        )
                    )}
                </div>
            </main>
        </div>
    );
};

const Sidebar = ({ view, setView }) => (
    <aside style={styles.sidebar}>
        <div style={styles.brandContainer}>
            <img src={logoDjezzy} alt="Djezzy" style={styles.sidebarLogo} />
            <div>
                <div style={styles.brandTitle}>Djezzy</div>
                <div style={styles.brandSub}>Call Center Hub</div>
            </div>
        </div>
        <div style={styles.menuGroup}>
            <div style={styles.menuLabel}>NAVIGATION</div>
            <button style={{ ...styles.menuItem, ...(view === 'non-traites' ? styles.menuItemActive : {}) }} onClick={() => setView('non-traites')}>
                <IconFolder /> Tickets Actifs
            </button>
            <button style={{ ...styles.menuItem, ...(view === 'traites' ? styles.menuItemActive : {}) }} onClick={() => setView('traites')}>
                <IconCheckList /> Historique Archivés
            </button>
        </div>
    </aside>
);

const Header = ({ user }) => (
    <header style={styles.mainHeader}>
        <div style={styles.headerLeft}>
            <span style={styles.headerIndicator}></span>
            <h1 style={styles.pageTitle}>Console de Supervision Réseau</h1>
        </div>
        <div style={styles.userInfo}>
            <div style={styles.userAvatar}>
                {user?.username ? user.username.charAt(0).toUpperCase() : "A"}
            </div>
            <span style={styles.userName}>{user?.username || "Agent Call Center"}</span>
        </div>
    </header>
);

const TicketTable = ({ 
    view, tickets, sites, 
    inputSite, setInputSite, 
    inputDate, setInputDate, 
    onApplyFilters, setView 
}) => (
    <div style={styles.card}>
        <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>
                {view === 'non-traites' ? "Listes des réclamations non-traitées" : "Listes des réclamations traitées"}
            </h2>
            <button style={styles.newTicketButton} onClick={() => setView('nouveau-ticket')}>
                + Nouveau Ticket
            </button>
        </div>

        {/* CONTROLES FILTRES CONFORMES MAQUETTE */}
        <div style={styles.filterBar}>
            <select style={styles.filterSelect} value={inputSite} onChange={e => setInputSite(e.target.value)}>
                <option value="">Sélectionner un Site Réseau</option>
                {sites.map(s => <option key={s.id} value={s.id.toString()}>{s.nom || s.nom_site}</option>)}
            </select>

            <input 
                type="date" 
                style={styles.filterDateInput} 
                value={inputDate} 
                onChange={e => setInputDate(e.target.value)} 
            />

            <button style={styles.submitFilterBtn} onClick={onApplyFilters}>
                Filtrer
            </button>
        </div>

        <table style={styles.table}>
            <thead>
                <tr style={styles.thRow}>
                    <th style={styles.th}>N° TICKET</th>
                    <th style={styles.th}>NOM & PRÉNOM CLIENT</th>
                    <th style={styles.th}>TÉLÉPHONE</th>
                    <th style={styles.th}>SITE CONCERNÉ</th>
                    <th style={styles.th}>DESCRIPTION INCIDENT</th>
                    <th style={styles.th}>PRIORITÉ</th>
                    <th style={styles.th}>STATUT</th>
                    <th style={styles.th}>ING ASSIGNÉ</th>
                </tr>
            </thead>
            <tbody>
                {tickets.map((ticket, idx) => {
                    const prioKey = (ticket.priorite || 'NORMALE').toUpperCase();
                    const statusKey = (ticket.statut || 'OUVERT').toUpperCase();
                    
                    const prioStyle = BADGE_STYLES[prioKey] || BADGE_STYLES.NORMALE;
                    const statusStyle = BADGE_STYLES[statusKey] || BADGE_STYLES.OUVERT;

                    return (
                        <tr key={ticket.id || idx} style={styles.tr}>
                            <td style={styles.tdId}>{ticket.numero_ticket || `#${ticket.id}`}</td>
                            <td style={styles.tdName}>{ticket.nom_client}</td>
                            <td style={styles.td}>{ticket.telephone_client}</td>
                            <td style={styles.td}>{ticket.site_display || 'Non spécifié'}</td>
                            <td style={styles.tdDescription} title={ticket.description}>
                                {ticket.description || 'Aucun rapport généré.'}
                            </td>
                            <td style={styles.td}>
                                <span style={{ ...styles.badge, backgroundColor: prioStyle.bg, color: prioStyle.text }}>{ticket.priorite}</span>
                            </td>
                            <td style={styles.td}>
                                <span style={{ ...styles.badge, backgroundColor: statusStyle.bg, color: statusStyle.text }}>{ticket.statut}</span>
                            </td>
                            <td style={styles.tdEngineer}>{ticket.assigne_a_display || 'En attente'}</td>
                        </tr>
                    );
                })}
                {tickets.length === 0 && (
                    <tr>
                        <td colSpan="8" style={styles.tableEmpty}>Aucun enregistrement ne correspond aux critères sélectionnés.</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);

const TicketForm = ({ formData, setFormData, engineers, sites, onSubmit, onCancel }) => (
    <div style={styles.card}>
        <div style={styles.formHeader}>
            <h3 style={styles.formTitle}>Ouverture d'un nouveau ticket d'incident</h3>
        </div>
        <form onSubmit={onSubmit} style={styles.form}>
            <div style={styles.formGrid}>
                <div style={styles.inputGroup}>
                    <label style={styles.formLabel}>Nom du client</label>
                    <input type="text" style={styles.formInput} value={formData.nom_client} onChange={e => setFormData({...formData, nom_client: e.target.value})} required />
                </div>
                <div style={styles.inputGroup}>
                    <label style={styles.formLabel}>Prénom du client</label>
                    <input type="text" style={styles.formInput} value={formData.prenom_client} onChange={e => setFormData({...formData, prenom_client: e.target.value})} required />
                </div>
                <div style={styles.inputGroup}>
                    <label style={styles.formLabel}>Téléphone</label>