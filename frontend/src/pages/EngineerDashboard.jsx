import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTickets, updateTicket, getSites, updateSiteStatus, createSite, archiverSite } from '../api/tickets';
import logoDjezzy from '../assets/Djezzy_Logo.png';

const COLORS = {
  sidebarBg: '#11101f',
  sidebarActive: '#850a27',
  mainBg: '#f5f6fa',
  cardBg: '#FFFFFF',
  textDark: '#1c212b',
  textMuted: '#818898',
  border: '#d8dde5',
  djezzyRed: '#e60023',

  types: {
    PARTICULIER: { bg: '#E2E8F0', text: '#475569', border: '#CBD5E1' },
    ENTREPRISE: { bg: '#475569', text: '#FFFFFF', border: '#334155' },
  },
  priorities: {
    BASSE: { bg: '#E0F2FE', text: '#0284C7', side: '#0284C7' },
    NORMALE: { bg: '#DCFCE7', text: '#15803D', side: '#15803D' },
    HAUTE: { bg: '#FEF3C7', text: '#D97706', side: '#D97706' },
    CRITIQUE: { bg: '#FEE2E2', text: '#DC2626', side: '#DC2626' },
  },
  status: {
    OUVERT: { bg: '#E0F2FE', text: '#0284C7', dot: '#0284C7' },
    'EN COURS': { bg: '#FEF3C7', text: '#D97706', dot: '#D97706' },
    RESOLU: { bg: '#DCFCE7', text: '#15803D', dot: '#15803D' },
    FERME: { bg: '#FEE2E2', text: '#DC2626', dot: '#DC2626' },
  },
};

const MOIS_FR = ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOU', 'SEP', 'OCT', 'NOV', 'DEC'];

const formatDateFr = (isoString) => {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${MOIS_FR[d.getMonth()]}`;
};

const formatDateTimeFr = (isoString) => {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${MOIS_FR[d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const iconProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

const IconTicket = (p) => (
  <svg {...iconProps} {...p}><path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 6v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-6V7Z" /><path d="M10 6v2M10 16v2" /></svg>
);
const IconUser = (p) => (
  <svg {...iconProps} {...p}><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>
);
const IconLogout = (p) => (
  <svg {...iconProps} {...p}><path d="M15 16l4-4-4-4" /><path d="M19 12H8" /><path d="M12 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" /></svg>
);
const IconSite = (p) => (
  <svg {...iconProps} {...p}><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.3" /></svg>
);
const IconBell = (p) => (
  <svg {...iconProps} {...p}><path d="M6 9a6 6 0 0 1 12 0v4l2 3H4l2-3V9Z" /><path d="M10 19h4" /></svg>
);
const IconSearch = (p) => (
  <svg {...iconProps} {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
);
const IconRefresh = (p) => (
  <svg {...iconProps} {...p}><path d="M3 12a9 9 0 0 1 15.5-6.3M21 12a9 9 0 0 1-15.5 6.3" /><path d="M3 4v5h5M21 20v-5h-5" /></svg>
);
const IconFilter = (p) => (
  <svg {...iconProps} {...p}><path d="M4 5h16l-6 7v6l-4 1v-7L4 5Z" /></svg>
);
const IconX = (p) => (
  <svg {...iconProps} {...p}><path d="M18 6L6 18M6 6l12 12" /></svg>
);
const IconChevronLeft = (p) => (
  <svg {...iconProps} {...p}><path d="M15 18l-6-6 6-6" /></svg>
);
const ALL_STATUSES = ['ferme', 'ouvert', 'resolu'];
const ALL_LABELS = { ferme: 'Ferme', ouvert: 'Ouvert', resolu: 'Resolu' };

const getForwardStatuses = (statut) => {
  switch (statut) {
    case 'ferme': return ['ouvert'];
    case 'ouvert': return ['resolu'];
    case 'resolu': return [];
    default: return [];
  }
};

export default function EngineerDashboard() {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('reclamations');
  const [tickets, setTickets] = useState([]);
  const [sites, setSites] = useState([]);
  const [sitesList, setSitesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterSiteId, setFilterSiteId] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [togglingSiteId, setTogglingSiteId] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [siteSubmitting, setSiteSubmitting] = useState(false);
  const [newSiteForm, setNewSiteForm] = useState({
    nom: '', wilaya: '', commune: '', coordX: '', coordY: '', adresse: '', statut: 'UP',
  });

  useEffect(() => {
    getSites().then(setSites).catch(() => setSites([]));
  }, []);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTickets();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Impossible de charger les reclamations', err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const fetchSitesData = useCallback(async () => {
    setSitesLoading(true);
    try {
      const data = await getSites();
      setSitesList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Impossible de charger les sites', err);
      setSitesList([]);
    } finally {
      setSitesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentView === 'sites') fetchSitesData();
  }, [currentView, fetchSitesData]);

  const handleSiteToggle = useCallback(async (siteId, currentStatut) => {
    const newStatut = currentStatut === 'UP' ? 'DOWN' : 'UP';
    const action = newStatut === 'UP' ? 'activer' : 'desactiver';
    if (!window.confirm(`Confirmer la ${action} de ce site ?`)) return;

    setTogglingSiteId(siteId);
    try {
      await updateSiteStatus(siteId, { statut: newStatut });
      setSitesList((prev) =>
        prev.map((s) => (s.id === siteId ? { ...s, statut: newStatut } : s))
      );
    } catch (err) {
      console.error(err);
      alert('Erreur lors du changement de statut du site.');
    } finally {
      setTogglingSiteId(null);
    }
  }, []);

  const handleArchiverSite = useCallback(async (siteId) => {
    if (!window.confirm('Archiver ce site ? Il sera masqué de la liste principale.')) return;
    setTogglingSiteId(siteId);
    try {
      await archiverSite(siteId);
      setSitesList((prev) => prev.filter((s) => s.id !== siteId));
      setSelectedSite(null);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'archivage.');
    } finally {
      setTogglingSiteId(null);
    }
  }, []);

  const handleStatusChange = useCallback(async (ticketId, newStatut, currentStatut) => {
    const msgs = {
      'ferme->ouvert': 'Confirmer l ouverture de ce ticket ?',
      'ouvert->resolu': 'Confirmer la resolution de ce ticket ?',
    };
    const key = `${currentStatut}->${newStatut}`;
    if (msgs[key] && !window.confirm(msgs[key])) return;

    setUpdatingId(ticketId);
    try {
      await updateTicket(ticketId, { statut: newStatut });
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, statut: newStatut } : t))
      );
    } catch (err) {
      console.error(err);
      alert('Erreur lors du changement de statut.');
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const handleCreateSite = useCallback(async (e) => {
    e.preventDefault();
    setSiteSubmitting(true);
    try {
      const generatedCode = 'SITE-' + newSiteForm.nom.slice(0, 3).toUpperCase() + '-' + Date.now().toString(36).slice(-4).toUpperCase();
      const payload = {
        ...newSiteForm,
        codeSite: generatedCode,
        coordX: newSiteForm.coordX || null,
        coordY: newSiteForm.coordY || null,
      };
      await createSite(payload);
      setShowSiteForm(false);
      setNewSiteForm({ nom: '', wilaya: '', commune: '', coordX: '', coordY: '', adresse: '', statut: 'UP' });
      fetchSitesData();
    } catch (err) {
      console.error(err);
      alert('Erreur: ' + err.message);
    } finally {
      setSiteSubmitting(false);
    }
  }, [newSiteForm, fetchSitesData]);

  const handleSiteFormChange = (e) => {
    setNewSiteForm({ ...newSiteForm, [e.target.name]: e.target.value });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  const getStatutKey = (statut) => statut?.replace('_', ' ').toUpperCase();

  const filteredTickets = tickets.filter((t) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      t.nom_complet_client?.toLowerCase().includes(term) ||
      t.numero_ticket?.toLowerCase().includes(term) ||
      t.site_display?.toLowerCase().includes(term) ||
      t.description?.toLowerCase().includes(term);
    if (!matchSearch) return false;
    if (filterPriority) {
      const prio = (t.priorite || '').toUpperCase();
      if (prio !== filterPriority.toUpperCase()) return false;
    }
    if (filterType) {
      const typ = (t.type_client || '').toUpperCase();
      if (typ !== filterType.toUpperCase()) return false;
    }
    if (filterDate) {
      const d = new Date(t.created_at);
      if (d.toISOString().slice(0, 10) !== filterDate) return false;
    }
    if (filterSiteId) {
      const sid = t.site?.id;
      if (String(sid) !== String(filterSiteId)) return false;
    }
    return true;
  });

  return (
    <div style={styles.appLayout}>
      <aside style={styles.sidebar}>
        <div style={styles.brandZone}>
          <img src={logoDjezzy} alt="Djezzy" style={styles.brandLogo} />
          <div>
            <div style={styles.brandName}>Djezzy</div>
            <div style={styles.brandRole}>Ingénieur Réseau</div>
          </div>
        </div>

        <div style={styles.menuSection}>
          <span style={styles.sectionLabel}>PRINCIPAL</span>
          <button style={{ ...styles.menuItem, ...(currentView === 'reclamations' ? styles.menuItemActive : {}) }} onClick={() => setCurrentView('reclamations')}>
            <IconTicket style={{ marginRight: '10px', flexShrink: 0 }} /> Reclamations
          </button>
          <button style={{ ...styles.menuItem, ...(currentView === 'sites' ? styles.menuItemActive : {}) }} onClick={() => { setCurrentView('sites'); setSelectedTicket(null); }}>
            <IconSite style={{ marginRight: '10px', flexShrink: 0 }} /> Sites Reseau
          </button>
          <button style={styles.menuItem}>
            <IconBell style={{ marginRight: '10px', flexShrink: 0 }} /> Alertes
          </button>
        </div>

        <div style={{ ...styles.menuSection, marginTop: '40px' }}>
          <span style={styles.sectionLabel}>PERSONNEL</span>
          <button style={styles.menuItem} onClick={() => navigate('/profile')}>
            <IconUser style={{ marginRight: '10px', flexShrink: 0 }} /> Profile
          </button>
          <button style={styles.menuItem} onClick={handleLogout}>
            <IconLogout style={{ marginRight: '10px', flexShrink: 0 }} /> Log out
          </button>
        </div>
      </aside>

      <div style={styles.mainContent}>
        <header style={styles.topHeader}>
          {currentView === 'sites' && showSiteForm ? (
            <div>
              <div style={styles.backNav} onClick={() => setShowSiteForm(false)}>
                <IconChevronLeft />
                <span style={{ marginLeft: '8px', fontWeight: 600 }}>Nouveau Site</span>
              </div>
              <div style={styles.breadcrumb}>
                Sites Reseau &gt; <span style={{ color: COLORS.djezzyRed }}>Nouveau Site</span>
              </div>
            </div>
          ) : (
            <h1 style={styles.pageTitle}>{currentView === 'sites' ? 'Sites Reseau' : 'Reclamations'}</h1>
          )}
        </header>

        {currentView === 'sites' ? (
          showSiteForm ? (
          <div style={styles.pageContent}>
            <div style={styles.tableCard}>
              <div style={styles.formHeader}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.djezzyRed} strokeWidth="2" style={{ marginRight: '10px' }}><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.3" /></svg>
                <span style={{ fontWeight: 700, fontSize: '14px' }}>Ajouter un site reseau</span>
              </div>
              <form onSubmit={handleCreateSite} style={styles.formBody}>
                <div style={styles.formGrid}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>NOM</label>
                    <input type="text" name="nom" value={newSiteForm.nom} onChange={handleSiteFormChange} placeholder="Ex: Alger Centre" style={styles.input} required />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>WILAYA</label>
                    <input type="text" name="wilaya" value={newSiteForm.wilaya} onChange={handleSiteFormChange} placeholder="Ex: Alger" style={styles.input} required />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>COMMUNE</label>
                    <input type="text" name="commune" value={newSiteForm.commune} onChange={handleSiteFormChange} placeholder="Ex: Hydra" style={styles.input} required />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>X (Longitude)</label>
                    <input type="text" name="coordX" value={newSiteForm.coordX} onChange={handleSiteFormChange} placeholder="Ex: 3.058" style={styles.input} />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Y (Latitude)</label>
                    <input type="text" name="coordY" value={newSiteForm.coordY} onChange={handleSiteFormChange} placeholder="Ex: 36.753" style={styles.input} />
                  </div>
                  <div style={{ ...styles.inputGroup, gridColumn: '1 / -1' }}>
                    <label style={styles.label}>ADRESSE</label>
                    <input type="text" name="adresse" value={newSiteForm.adresse} onChange={handleSiteFormChange} placeholder="Adresse complete" style={styles.input} />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>STATUT</label>
                    <select name="statut" value={newSiteForm.statut} onChange={handleSiteFormChange} style={styles.select}>
                      <option value="UP">UP</option>
                      <option value="DOWN">DOWN</option>
                    </select>
                  </div>
                </div>
                <div style={styles.formActions}>
                  <button type="button" onClick={() => setShowSiteForm(false)} style={styles.btnCancel}>Annuler</button>
                  <button type="submit" disabled={siteSubmitting} style={styles.btnSubmit}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}><path d="M4 12l5 5 11-11" /></svg>
                    {siteSubmitting ? 'Creation...' : 'Creer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
          ) : (
          <div style={styles.pageContent}>
            <div style={styles.statsRow}>
              <div style={{ ...styles.statCard, borderLeftColor: '#3B82F6' }}>
                <span style={styles.statNumber}>{sitesList.length}</span>
                <span style={styles.statLabel}>Total sites</span>
              </div>
              <div style={{ ...styles.statCard, borderLeftColor: '#15803D' }}>
                <span style={{ ...styles.statNumber, color: '#15803D' }}>{sitesList.filter((s) => s.statut === 'UP').length}</span>
                <span style={styles.statLabel}>UP</span>
              </div>
              <div style={{ ...styles.statCard, borderLeftColor: '#DC2626' }}>
                <span style={{ ...styles.statNumber, color: '#DC2626' }}>{sitesList.filter((s) => s.statut === 'DOWN').length}</span>
                <span style={styles.statLabel}>DOWN</span>
              </div>
            </div>
            <div style={styles.tableCard}>
              <div style={styles.toolbar}>
                <div style={styles.toolbarLeft}>
                  <h2 style={styles.tableTitle}>Liste des sites reseau</h2>
                </div>
                <div style={styles.toolbarActions}>
                  <button onClick={fetchSitesData} style={styles.btnFilter}>
                    <IconRefresh style={{ marginRight: '6px' }} /> Actualiser
                  </button>
                  <button onClick={() => { setShowSiteForm(true); setSelectedSite(null); }} style={styles.btnNew}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Nouveau Site
                  </button>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>CODE</th>
                      <th style={styles.th}>NOM</th>
                      <th style={styles.th}>WILAYA</th>
                      <th style={styles.th}>COMMUNE</th>
                      <th style={{ ...styles.th, textAlign: 'center' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sitesLoading ? (
                      <tr><td colSpan="5" style={styles.emptyCell}>Chargement des sites...</td></tr>
                    ) : sitesList.length === 0 ? (
                      <tr><td colSpan="5" style={styles.emptyCell}>Aucun site trouve.</td></tr>
                    ) : sitesList.map((site) => {
                      return (
                        <tr
                          key={site.id}
                          style={{ ...styles.tr, cursor: 'pointer' }}
                          onClick={() => setSelectedSite(site)}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                        >
                          <td style={{ ...styles.td, fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                width: 8, height: 8, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
                                backgroundColor: site.statut === 'UP' ? '#15803D' : site.statut === 'DOWN' ? '#DC2626' : '#D97706',
                              }} />
                              {site.codeSite}
                            </div>
                          </td>
                          <td style={styles.td}>{site.nom}</td>
                          <td style={styles.td}>{site.wilaya}</td>
                          <td style={styles.td}>{site.commune}</td>
                          <td style={{ ...styles.td, textAlign: 'center' }}>
                            <div style={styles.statusActions}>
                              {['UP', 'DOWN'].map((s) => {
                                const isActive = site.statut === s;
                                const isTarget = site.statut !== s;
                                return (
                                  <button
                                    key={s}
                                    disabled={!isTarget || togglingSiteId === site.id}
                                    onClick={() => handleSiteToggle(site.id, site.statut)}
                                    style={{
                                      ...styles.statusBtn,
                                      backgroundColor: isActive ? (s === 'UP' ? '#DCFCE7' : '#FEE2E2') : '#FFFFFF',
                                      color: isActive ? (s === 'UP' ? '#15803D' : '#DC2626') : (isTarget ? (s === 'UP' ? '#15803D' : '#DC2626') : '#D0D0D0'),
                                      borderColor: isActive ? (s === 'UP' ? '#BBF7D0' : '#FECACA') : (isTarget ? (s === 'UP' ? '#BBF7D0' : '#FECACA') : '#E5E5E5'),
                                      cursor: isTarget && togglingSiteId !== site.id ? 'pointer' : 'not-allowed',
                                      opacity: isActive || isTarget ? 1 : 0.4,
                                      fontWeight: isActive ? 700 : 600,
                                    }}
                                  >
                                    {s}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )) : (
        <div style={styles.pageContent}>
          <div style={styles.tableCard}>
            <div style={styles.toolbar}>
              <div style={styles.toolbarLeft}>
                <h2 style={styles.tableTitle}>Listes des reclamations</h2>
              </div>

              <div style={styles.toolbarActions}>
                <button onClick={fetchTickets} style={styles.btnFilter}>
                  <IconRefresh style={{ marginRight: '6px' }} /> Actualiser
                </button>
                <button onClick={() => setShowFilters(!showFilters)} style={styles.btnFilter}>
                  <IconFilter style={{ marginRight: '6px' }} /> Filtrer
                </button>
                <div style={styles.searchWrapper}>
                  <IconSearch style={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                  />
                </div>
              </div>
            </div>

            {showFilters && (
              <div style={styles.filterArea}>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  style={styles.filterSelect}
                />
                <select
                  value={filterSiteId}
                  onChange={(e) => setFilterSiteId(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="">Tous les sites</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.nom}</option>
                  ))}
                </select>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="">Toutes priorites</option>
                  <option value="critique">Critique</option>
                  <option value="haute">Haute</option>
                  <option value="normale">Normale</option>
                  <option value="basse">Basse</option>
                </select>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="">Tous types</option>
                  <option value="particulier">Particulier</option>
                  <option value="entreprise">Entreprise</option>
                </select>
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>TYPE</th>
                    <th style={styles.th}>SITE</th>
                    <th style={styles.th}>DESCRIPTION</th>
                    <th style={styles.th}>PRIORITE</th>
                    <th style={styles.th}>DATE</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" style={styles.emptyCell}>Chargement des donnees...</td></tr>
                  ) : filteredTickets.length === 0 ? (
                    <tr><td colSpan="7" style={styles.emptyCell}>Aucune reclamation trouvee.</td></tr>
                  ) : filteredTickets.map((ticket) => {
                    const prio = COLORS.priorities[ticket.priorite?.toUpperCase()] || COLORS.priorities.NORMALE;
                    const typ = COLORS.types[ticket.type_client?.toUpperCase()] || COLORS.types.PARTICULIER;

                    return (
                      <tr
                        key={ticket.id}
                        style={styles.tr}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                      >
                        <td style={{ ...styles.td, borderLeft: `4px solid ${prio.side}`, fontWeight: 600, cursor: 'pointer' }}
                          onClick={() => setSelectedTicket(ticket)}>
                          {ticket.numero_ticket}
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badgeBase, backgroundColor: typ.bg, color: typ.text, border: `1px solid ${typ.border}`, fontSize: '10px' }}>
                            {ticket.type_client?.toUpperCase()}
                          </span>
                        </td>
                        <td style={styles.td}>{ticket.site_display}</td>
                        <td style={{ ...styles.td, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ticket.description || '-'}
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badgeBase, backgroundColor: prio.bg, color: prio.text }}>
                            {ticket.priorite?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ ...styles.td, color: COLORS.textMuted }}>{formatDateFr(ticket.created_at)}</td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <div style={styles.statusActions}>
                            {ALL_STATUSES.map((s) => {
                              const sk = getStatutKey(s);
                              const sc = COLORS.status[sk] || COLORS.status.OUVERT;
                              const isCurrent = ticket.statut === s;
                              const forward = getForwardStatuses(ticket.statut);
                              const canGo = forward.includes(s);
                              return (
                                <button
                                  key={s}
                                  disabled={!canGo || updatingId === ticket.id}
                                  onClick={(e) => { e.stopPropagation(); handleStatusChange(ticket.id, s, ticket.statut); }}
                                  style={{
                                    ...styles.statusBtn,
                                    backgroundColor: isCurrent ? sc.bg : '#FFFFFF',
                                    color: isCurrent ? '#FFFFFF' : (canGo ? sc.text : '#D0D0D0'),
                                    borderColor: isCurrent ? sc.bg : (canGo ? sc.dot : '#E5E5E5'),
                                    cursor: canGo && updatingId !== ticket.id ? 'pointer' : 'not-allowed',
                                    opacity: canGo || isCurrent ? 1 : 0.4,
                                    fontWeight: isCurrent ? 700 : 600,
                                  }}
                                >
                                  {ALL_LABELS[s]}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedTicket && (
        <div style={styles.overlay} onClick={() => setSelectedTicket(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Ticket {selectedTicket.numero_ticket}</h2>
              <button style={styles.modalClose} onClick={() => setSelectedTicket(null)}><IconX /></button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.modalGrid}>
                <div style={styles.modalSection}>
                  <h3 style={styles.modalSectionTitle}>Client</h3>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Nom complet</span>
                    <span style={styles.modalValue}>{selectedTicket.nom_complet_client || '-'}</span>
                  </div>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Telephone</span>
                    <span style={styles.modalValue}>{selectedTicket.telephone_client || '-'}</span>
                  </div>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Email</span>
                    <span style={styles.modalValue}>{selectedTicket.email_client || '-'}</span>
                  </div>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Type</span>
                    <span style={styles.modalValue}>{selectedTicket.type_client || '-'}</span>
                  </div>
                </div>

                <div style={styles.modalSection}>
                  <h3 style={styles.modalSectionTitle}>Ticket</h3>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Statut</span>
                    <span style={styles.modalValue}>
                      <span style={{ ...styles.badgeBase, ...COLORS.status[getStatutKey(selectedTicket.statut)] || COLORS.status.FERME }}>
                        {getStatutKey(selectedTicket.statut)}
                      </span>
                    </span>
                  </div>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Priorite</span>
                    <span style={styles.modalValue}>
                      <span style={{ ...styles.badgeBase, ...(COLORS.priorities[selectedTicket.priorite?.toUpperCase()] || COLORS.priorities.NORMALE) }}>
                        {selectedTicket.priorite?.toUpperCase()}
                      </span>
                    </span>
                  </div>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Site concerne</span>
                    <span style={styles.modalValue}>{selectedTicket.site_display || '-'}</span>
                  </div>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Cree par</span>
                    <span style={styles.modalValue}>{selectedTicket.cree_par?.nom_user || '-'}</span>
                  </div>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Assigne a</span>
                    <span style={styles.modalValue}>{selectedTicket.assigne_a_display || '-'}</span>
                  </div>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Date creation</span>
                    <span style={styles.modalValue}>{formatDateTimeFr(selectedTicket.created_at)}</span>
                  </div>
                  {selectedTicket.resolu_le && (
                    <div style={styles.modalField}>
                      <span style={styles.modalLabel}>Resolu le</span>
                      <span style={styles.modalValue}>{formatDateTimeFr(selectedTicket.resolu_le)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>Mots-cles saisis</h3>
                <p style={styles.modalText}>{selectedTicket.mots_cles_ia || 'Aucun mot-cle saisi.'}</p>
              </div>

              {selectedTicket.description && (
                <div style={styles.modalSection}>
                  <h3 style={styles.modalSectionTitle}>Description</h3>
                  <p style={styles.modalText}>{selectedTicket.description}</p>
                </div>
              )}

              {selectedTicket.commentaires && selectedTicket.commentaires.length > 0 && (
                <div style={styles.modalSection}>
                  <h3 style={styles.modalSectionTitle}>Commentaires ({selectedTicket.commentaires.length})</h3>
                  {selectedTicket.commentaires.map((c) => (
                    <div key={c.id} style={styles.comment}>
                      <strong>{c.auteur?.nom_user || 'Inconnu'}</strong>
                      <span style={{ color: COLORS.textMuted, fontSize: '11px', marginLeft: '12px' }}>{formatDateTimeFr(c.created_at)}</span>
                      <p style={{ margin: '4px 0 0', fontSize: '13px' }}>{c.contenu}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <div style={styles.statusActions}>
                {ALL_STATUSES.map((s) => {
                  const sk = getStatutKey(s);
                  const sc = COLORS.status[sk] || COLORS.status.OUVERT;
                  const isCurrent = selectedTicket.statut === s;
                  const forward = getForwardStatuses(selectedTicket.statut);
                  const canGo = forward.includes(s);
                  return (
                    <button
                      key={s}
                      disabled={!canGo || updatingId === selectedTicket.id}
                      onClick={() => handleStatusChange(selectedTicket.id, s, selectedTicket.statut)}
                      style={{
                        ...styles.statusBtn,
                        backgroundColor: isCurrent ? sc.bg : '#FFFFFF',
                        color: isCurrent ? '#FFFFFF' : (canGo ? sc.text : '#D0D0D0'),
                        borderColor: isCurrent ? sc.bg : (canGo ? sc.dot : '#E5E5E5'),
                        cursor: canGo && updatingId !== selectedTicket.id ? 'pointer' : 'not-allowed',
                        opacity: canGo || isCurrent ? 1 : 0.4,
                        fontWeight: isCurrent ? 700 : 600,
                      }}
                    >
                      {ALL_LABELS[s]}
                    </button>
                  );
                })}
              </div>
              <button style={styles.btnCancel} onClick={() => setSelectedTicket(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {selectedSite && (
        <div style={styles.overlay} onClick={() => setSelectedSite(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Site {selectedSite.codeSite}</h2>
              <button style={styles.modalClose} onClick={() => setSelectedSite(null)}><IconX /></button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.modalGrid}>
                <div style={styles.modalSection}>
                  <h3 style={styles.modalSectionTitle}>Site</h3>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Code</span>
                    <span style={styles.modalValue}>{selectedSite.codeSite}</span>
                  </div>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Nom</span>
                    <span style={styles.modalValue}>{selectedSite.nom}</span>
                  </div>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Wilaya</span>
                    <span style={styles.modalValue}>{selectedSite.wilaya}</span>
                  </div>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Commune</span>
                    <span style={styles.modalValue}>{selectedSite.commune}</span>
                  </div>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Adresse</span>
                    <span style={styles.modalValue}>{selectedSite.adresse || '-'}</span>
                  </div>
                </div>
                <div style={styles.modalSection}>
                  <h3 style={styles.modalSectionTitle}>Etat</h3>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Statut</span>
                    <span style={styles.modalValue}>
                      <span style={{
                        ...styles.badgeBase,
                        backgroundColor: selectedSite.statut === 'UP' ? '#DCFCE7' : '#FEE2E2',
                        color: selectedSite.statut === 'UP' ? '#15803D' : '#DC2626',
                      }}>
                        {selectedSite.statut}
                      </span>
                    </span>
                  </div>
                  {selectedSite.coordX && (
                    <div style={styles.modalField}>
                      <span style={styles.modalLabel}>Longitude</span>
                      <span style={styles.modalValue}>{selectedSite.coordX}</span>
                    </div>
                  )}
                  {selectedSite.coordY && (
                    <div style={styles.modalField}>
                      <span style={styles.modalLabel}>Latitude</span>
                      <span style={styles.modalValue}>{selectedSite.coordY}</span>
                    </div>
                  )}
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Derniere MAJ</span>
                    <span style={styles.modalValue}>{formatDateTimeFr(selectedSite.derniere_maj)}</span>
                  </div>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Cree le</span>
                    <span style={styles.modalValue}>{formatDateTimeFr(selectedSite.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <div style={styles.statusActions}>
                {['UP', 'DOWN'].map((s) => {
                  const isActive = selectedSite.statut === s;
                  const isTarget = selectedSite.statut !== s;
                  return (
                    <button
                      key={s}
                      disabled={!isTarget || togglingSiteId === selectedSite.id}
                      onClick={() => handleSiteToggle(selectedSite.id, selectedSite.statut)}
                      style={{
                        ...styles.statusBtn,
                        backgroundColor: isActive ? (s === 'UP' ? '#DCFCE7' : '#FEE2E2') : '#FFFFFF',
                        color: isActive ? (s === 'UP' ? '#15803D' : '#DC2626') : (isTarget ? (s === 'UP' ? '#15803D' : '#DC2626') : '#D0D0D0'),
                        borderColor: isActive ? (s === 'UP' ? '#BBF7D0' : '#FECACA') : (isTarget ? (s === 'UP' ? '#BBF7D0' : '#FECACA') : '#E5E5E5'),
                        cursor: isTarget && togglingSiteId !== selectedSite.id ? 'pointer' : 'not-allowed',
                        opacity: isActive || isTarget ? 1 : 0.4,
                        fontWeight: isActive ? 700 : 600,
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {selectedSite.statut !== 'DOWN' && (
                  <button
                    disabled={togglingSiteId === selectedSite.id}
                    onClick={() => handleArchiverSite(selectedSite.id)}
                    style={styles.btnDanger}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}><path d="M21 4H3M8 2v2M16 2v2M4 7l1 12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2l1-12M10 11v6M14 11v6" /></svg>
                    Archiver
                  </button>
                )}
                <button style={styles.btnCancel} onClick={() => setSelectedSite(null)}>Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}

const styles = {
  appLayout: { display: 'flex', minHeight: '100vh', backgroundColor: COLORS.mainBg, fontFamily: "'Inter', system-ui, sans-serif", width: '100%' },
  sidebar: { width: '193px', backgroundColor: COLORS.sidebarBg, color: '#94A3B8', display: 'flex', flexDirection: 'column', padding: '0', flexShrink: 0 },
  brandZone: { height: '82px', display: 'flex', alignItems: 'center', gap: '13px', padding: '0 17px', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  brandLogo: { width: '34px', height: 'auto', objectFit: 'contain' },
  brandName: { color: '#FFFFFF', fontWeight: 700, fontSize: '16px' },
  brandRole: { marginTop: '6px', fontSize: '10px', color: '#9492a0' },
  menuSection: { display: 'flex', flexDirection: 'column', gap: '5px', padding: '26px 12px 0' },
  sectionLabel: { margin: '0 5px 10px', fontSize: '6px', fontWeight: 700, color: '#4e4b5c', letterSpacing: '1px' },
  menuItem: { display: 'flex', alignItems: 'center', background: 'transparent', border: 'none', color: '#92909e', padding: '0 10px', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', fontSize: '13px', width: '100%', height: '34px', textDecoration: 'none', outline: 'none' },
  menuItemActive: { background: 'linear-gradient(90deg, #9a0c2d, #710820)', color: '#FFFFFF', fontWeight: 600, position: 'relative' },
  mainContent: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },
  topHeader: { position: 'sticky', top: 0, height: '51px', display: 'flex', alignItems: 'center', padding: '0 27px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #dadde3', boxShadow: '0 1px 2px rgba(20,25,35,0.08)', zIndex: 10 },
  pageTitle: { margin: 0, fontSize: '14px', fontWeight: 700, color: '#171a21' },
  pageContent: { padding: '24px 21px 40px', flex: 1 },
  statsRow: { display: 'flex', gap: '16px', marginBottom: '20px' },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '16px 20px', borderLeft: '4px solid', border: '1px solid #d6dae1', borderLeftWidth: '4px', display: 'flex', flexDirection: 'column', gap: '4px' },
  statNumber: { fontSize: '24px', fontWeight: 700, color: '#171a21' },
  statLabel: { fontSize: '11px', fontWeight: 600, color: '#818898', textTransform: 'uppercase', letterSpacing: '0.3px' },
  backNav: { display: 'flex', alignItems: 'center', fontSize: '16px', color: COLORS.textDark, cursor: 'pointer', marginBottom: '4px' },
  breadcrumb: { fontSize: '12px', color: COLORS.textMuted, fontWeight: 500 },
  tableCard: { backgroundColor: COLORS.cardBg, borderRadius: '7px', border: '1px solid #d6dae1', display: 'flex', flexDirection: 'column', width: '100%', boxShadow: '0 1px 4px rgba(25,31,42,0.16)' },
  formHeader: { padding: '16px 20px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center' },
  formBody: { padding: '24px 30px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', marginBottom: '12px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '11px', fontWeight: 700, color: COLORS.textDark },
  input: { padding: '10px 14px', borderRadius: '6px', border: `1px solid ${COLORS.border}`, fontSize: '13px', outline: 'none' },
  select: { padding: '10px 14px', borderRadius: '6px', border: `1px solid ${COLORS.border}`, fontSize: '13px', backgroundColor: '#FFFFFF', outline: 'none' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '30px' },
  btnSubmit: { display: 'flex', alignItems: 'center', backgroundColor: COLORS.djezzyRed, color: '#FFFFFF', border: 'none', padding: '10px 24px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' },
  toolbar: { minHeight: '44px', padding: '0 18px', display: 'flex', alignItems: 'center', borderBottom: `1px solid ${COLORS.border}` },
  toolbarLeft: { display: 'flex', alignItems: 'center', gap: '11px' },
  tableTitle: { margin: 0, fontSize: '11px', fontWeight: 700, color: '#181c24' },
  toolbarActions: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '9px' },
  btnFilter: { display: 'flex', alignItems: 'center', backgroundColor: '#FFFFFF', border: '1px solid #cbd0d9', padding: '0 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#3a404a', height: '28px' },
  searchWrapper: { position: 'relative', display: 'flex', alignItems: 'center', width: '188px', height: '28px' },
  searchIcon: { position: 'absolute', left: '10px', color: '#7b8498' },
  searchInput: { width: '100%', height: '100%', padding: '0 10px 0 31px', borderRadius: '6px', border: '1px solid #ced4de', backgroundColor: '#f8f9fc', fontSize: '9px', outline: 'none', color: '#242a34' },
  filterArea: { display: 'flex', gap: '10px', padding: '12px 18px', backgroundColor: '#fafbfc', borderBottom: `1px solid ${COLORS.border}`, flexWrap: 'wrap' },
  filterSelect: { minWidth: '150px', height: '31px', padding: '0 10px', color: '#4e5561', backgroundColor: '#FFFFFF', border: '1px solid #cfd4dd', borderRadius: '5px', outline: 'none' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', minWidth: '1100px' },
  thRow: { backgroundColor: '#f3f6f9' },
  th: { height: '30px', padding: '0 14px', fontWeight: 500, color: '#7d8595', fontSize: '7px', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #cfd4dc' },
  tr: { borderBottom: '1px solid #e0e4ea' },
  td: { height: '44px', padding: '0 14px', color: COLORS.textDark, verticalAlign: 'middle', whiteSpace: 'nowrap' },
  emptyCell: { textAlign: 'center', padding: '30px', color: COLORS.textMuted },
  badgeBase: { padding: '4px 10px', borderRadius: '4px', fontWeight: 700, fontSize: '10px', display: 'inline-flex', alignItems: 'center' },
  statusActions: { display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' },
  statusBtn: { display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: '9px', border: '1px solid', fontSize: '9px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },

  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#FFFFFF', borderRadius: '12px', width: '700px', maxWidth: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${COLORS.border}` },
  modalTitle: { margin: 0, fontSize: '18px', fontWeight: 700, color: COLORS.textDark },
  modalClose: { background: 'none', border: 'none', cursor: 'pointer', color: COLORS.textMuted, padding: '4px' },
  modalBody: { padding: '24px', overflowY: 'auto', flex: 1 },
  modalGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  modalSection: { marginBottom: '20px' },
  modalSectionTitle: { fontSize: '12px', fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', margin: '0 0 12px 0', letterSpacing: '0.5px' },
  modalField: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${COLORS.border}` },
  modalLabel: { fontSize: '12px', color: COLORS.textMuted, fontWeight: 500 },
  modalValue: { fontSize: '13px', color: COLORS.textDark, fontWeight: 600 },
  modalText: { fontSize: '13px', color: COLORS.textDark, lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' },
  comment: { padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', marginBottom: '8px' },
  modalFooter: { padding: '16px 24px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  btnCancel: { backgroundColor: '#FFFFFF', border: `1px solid ${COLORS.border}`, padding: '10px 24px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
  btnNew: { display: 'flex', alignItems: 'center', backgroundColor: COLORS.djezzyRed, color: '#FFFFFF', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' },
  btnDanger: { display: 'flex', alignItems: 'center', backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', padding: '10px 24px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
};
