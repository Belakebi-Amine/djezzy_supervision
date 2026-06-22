import React, { useState, useEffect, useRef } from 'react';
import logoDjezzy from '../assets/Djezzy_Logo.png';
import { getTickets, createTicket, getMe, getSites } from '../api/tickets';

// Palette Djezzy Premium [cite: ]
const THEME = {
    primary: '#E8401A', 
    primaryHover: '#CF3512',
    navy: '#0A1628', 
    navyLight: '#112239', // Pour le survol des boutons inactifs
    bgMain: '#F6F8FA', 
    border: '#E9EDF0',
    textMain: '#1E293B',
    textMuted: '#64748B',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
};

const BADGE_STYLES = {
    basse: { bg: '#F1F5F9', text: '#475569' }, 
    normale: { bg: '#E0F2FE', text: '#0369A1' },
    haute: { bg: '#FEF3C7', text: '#B45309' }, 
    critique: { bg: '#FEE2E2', text: '#991B1B' },
    ouvert: { bg: '#ECFDF5', text: '#065F46' }, 
    en_cours: { bg: '#FFEDD5', text: '#9A3412' },
    resolu: { bg: '#E0F2FE', text: '#0369A1' }, 
    ferme: { bg: '#F1F5F9', text: '#475569' }
};

const CallCenter = () => {
    const [view, setView] = useState('non-traites'); 
    const [tickets, setTickets] = useState([]);
    const [sites, setSites] = useState([]);         
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Filtres et Sélection
    const [filterSite, setFilterSite] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const profileMenuRef = useRef(null);

    const [formData, setFormData] = useState({
        nom_client: '', 
        prenom_client: '', 
        telephone_client: '', 
        site: '', 
        priorite: 'normale',
        description: ''
    });

    useEffect(() => {
        getMe().then(data => setUser(data)).catch(err => console.error(err));
        chargerDonnees();

        // Fermer le menu profil au clic à l'extérieur
        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setShowProfileMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const chargerDonnees = () => {
        setLoading(true);
        getTickets()
            .then((ticketsData) => {
                const listeTickets = Array.isArray(ticketsData) ? ticketsData : (ticketsData?.results || []);
                setTickets(listeTickets);
            })
            .catch(err => console.error(err));

        getSites()
            .then((sitesData) => {
                const listeSites = Array.isArray(sitesData) ? sitesData : (sitesData?.results || []);
                setSites(listeSites);
            })
            .catch(() => {
                setSites([
                    { id: 1, nom_site: "Site Alger Centre - Grande Poste" },
                    { id: 2, nom_site: "Site Oran Akid Lotfi" },
                    { id: 3, nom_site: "Site Constantine Ville" },
                    { id: 4, nom_site: "Site Annaba Corniche" },
                    { id: 5, nom_site: "Site Setif Ain El Fouara" }
                ]);
            })
            .finally(() => setLoading(false));
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        window.location.href = '/accounts/login/';
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
            statut: 'ferme'
        };

        try {
            await createTicket(ticketDataBackend);
            chargerDonnees();
            setView('non-traites'); 
            setFormData({ nom_client: '', prenom_client: '', telephone_client: '', site: '', priorite: 'normale', description: '' });
        } catch (err) { 
            alert("Erreur lors de la création."); 
        }
    };

    const simulerChangementStatutIngenieur = (ticketId, nvStatut) => {
        setTickets(prevTickets => prevTickets.map(t => {
            if (t.id === ticketId) {
                let assigneA = t.assigne_a;
                if (nvStatut.toLowerCase() === 'ouvert') {
                    assigneA = { username: user?.username || "belakebi" };
                }
                const updated = { ...t, statut: nvStatut, assigne_a: assigneA };
                if (selectedTicket?.id === ticketId) setSelectedTicket(updated);
                return updated;
            }
            return t;
        }));
    };

    const sitesConcernesParDesTickets = sites.filter(s => 
        tickets.some(t => {
            const tSiteId = t.site && typeof t.site === 'object' ? t.site.id : t.site;
            return tSiteId === s.id;
        })
    );

    const ticketsFinaux = tickets.filter(t => {
        const statutRaw = t.statut ? t.statut.toString().toLowerCase().trim() : 'ferme';
        const statut = statutRaw === 'résolu' ? 'resolu' : (statutRaw === 'fermé' ? 'ferme' : statutRaw);

        if (view === 'non-traites') {
            if (statut === 'resolu' || statut === 'ferme') return false;
        } else if (view === 'traites') {
            if (statut !== 'resolu' && statut !== 'ferme') return false;
        }

        const siteId = t.site && typeof t.site === 'object' ? t.site.id : t.site;
        if (filterSite !== '' && (!siteId || siteId.toString() !== filterSite)) return false;
        
        const dateFormatee = t.created_at ? t.created_at.substring(0, 10) : '';
        if (filterDate !== '' && dateFormatee !== filterDate) return false;

        return true;
    });

    return (
        <div style={styles.appContainer}>
            {/* Sidebar avec boutons fixés */}
            <aside style={styles.sidebar}>
                <div style={styles.brandContainer}>
                    <img src={logoDjezzy} alt="Djezzy Logo" style={styles.sidebarLogo} />
                    <div>
                        <div style={styles.brandTitle}>Djezzy</div>
                        <div style={styles.brandSub}>Supervision Hub</div>
                    </div>
                </div>
                <div style={styles.menuGroup}>
                    <button style={{ ...styles.menuItem, ...(view === 'non-traites' ? styles.menuItemActive : {}) }} onClick={() => { setView('non-traites'); setSelectedTicket(null); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '10px', verticalAlign: 'middle' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        Tickets Actifs ({tickets.filter(t => t.statut !== 'ferme' && t.statut !== 'resolu').length})
                    </button>
                    <button style={{ ...styles.menuItem, ...(view === 'traites' ? styles.menuItemActive : {}) }} onClick={() => { setView('traites'); setSelectedTicket(null); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '10px', verticalAlign: 'middle' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        Historique Archivés
                    </button>
                </div>
            </aside>

            {/* Zone Principale avec Header réparé */}
            <main style={styles.mainContent}>
                <header style={styles.mainHeader}>
                    <h1 style={styles.pageTitle}>Console de Supervision Réseau</h1>
                    
                    {/* Module Profil cliquable calé tout à droite */}
                    <div style={styles.profileWrapper} ref={profileMenuRef}>
                        <div style={styles.userInfo} onClick={() => setShowProfileMenu(!showProfileMenu)}>
                            <div style={styles.userAvatar}>{user?.username ? user.username.charAt(0).toUpperCase() : "B"}</div>
                            <span style={styles.userName}>{user?.username || "belakebi"}</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: '4px', color: THEME.textMuted }}><polyline points="6 9 12 15 18 9"/></svg>
                        </div>
                        
                        {showProfileMenu && (
                            <div style={styles.dropdownMenu}>
                                <button style={styles.dropdownItem} onClick={handleLogout}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                                    Se déconnecter
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                <div style={styles.contentWrapper}>
                    {loading ? (
                        <div style={styles.stateMessage}>Connexion aux serveurs Djezzy...</div>
                    ) : (
                        view !== 'nouveau-ticket' ? (
                            <div style={styles.dashboardLayout}>
                                <div style={{ flex: 1, overflowX: 'auto' }}>
                                    {/* Barre d'actions et filtres */}
                                    <div style={styles.actionBar}>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                                            <select style={styles.minimalSelect} value={filterSite} onChange={e => setFilterSite(e.target.value)}>
                                                <option value="">Tous les sites avec incidents</option>
                                                {sitesConcernesParDesTickets.map(s => <option key={s.id} value={s.id}>{s.nom_site || s.nom}</option>)}
                                            </select>
                                            <input type="date" style={styles.minimalInput} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
                                            
                                            {(filterSite || filterDate) && (
                                                <button style={styles.resetFilterBtn} onClick={() => { setFilterSite(''); setFilterDate(''); }}>
                                                    Effacer les filtres
                                                </button>
                                            )}
                                        </div>
                                        <button style={styles.primaryButton} onClick={() => setView('nouveau-ticket')}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px', verticalAlign: 'middle' }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                            + Nouveau Ticket
                                        </button>
                                    </div>

                                    {/* Tableau Esthétique */}
                                    <table style={styles.table}>
                                        <thead>
                                            <tr style={styles.thRow}>
                                                <th style={styles.th}>NOM & PRÉNOM CLIENT</th>
                                                <th style={styles.th}>N° TÉLÉPHONE</th>
                                                <th style={styles.th}>SITE CONCERNÉ</th>
                                                <th style={styles.th}>DATE CRÉATION</th>
                                                <th style={styles.th}>PRIORITÉ</th>
                                                <th style={styles.th}>STATUT</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {ticketsFinaux.map((ticket, idx) => (
                                                <tr key={ticket.id || idx} style={{ ...styles.tr, ...(selectedTicket?.id === ticket.id ? styles.trSelected : {}) }} onClick={() => setSelectedTicket(ticket)}>
                                                    <td style={styles.tdName}>{ticket.nom_client}</td>
                                                    <td style={styles.td}>{ticket.telephone_client}</td>
                                                    <td style={styles.td}>{typeof ticket.site === 'object' ? (ticket.site?.nom_site || ticket.site?.nom) : (sites.find(s => s.id === ticket.site)?.nom_site || 'Site Indisponible')}</td>
                                                    <td style={styles.tdMuted}>{ticket.created_at ? ticket.created_at.substring(0, 10) : new Date().toLocaleDateString('fr-FR')}</td>
                                                    <td style={styles.td}>
                                                        <span style={{ ...styles.badge, backgroundColor: (BADGE_STYLES[ticket.priorite?.toLowerCase()] || BADGE_STYLES.normale).bg, color: (BADGE_STYLES[ticket.priorite?.toLowerCase()] || BADGE_STYLES.normale).text }}>
                                                            {ticket.priorite}
                                                        </span>
                                                    </td>
                                                    <td style={styles.td}>
                                                        <span style={{ ...styles.badge, backgroundColor: (BADGE_STYLES[ticket.statut?.toLowerCase()] || BADGE_STYLES.ferme).bg, color: (BADGE_STYLES[ticket.statut?.toLowerCase()] || BADGE_STYLES.ferme).text }}>
                                                            {ticket.statut}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {ticketsFinaux.length === 0 && (
                                                <tr>
                                                    <td colSpan="6" style={styles.tableEmpty}>Aucun incident enregistré dans cette section.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Panneau latéral droit */}
                                {selectedTicket && (
                                    <div style={styles.detailPanel}>
                                        <div style={styles.panelHeader}>
                                            <h3 style={styles.panelTitle}>Détails de l'incident</h3>
                                            <button style={styles.closePanelBtn} onClick={() => setSelectedTicket(null)}>✕</button>
                                        </div>
                                        <div style={styles.panelContent}>
                                            <div style={styles.detailRow}><span style={styles.detailLabel}>Client:</span> <strong>{selectedTicket.nom_client}</strong></div>
                                            <div style={styles.detailRow}><span style={styles.detailLabel}>Téléphone:</span> {selectedTicket.telephone_client}</div>
                                            <div style={styles.detailRow}><span style={styles.detailLabel}>Priorité:</span> <span style={{ ...styles.badge, backgroundColor: (BADGE_STYLES[selectedTicket.priorite?.toLowerCase()] || BADGE_STYLES.normale).bg, color: (BADGE_STYLES[selectedTicket.priorite?.toLowerCase()] || BADGE_STYLES.normale).text }}>{selectedTicket.priorite}</span></div>
                                            <div style={styles.detailRow}><span style={styles.detailLabel}>Statut Actuel:</span> <span style={{ ...styles.badge, backgroundColor: (BADGE_STYLES[selectedTicket.statut?.toLowerCase()] || BADGE_STYLES.ferme).bg, color: (BADGE_STYLES[selectedTicket.statut?.toLowerCase()] || BADGE_STYLES.ferme).text }}>{selectedTicket.statut}</span></div>
                                            <div style={styles.detailRow}><span style={styles.detailLabel}>Ingénieur Connecté:</span> <span style={styles.engineerText}>{selectedTicket.assigne_a?.username || "Non assigné"}</span></div>
                                            <div style={{ ...styles.detailRow, flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}><span style={styles.detailLabel}>Description technique:</span> <p style={styles.panelDesc}>{selectedTicket.description || "Aucune description fournie."}</p></div>
                                            
                                            <div style={styles.engineerActionBlock}>
                                                <div style={styles.detailLabel}>Action Ingénieur Réseau :</div>
                                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                    {selectedTicket.statut === 'ferme' && (
                                                        <button style={styles.actionOpenBtn} onClick={() => simulerChangementStatutIngenieur(selectedTicket.id, 'ouvert')}>Ouvrir & M'assigner</button>
                                                    )}
                                                    {selectedTicket.statut === 'ouvert' && (
                                                        <button style={styles.actionResolveBtn} onClick={() => simulerChangementStatutIngenieur(selectedTicket.id, 'resolu')}>Marquer comme Résolu</button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Formulaire */
                            <div style={styles.cardForm}>
                                <h3 style={styles.formTitle}>Ouvrir un dossier de réclamation</h3>
                                <form onSubmit={handleCreateTicketSubmit} style={styles.form}>
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
                                            <label style={styles.formLabel}>Numéro de téléphone</label>
                                            <input type="text" style={styles.formInput} value={formData.telephone_client} onChange={e => setFormData({...formData, telephone_client: e.target.value})} required />
                                        </div>
                                        <div style={styles.inputGroup}>
                                            <label style={styles.formLabel}>Site Réseau Concerné</label>
                                            <select style={styles.formSelect} value={formData.site} onChange={e => setFormData({...formData, site: e.target.value})} required>
                                                <option value="">Sélectionner un équipement réseau...</option>
                                                {sites.map(s => <option value={s.id} key={s.id}>{s.nom_site || s.nom}</option>)}
                                            </select>
                                        </div>
                                        <div style={{ ...styles.inputGroup, gridColumn: 'span 2' }}>
                                            <label style={styles.formLabel}>Urgence / Priorité</label>
                                            <select style={styles.formSelect} value={formData.priorite} onChange={e => setFormData({...formData, priorite: e.target.value})}>
                                                <option value="basse">Basse - Anomalie mineure</option>
                                                <option value="normale">Normale - Ralentissement</option>
                                                <option value="haute">Haute - Interruption partielle</option>
                                                <option value="critique">Critique - Blackout Site</option>
                                            </select>
                                        </div>
                                        <div style={{ ...styles.inputGroup, gridColumn: 'span 2' }}>
                                            <label style={styles.formLabel}>Description de l'incident</label>
                                            <textarea rows="4" style={styles.formTextarea} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required />
                                        </div>
                                    </div>
                                    <div style={styles.formFooter}>
                                        <button type="button" style={styles.cancelBtn} onClick={() => setView('non-traites')}>Annuler</button>
                                        <button type="submit" style={styles.submitBtn}>Créer le ticket (Fermé)</button>
                                    </div>
                                </form>
                            </div>
                        )
                    )}
                </div>
            </main>
        </div>
    );
};

// Styles CSS mis à jour pour la perfection visuelle
const styles = {
    appContainer: { display: 'flex', height: '100vh', backgroundColor: THEME.bgMain, fontFamily: THEME.fontFamily, WebkitFontSmoothing: 'antialiased' },
    sidebar: { width: '240px', backgroundColor: THEME.navy, color: '#FFF', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: '40px' },
    brandContainer: { display: 'flex', alignItems: 'center', gap: '12px' },
    sidebarLogo: { width: '28px', height: '28px', objectFit: 'contain' },
    brandTitle: { fontSize: '15px', fontWeight: '700', letterSpacing: '0.5px' }, brandSub: { fontSize: '11px', color: '#64748B', marginTop: '2px' },
    menuGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    
    // Correction de l'effet blanc moche : Tout reste bleu marine foncé sauf le bouton cliqué qui passe au rouge djezzy
    menuItem: { background: 'transparent', color: '#94A3B8', border: 'none', padding: '14px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', textAlign: 'left', transition: 'all 0.2s', display: 'flex', alignItems: 'center' },
    menuItemActive: { backgroundColor: THEME.primary, color: '#FFFFFF' },
    
    mainContent: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    
    // Header corrigé pour repousser le profil complètement à sa place à droite
    mainHeader: { height: '70px', backgroundColor: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 40px', borderBottom: `1px solid ${THEME.border}` },
    pageTitle: { fontSize: '16px', fontWeight: '600', color: THEME.navy },
    
    // Menu Déroulant Profil Cliquable Propre
    profileWrapper: { position: 'relative' },
    userInfo: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px', transition: 'background 0.2s' },
    userAvatar: { width: '32px', height: '32px', backgroundColor: '#F1F5F9', color: THEME.navy, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '12px', border: `1px solid ${THEME.border}` },
    userName: { fontSize: '13px', color: THEME.textMain, fontWeight: '600' }, 
    dropdownMenu: { position: 'absolute', top: '45px', right: '0', backgroundColor: '#FFFFFF', borderRadius: '8px', border: `1px solid ${THEME.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', width: '160px', zIndex: 10, overflow: 'hidden' },
    dropdownItem: { width: '100%', background: 'none', border: 'none', padding: '12px 16px', textAlgn: 'left', fontSize: '13px', color: '#991B1B', cursor: 'pointer', display: 'flex', alignItems: 'center', fontWeight: '500' },

    contentWrapper: { flex: 1, padding: '40px', overflowY: 'auto' },
    dashboardLayout: { display: 'flex', gap: '32px', alignItems: 'flex-start' },
    actionBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px' },
    minimalSelect: { padding: '10px 14px', borderRadius: '8px', border: `1px solid ${THEME.border}`, backgroundColor: '#FFF', fontSize: '13px', color: THEME.textMain, outline: 'none', minWidth: '220px' },
    minimalInput: { padding: '9px 14px', borderRadius: '8px', border: `1px solid ${THEME.border}`, fontSize: '13px', color: THEME.textMain, outline: 'none' },
    resetFilterBtn: { background: 'none', border: 'none', color: THEME.primary, fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
    primaryButton: { backgroundColor: THEME.primary, color: '#FFF', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center' },
    
    table: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#FFFFFF', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }, 
    thRow: { borderBottom: `1px solid ${THEME.border}`, backgroundColor: '#FAFAFA' },
    th: { padding: '16px 20px', color: THEME.textMuted, fontWeight: '600', fontSize: '12px', textAlign: 'left', letterSpacing: '0.3px' },
    tr: { borderBottom: `1px solid ${THEME.border}`, cursor: 'pointer', transition: 'background 0.15s' }, 
    trSelected: { backgroundColor: '#F8FAFC', borderLeft: `3px solid ${THEME.primary}` },
    td: { padding: '16px 20px', color: THEME.textMain, fontSize: '13px' }, 
    tdName: { padding: '16px 20px', color: THEME.navy, fontWeight: '600', fontSize: '13px' }, 
    tdMuted: { padding: '16px 20px', color: THEME.textMuted, fontSize: '13px' },
    badge: { display: 'inline-flex', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' },
    tableEmpty: { textAlign: 'center', padding: '48px', color: THEME.textMuted, fontSize: '13px' }, 
    stateMessage: { display: 'flex', padding: '80px', justifyContent: 'center', color: THEME.textMuted, fontSize: '14px' },
    
    // Panneau de détails
    detailPanel: { width: '320px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: `1px solid ${THEME.border}`, padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', position: 'sticky', top: 0 },
    panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: `1px solid ${THEME.border}` },
    panelTitle: { fontSize: '14px', fontWeight: '600', color: THEME.navy },
    closePanelBtn: { background: 'transparent', border: 'none', color: THEME.textMuted, cursor: 'pointer', fontSize: '14px' },
    panelContent: { display: 'flex', flexDirection: 'column', gap: '16px' },
    detailRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' },
    detailLabel: { color: THEME.textMuted },
    panelDesc: { margin: '4px 0 0 0', color: THEME.textMain, fontSize: '13px', lineHeight: '1.5', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', border: `1px solid ${THEME.border}`, width: '100%', boxSizing: 'border-box' },
    engineerText: { fontWeight: '600', color: THEME.navy },
    engineerActionBlock: { marginTop: '12px', paddingTop: '16px', borderTop: `1px solid ${THEME.border}` },
    actionOpenBtn: { width: '100%', backgroundColor: THEME.navy, color: '#FFF', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
    actionResolveBtn: { width: '100%', backgroundColor: '#065F46', color: '#FFF', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },

    // Formulaire
    cardForm: { backgroundColor: '#FFFFFF', borderRadius: '12px', border: `1px solid ${THEME.border}`, padding: '32px', maxWidth: '700px', margin: '0 auto' },
    formTitle: { fontSize: '16px', fontWeight: '600', color: THEME.navy, marginBottom: '24px' },
    form: { display: 'flex', flexDirection: 'column' }, formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' }, formLabel: { fontSize: '12px', color: THEME.textMuted, fontWeight: '500' },
    formInput: { padding: '11px 14px', borderRadius: '8px', border: `1px solid ${THEME.border}`, fontSize: '13px', outline: 'none', color: THEME.textMain },
    formSelect: { padding: '11px 14px', borderRadius: '8px', border: `1px solid ${THEME.border}`, backgroundColor: '#FFF', fontSize: '13px', outline: 'none', color: THEME.textMain },
    formTextarea: { padding: '11px 14px', borderRadius: '8px', border: `1px solid ${THEME.border}`, fontSize: '13px', outline: 'none', color: THEME.textMain, fontFamily: 'inherit', resize: 'vertical' },
    formFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' },
    cancelBtn: { backgroundColor: '#FFF', border: `1px solid ${THEME.border}`, padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: THEME.textMuted },
    submitBtn: { backgroundColor: THEME.primary, color: '#FFF', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }
};

export default CallCenter;