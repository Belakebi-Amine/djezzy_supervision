/*
 * CallCenter.jsx
 * Main page for the Call Center agents at Djezzy.
 * This component handles viewing, creating, filtering, and archiving
 * customer complaint tickets (reclamations). It provides two main views:
 *   - Active tickets (non-traitees) and resolved tickets (traitees)
 *   - A form to create new tickets
 * It also displays a modal with full ticket details when a row is clicked.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { spawnParticles } from '../hooks/useAnimations';
import { useNotification } from '../context/NotificationContext';
import { getTickets, createTicket, getSites, getTokenRole, getKeywords } from '../api/tickets';
import logoDjezzy from '../assets/Djezzy_Logo.png';

/* Color palette and badge styles used across the UI */
const COLORS = {
  sidebarBg: 'var(--bg-sidebar)',
  sidebarActive: '#E8401A',
  mainBg: 'var(--bg-main)',
  cardBg: 'var(--bg-card)',
  textDark: 'var(--text-primary)',
  textMuted: 'var(--text-muted3)',
  border: 'var(--border-light)',
  djezzyRed: '#E8401A',
  djezzyOrange: '#FF6B3D',

  /* Badge colors for client types */
  types: {
    PARTICULIER: { bg: '#E2E8F0', text: '#475569', border: '#CBD5E1' },
    ENTREPRISE: { bg: '#475569', text: '#FFFFFF', border: '#334155' },
  },
  /* Badge colors for priority levels */
  priorities: {
    BASSE: { bg: '#E0F2FE', text: '#0284C7', side: '#0284C7' },
    NORMALE: { bg: '#DCFCE7', text: '#15803D', side: '#15803D' },
    HAUTE: { bg: '#FEF3C7', text: '#D97706', side: '#D97706' },
    CRITIQUE: { bg: '#FEE2E2', text: '#DC2626', side: '#DC2626' },
  },
  /* Badge colors for ticket statuses */
  status: {
    OUVERT: { bg: '#E0F2FE', text: '#0284C7', dot: '#0284C7' },
    'EN COURS': { bg: '#FEF3C7', text: '#D97706', dot: '#D97706' },
    RESOLU: { bg: '#DCFCE7', text: '#15803D', dot: '#15803D' },
    FERME: { bg: '#FEE2E2', text: '#DC2626', dot: '#DC2626' },
  },
};

/* French month abbreviations for date formatting */
const MOIS_FR = ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOU', 'SEP', 'OCT', 'NOV', 'DEC'];

const now = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

/* Format an ISO date string to a short French date like "15 JUIN" */
const formatDateFr = (isoString) => {
  if (!isoString) return '\u2014';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '\u2014';
  return `${d.getDate()} ${MOIS_FR[d.getMonth()]}`;
};

/* Format an ISO date string to a longer French date with time, e.g. "15 JUIN 2025 14:30" */
const formatDateTimeFr = (isoString) => {
  if (!isoString) return '\u2014';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '\u2014';
  return `${d.getDate()} ${MOIS_FR[d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/* Default props shared by all inline SVG icons */
const iconProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

/* Small SVG icon components used in the sidebar, buttons, and modal */
const IconTicket = (p) => (
  <svg {...iconProps} {...p}><path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 6v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-6V7Z" /><path d="M10 6v2M10 16v2" /></svg>
);
const IconArchive = (p) => (
  <svg {...iconProps} {...p}><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" /><path d="M10 13h4" /></svg>
);
const IconUser = (p) => (
  <svg {...iconProps} {...p}><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>
);
const IconLogout = (p) => (
  <svg {...iconProps} {...p}><path d="M15 16l4-4-4-4" /><path d="M19 12H8" /><path d="M12 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" /></svg>
);
const IconPin = (p) => (
  <svg {...iconProps} {...p}><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.3" /></svg>
);
const IconSearch = (p) => (
  <svg {...iconProps} {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
);
const IconPlus = (p) => (
  <svg {...iconProps} {...p}><path d="M12 5v14M5 12h14" /></svg>
);
const IconCheck = (p) => (
  <svg {...iconProps} {...p}><path d="M4 12l5 5 11-11" /></svg>
);
const IconX = (p) => (
  <svg {...iconProps} {...p}><path d="M18 6L6 18M6 6l12 12" /></svg>
);


/* Default empty state for the new-ticket form */
const INITIAL_FORM = {
  nom_client: '', telephone: '', email: '',
  type_client: 'particulier',
  site_id: '', priorite: 'normale',
  mots_cles_ia: '',
};

export default function CallCenter() {
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  // Role guard
  const tokenRole = getTokenRole();
  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAuthChecked(true), 100); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (!authChecked) return;
    if (!tokenRole) { navigate('/login', { replace: true }); return; }
    if (tokenRole !== 'AGENT_CALL_CENTER') {
      const dashMap = { ADMIN: '/admin-dashboard', INGENIEUR_RESEAUX: '/engineer-dashboard', SUPERVISEUR: '/supervisor-dashboard' };
      navigate(dashMap[tokenRole] || '/login', { replace: true });
    }
  }, [authChecked, tokenRole, navigate]);

  /* --- View / UI state --- */
  // currentView controls which panel is shown: 'non-traites', 'traites', or 'nouveau-ticket'
  const [currentView, setCurrentView] = useState('non-traites');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  /* --- Filter state --- */
  const [filterDate, setFilterDate] = useState('');
  const [filterSiteId, setFilterSiteId] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');

  /* --- New ticket form state --- */
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [sites, setSites] = useState([]);
  const [keywordsData, setKeywordsData] = useState({});
  const [selectedKeywords, setSelectedKeywords] = useState([]);

  /* --- Modal / tooltip helpers --- */
  // expandedField tracks which user info card (cree_par / assigne_a) is expanded in the modal
  const [expandedField, setExpandedField] = useState(null);
  // hoveredUser stores the user object + screen position for the floating tooltip
  const [hoveredUser, setHoveredUser] = useState(null);

  /* Load the list of network sites once on mount (used in the form and filters) */
  useEffect(() => {
    getSites().then(setSites).catch(() => setSites([]));
    getKeywords().then(setKeywordsData).catch(() => setKeywordsData({}));
  }, []);

  /* Calculate priority from selected keywords */
  const calcScore = (keywords) => {
    return keywords.reduce((sum, key) => {
      for (const cat of Object.values(keywordsData)) {
        const found = cat.keywords.find(k => k.key === key);
        if (found) return sum + found.score;
      }
      return sum;
    }, 0);
  };

  const calcPriorite = (score) => {
    if (score >= 100) return 'critique';
    if (score >= 60) return 'haute';
    if (score >= 30) return 'normale';
    return 'basse';
  };

  const prioriteColor = (p) => {
    const colors = { basse: '#10B981', normale: '#2563EB', haute: '#F59E0B', critique: '#DC2626' };
    return colors[p] || '#64748B';
  };

  const toggleKeyword = (key) => {
    setSelectedKeywords(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      setFormData(f => ({ ...f, mots_cles_ia: next.join(', ') }));
      return next;
    });
  };

  /* Fetch tickets from the API based on the current view tab */
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      // Map view name to backend status filter:
      // 'non-traites' -> open/in-progress/closed; 'traites' -> resolved
      const statut = currentView === 'non-traites' ? 'ouvert,ferme' : 'resolu';
      const data = await getTickets(statut);
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      addNotification('Impossible de charger les réclamations.', 'error');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [currentView, addNotification]);

  /* Re-fetch tickets whenever the user switches between the two list views */
  useEffect(() => {
    if (currentView !== 'nouveau-ticket') {
      fetchTickets();
    }
  }, [currentView, fetchTickets]);

  /* Silent background refresh (no loading spinner) */
  const refreshTickets = useCallback(async () => {
    try {
      const statut = currentView === 'non-traites' ? 'ouvert,ferme' : 'resolu';
      const data = await getTickets(statut);
      if (Array.isArray(data)) setTickets(data);
    } catch {}
  }, [currentView]);

  // ─── Auto-refresh every 5 seconds (transparent) ───
  useEffect(() => {
    const interval = setInterval(() => {
      refreshTickets();
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshTickets]);

  /* Submit the new ticket form to the API */
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createTicket({
        nom_client: formData.nom_client,
        telephone_client: formData.telephone,
        email_client: formData.email,
        type_client: formData.type_client,
        site_id: formData.site_id ? Number(formData.site_id) : null,
        mots_cles_ia: formData.mots_cles_ia,
      });
      // Reset form and go back to the active tickets list
      setFormData(INITIAL_FORM);
      setSelectedKeywords([]);
      setCurrentView('non-traites');
      addNotification('Réclamation créée avec succès');
    } catch (err) {
      addNotification('Erreur lors de la création de la réclamation.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /* Clear auth tokens and redirect to login */
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  /* Generic handler for all form input changes */
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  /* Apply all active filters + search term to the tickets list */
  const filteredTickets = tickets.filter((t) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      t.nom_complet_client?.toLowerCase().includes(term) ||
      t.numero_ticket?.toLowerCase().includes(term) ||
      t.site_display?.toLowerCase().includes(term);
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
  }).sort((a, b) => {
    const typeOrder = { entreprise: 0, particulier: 1 };
    const ta = typeOrder[(a.type_client || '').toLowerCase()] ?? 2;
    const tb = typeOrder[(b.type_client || '').toLowerCase()] ?? 2;
    return ta - tb;
  });

  // Normalize the backend statut value to uppercase with spaces for display and lookup
  const getStatutKey = (statut) => statut?.replace('_', ' ').toUpperCase();

  return (
    <div style={styles.appLayout}>
      {/* ========== LEFT SIDEBAR ========== */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <img src={logoDjezzy} alt="" style={styles.brandLogo} />
          <div><div style={styles.brandName}>Djezzy Hub</div><div style={styles.brandRole}>Agent Call Center</div></div>
        </div>
        <div style={styles.menu}>
          <span style={styles.sectionLabel}>PRINCIPAL</span>
          <button onClick={(e) => { spawnParticles(e.clientX, e.clientY, 4); setCurrentView('non-traites'); }}
            style={{ ...styles.navItem, ...(currentView === 'non-traites' ? styles.navItemActive : {}) }}>
            <IconTicket /> Réclamations Non-Traitées
          </button>
          <button onClick={(e) => { spawnParticles(e.clientX, e.clientY, 4); setCurrentView('traites'); }}
            style={{ ...styles.navItem, ...(currentView === 'traites' ? styles.navItemActive : {}) }}>
            <IconArchive /> Réclamations Traitées
          </button>
        </div>
      </aside>

      {/* ========== MAIN CONTENT AREA ========== */}
      <div style={{ ...styles.mainContent, backgroundColor: COLORS.mainBg }}>
        {/* Top header with page title or back navigation */}
        <header style={styles.topHeader}>
          <h1 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
            {currentView === 'nouveau-ticket' ? 'Nouvelle Réclamation' : currentView === 'traites' ? 'Archives — Réclamations Traitées' : 'Réclamations Non Traitées'}
          </h1>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted2)', fontWeight: 500, padding: '4px 10px', background: 'var(--bg-toolbar)', borderRadius: 4 }}>{now()}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8, paddingLeft: 12, borderLeft: '1px solid var(--border-color)' }}>
              <button onClick={() => navigate('/profile')} title="Profil" style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FEE2E2', border: 'none', cursor: 'pointer', color: '#E8401A' }}><IconUser style={{ width: 15, height: 15 }} /></button>
              <button onClick={handleLogout} title="Déconnexion" style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FEE2E2', border: 'none', cursor: 'pointer', color: '#E8401A' }}><IconLogout style={{ width: 15, height: 15 }} /></button>
            </div>
          </div>
        </header>

        <div style={styles.pageContent}>
        {currentView === 'nouveau-ticket' ? (
          /* ========== NEW TICKET FORM ========== */
          <div style={styles.tableCard}>
            <div style={styles.formHeader}>
              <IconPin style={{ color: COLORS.djezzyRed, marginRight: '10px' }} />
              <span style={{ fontWeight: 700, fontSize: '14px' }}>Créer une nouvelle réclamation</span>
            </div>

            <form onSubmit={handleCreateTicket} style={styles.formBody}>
              {/* Client information section */}
              <div style={styles.formSectionTitle}>Informations Client</div>

              <div style={styles.formGrid}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Nom Client</label>
                  <input type="text" name="nom_client" value={formData.nom_client} onChange={handleInputChange} placeholder="Nom et prenom" pattern="[a-zA-Z\sàâéèêëïîôùûüÿçœæ\-]+" style={styles.input} required title="Le nom ne doit contenir que des lettres" />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Telephone</label>
                  <input type="tel" name="telephone" value={formData.telephone} onChange={handleInputChange} placeholder="0X XX XX XX XX" pattern="0\d{9}" maxLength="10" style={styles.input} required title="Le numero doit commencer par 0 et contenir 10 chiffres" />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="client@gmail.com" style={styles.input} />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Type Client</label>
                  <select name="type_client" value={formData.type_client} onChange={handleInputChange} style={styles.select}>
                    <option value="particulier">PARTICULIER</option>
                    <option value="entreprise">ENTREPRISE</option>
                  </select>
                </div>
              </div>

              {/* Complaint / reclamation details section */}
              <div style={{ ...styles.formSectionTitle, marginTop: '24px' }}>Reclamation</div>

              <div style={styles.formGrid}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Code Site</label>
                  <select name="site_id" value={formData.site_id} onChange={handleInputChange} style={styles.select} required>
                    <option value="">Selectionner un site...</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>{site.nom}</option>
                    ))}
                  </select>
                </div>
                {/* Auto-calculated priority display */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Priorité (auto)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 8, border: '1px solid var(--border-color)', minHeight: 38 }}>
                    {selectedKeywords.length > 0 ? (
                      <>
                        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: prioriteColor(calcPriorite(calcScore(selectedKeywords))) }} />
                        <span style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', color: prioriteColor(calcPriorite(calcScore(selectedKeywords))) }}>
                          {calcPriorite(calcScore(selectedKeywords))}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted3)', marginLeft: 4 }}>
                          (score: {calcScore(selectedKeywords)})
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-muted3)' }}>Selectionnez des mots-clés</span>
                    )}
                  </div>
                </div>
                {/* Keywords chip selector */}
                <div style={{ ...styles.inputGroup, gridColumn: '1 / -1' }}>
                  <label style={styles.label}>Mots Clés IA</label>
                  {Object.keys(keywordsData).length === 0 ? (
                    <div style={{ fontSize: 11, color: 'var(--text-muted3)' }}>Chargement des mots-clés...</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 240, overflowY: 'auto', padding: '4px 0' }}>
                      {Object.entries(keywordsData).map(([catKey, cat]) => (
                        <div key={catKey}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{cat.label}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {cat.keywords.map((kw) => {
                              const isSelected = selectedKeywords.includes(kw.key);
                              const scoreColor = kw.score >= 60 ? '#DC2626' : kw.score >= 30 ? '#F59E0B' : kw.score >= 15 ? '#2563EB' : '#10B981';
                              return (
                                <button key={kw.key} type="button" onClick={() => toggleKeyword(kw.key)}
                                  style={{
                                    fontSize: 10, padding: '4px 10px', borderRadius: 14, cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit',
                                    border: `1px solid ${isSelected ? scoreColor : 'var(--border-color)'}`,
                                    background: isSelected ? scoreColor : 'var(--bg-hover)',
                                    color: isSelected ? '#fff' : 'var(--text-muted3)',
                                    transition: 'all 0.15s',
                                    display: 'flex', alignItems: 'center', gap: 4,
                                  }}>
                                  {kw.label}
                                  <span style={{ fontSize: 8, opacity: 0.8, fontWeight: 700 }}>×{kw.score}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: COLORS.textMuted, marginTop: '4px' }}>
                    Cliquez sur les mots-clés. La priorité est calculée automatiquement.
                  </div>
                </div>
              </div>

              {/* Form action buttons */}
              <div style={styles.formActions}>
                <button type="button" onClick={() => setCurrentView('non-traites')} style={styles.btnCancel}>Annuler</button>
                <button type="submit" disabled={submitting} style={styles.btnSubmit}>
                  <IconCheck style={{ marginRight: '6px' }} /> {submitting ? 'Creation...' : 'Creer'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ========== TICKETS TABLE VIEW ========== */
          <div style={styles.tableCard}>
            {/* Toolbar: title, refresh, filters, search, and new ticket button */}
            <div style={styles.toolbar}>
              <div style={styles.toolbarLeft}>
                <h2 style={styles.tableTitle}>
                  {currentView === 'non-traites' ? 'Réclamations en cours' : 'Réclamations résolues'}
                </h2>
              </div>

              <div style={styles.toolbarActions}>
                <button onClick={() => setShowFilters(!showFilters)} style={styles.btnFilter}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ marginRight: '6px' }}><path d="M4 5h16l-6 7v6l-4 1v-7L4 5Z" /></svg> Filtrer
                </button>
                {/* Search input with magnifying glass icon */}
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
                <button onClick={() => setCurrentView('nouveau-ticket')} style={styles.btnNew}>
                  <IconPlus style={{ marginRight: '6px' }} /> Nouvelle Réclamation
                </button>
              </div>
            </div>

            {/* Collapsible filter bar with date, site, priority, and type dropdowns */}
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

            {/* Tickets data table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={{ ...styles.th, paddingLeft: '20px' }}>N° Ticket</th>
                    <th style={styles.th}>Nom Client</th>
                    <th style={styles.th}>Type Client</th>
                    <th style={styles.th}>Code Site</th>
                    <th style={styles.th}>Priorité</th>
                    <th style={styles.th}>Statut</th>
                    <th style={styles.th}>Date Création</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" style={styles.emptyCell}>Chargement des donnees...</td></tr>
                  ) : filteredTickets.length === 0 ? (
                    <tr><td colSpan="7" style={styles.emptyCell}>Aucune réclamation trouvée.</td></tr>
                  ) : filteredTickets.map((ticket) => {
                    // Resolve color config for priority, status, and client type badges
                    const prio = COLORS.priorities[ticket.priorite?.toUpperCase()] || COLORS.priorities.NORMALE;
                    const statutKey = getStatutKey(ticket.statut);
                    const stat = COLORS.status[statutKey] || COLORS.status.FERME;
                    const typ = COLORS.types[ticket.type_client?.toUpperCase()] || COLORS.types.PARTICULIER;

                    return (
                      <tr
                        key={ticket.id}
                        style={styles.tr}
                        onClick={() => setSelectedTicket(ticket)}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                      >
                        {/* Ticket number with a colored left border indicating priority */}
                        <td style={{ ...styles.td, borderLeft: `4px solid ${prio.side}`, paddingLeft: '16px', fontWeight: 600, cursor: 'pointer' }}>
                          {ticket.numero_ticket}
                        </td>
                        <td style={{ ...styles.td, fontWeight: 600, cursor: 'pointer' }}>{ticket.nom_complet_client}</td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badgeBase, backgroundColor: typ.bg, color: typ.text, border: `1px solid ${typ.border}`, fontSize: '10px' }}>
                            {ticket.type_client?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ ...styles.td, fontWeight: 600, cursor: 'pointer' }}>{ticket.site_display}</td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badgeBase, backgroundColor: prio.bg, color: prio.text }}>
                            {ticket.priorite?.toUpperCase()}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badgeBase, backgroundColor: stat.bg, color: stat.text }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: stat.dot, marginRight: '6px', display: 'inline-block' }} />
                            {statutKey}
                          </span>
                        </td>
                        <td style={{ ...styles.td, color: COLORS.textMuted, fontWeight: 600 }}>{formatDateFr(ticket.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* ========== TICKET DETAIL MODAL ========== */}
      {selectedTicket && (
        <div className="fade-in" style={styles.overlay} onClick={() => setSelectedTicket(null)}>
          <div className="scale-in" style={styles.modal} onClick={(e) => e.stopPropagation()}>
            {/* Modal header with ticket number and close button */}
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Réclamation {selectedTicket.numero_ticket}</h2>
              <button style={styles.modalClose} onClick={() => setSelectedTicket(null)}><IconX /></button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.modalGrid}>
                {/* Left column: client information */}
                <div style={styles.modalSection}>
                  <h3 style={styles.modalSectionTitle}>Client</h3>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Nom complet</span>
                    <span style={styles.modalValue}>{selectedTicket.nom_complet_client || '\u2014'}</span>
                  </div>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Telephone</span>
                    <span style={styles.modalValue}>{selectedTicket.telephone_client || '\u2014'}</span>
                  </div>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Email</span>
                    <span style={styles.modalValue}>{selectedTicket.email_client || '\u2014'}</span>
                  </div>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Type</span>
                    <span style={styles.modalValue}>{selectedTicket.type_client || '\u2014'}</span>
                  </div>
                </div>

                {/* Right column: ticket metadata */}
                <div style={styles.modalSection}>
                  <h3 style={styles.modalSectionTitle}>Réclamation</h3>
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
                    <span style={styles.modalValue}>{selectedTicket.site_display || '\u2014'}</span>
                  </div>

                  {/* Created-by user chip — clickable to expand details inline */}
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Cree par</span>
                    {selectedTicket.cree_par ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={styles.userChip}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; const r = e.currentTarget.getBoundingClientRect(); setHoveredUser({ user: selectedTicket.cree_par, rect: r }); }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; setHoveredUser(null); }}
                          onClick={() => setExpandedField(expandedField === 'cree_par' ? null : 'cree_par')}
                        >
                          {selectedTicket.cree_par.code_user}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted2)', marginTop: '2px', lineHeight: '1.3', textAlign: 'right' }}>
                          {selectedTicket.cree_par.nom_user || selectedTicket.cree_par.code_user}
                        </span>
                        {/* Expanded user detail card toggled on click */}
                        {expandedField === 'cree_par' && (
                          <div style={{ marginTop: '6px', padding: '8px 10px', backgroundColor: 'var(--bg-hover)', borderRadius: '6px', border: '1px solid var(--border-light)', fontSize: '11px', lineHeight: '1.7', width: '180px' }}>
                            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedTicket.cree_par.nom_user || selectedTicket.cree_par.code_user}</div>
                            <div style={{ color: 'var(--text-muted3)' }}>{selectedTicket.cree_par.code_user}</div>
                            <div style={{ color: 'var(--text-muted3)' }}>{selectedTicket.cree_par.email}</div>
                            <div style={{ color: 'var(--text-muted3)' }}>{selectedTicket.cree_par.role_user || selectedTicket.cree_par.role}</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={styles.modalValue}>{selectedTicket.cree_par?.code_user || '\u2014'}</span>
                    )}
                  </div>

                  {/* Assigned-to user chip — same expand/hover behavior */}
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Assigne a</span>
                    {selectedTicket.assigne_a ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={styles.userChip}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; const r = e.currentTarget.getBoundingClientRect(); setHoveredUser({ user: selectedTicket.assigne_a, rect: r }); }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; setHoveredUser(null); }}
                          onClick={() => setExpandedField(expandedField === 'assigne_a' ? null : 'assigne_a')}
                        >
                          {selectedTicket.assigne_a_display}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted2)', marginTop: '2px', lineHeight: '1.3', textAlign: 'right' }}>
                          {selectedTicket.assigne_a?.nom_user || selectedTicket.assigne_a_display}
                        </span>
                        {expandedField === 'assigne_a' && (
                          <div style={{ marginTop: '6px', padding: '8px 10px', backgroundColor: 'var(--bg-hover)', borderRadius: '6px', border: '1px solid var(--border-light)', fontSize: '11px', lineHeight: '1.7', width: '180px' }}>
                            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedTicket.assigne_a?.nom_user || selectedTicket.assigne_a_display}</div>
                            <div style={{ color: 'var(--text-muted3)' }}>{selectedTicket.assigne_a?.code_user}</div>
                            <div style={{ color: 'var(--text-muted3)' }}>{selectedTicket.assigne_a?.email}</div>
                            <div style={{ color: 'var(--text-muted3)' }}>{selectedTicket.assigne_a?.role_user || selectedTicket.assigne_a?.role}</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={styles.modalValue}>{selectedTicket.assigne_a_display || '\u2014'}</span>
                    )}
                  </div>

                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Date creation</span>
                    <span style={styles.modalValue}>{formatDateTimeFr(selectedTicket.created_at)}</span>
                  </div>
                  {/* Only show resolution date if the ticket has been resolved */}
                  {selectedTicket.resolu_le && (
                    <div style={styles.modalField}>
                      <span style={styles.modalLabel}>Resolu le</span>
                      <span style={styles.modalValue}>{formatDateTimeFr(selectedTicket.resolu_le)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Keywords entered by the call center agent */}
              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>Mots-cles saisis</h3>
                <p style={styles.modalText}>{selectedTicket.mots_cles_ia || 'Aucun mot-cle saisi.'}</p>
              </div>

              {/* AI-generated description (populated by the backend) */}
              {selectedTicket.description && (
                <div style={styles.modalSection}>
                  <h3 style={styles.modalSectionTitle}>Description generee par IA</h3>
                  <p style={styles.modalText}>{selectedTicket.description}</p>
                </div>
              )}

            </div>

            {/* Modal footer with modify and close buttons */}
            <div style={styles.modalFooter}>
              <button style={styles.btnCancel} onClick={() => setSelectedTicket(null)}>Fermer</button>
            </div>
          </div>

          {/* Floating tooltip showing full user info on hover (positioned below the chip) */}
          {hoveredUser && (
            <div style={{ ...styles.userTooltip, top: hoveredUser.rect.bottom + 6, left: hoveredUser.rect.left }}>
              <div style={styles.userTooltipArrow} />
              <div style={styles.userTooltipName}>{hoveredUser.user.nom_user || hoveredUser.user.code_user}</div>
              <div style={styles.userTooltipDetail}>{hoveredUser.user.code_user}</div>
              <div style={styles.userTooltipDetail}>{hoveredUser.user.email}</div>
              <div style={styles.userTooltipDetail}>{hoveredUser.user.role_user || hoveredUser.user.role}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * Inline styles object
 * All visual styling is kept here rather than in a separate CSS
 * file for simplicity in this single-page component.
 * ============================================================ */
const styles = {
  appLayout: { display: 'flex', minHeight: '100vh', backgroundColor: COLORS.mainBg, fontFamily: "'Inter', system-ui, sans-serif", width: '100%' },
  sidebar: { width: 193, backgroundColor: COLORS.sidebarBg, color: 'var(--text-sidebar)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' },
  brand: { height: 82, display: 'flex', alignItems: 'center', gap: 13, padding: '0 17px', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  brandLogo: { width: 34, height: 'auto', objectFit: 'contain' },
  brandName: { color: '#FFFFFF', fontWeight: 700, fontSize: 16 },
  brandRole: { marginTop: 6, fontSize: 10, color: 'var(--text-sidebar)' },
  menu: { display: 'flex', flexDirection: 'column', gap: 5, padding: '26px 12px 0' },
  sectionLabel: { margin: '0 5px 10px', fontSize: 6, fontWeight: 700, color: 'var(--text-muted3)', letterSpacing: '1px' },
  navItem: { display: 'flex', alignItems: 'center', gap: 9, background: 'transparent', border: 'none', color: 'var(--text-sidebar)', padding: '0 10px', borderRadius: 6, cursor: 'pointer', textAlign: 'left', fontSize: 13, width: '100%', height: 34, textDecoration: 'none', outline: 'none' },
  navItemActive: { background: 'linear-gradient(90deg, #9a0c2d, #710820)', color: '#FFFFFF', fontWeight: 600 },
  mainContent: { flex: 1, padding: 0, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },
  topHeader: { position: 'sticky', top: 0, height: 51, display: 'flex', alignItems: 'center', padding: '0 27px', background: COLORS.cardBg, borderBottom: `1px solid ${COLORS.border}`, boxShadow: 'var(--shadow-sm)', zIndex: 10 },
  pageContent: { flex: 1, padding: '20px 27px', overflowY: 'auto' },
  pageTitle: { margin: 0, fontSize: '22px', fontWeight: 700, color: COLORS.textDark },
  backNav: { display: 'flex', alignItems: 'center', fontSize: '16px', color: COLORS.textDark, cursor: 'pointer', marginBottom: '4px' },
  breadcrumb: { fontSize: '12px', color: COLORS.textMuted, fontWeight: 500 },
  tableCard: { backgroundColor: COLORS.cardBg, borderRadius: '8px', border: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', width: '100%' },
  toolbar: { padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${COLORS.border}` },
  toolbarLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  tableTitle: { margin: 0, fontSize: '14px', fontWeight: 700, color: COLORS.textDark },
  toolbarActions: { display: 'flex', alignItems: 'center', gap: '12px' },
  btnFilter: { display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-card)', border: `1px solid ${COLORS.border}`, padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: COLORS.textDark, transition: 'all 0.15s ease' },
  filterArea: { display: 'flex', gap: '10px', padding: '12px 18px', backgroundColor: 'var(--bg-main)', borderBottom: `1px solid ${COLORS.border}`, flexWrap: 'wrap' },
  filterSelect: { minWidth: '150px', height: '31px', padding: '0 10px', color: COLORS.textDark, backgroundColor: 'var(--bg-input)', border: `1px solid ${COLORS.border}`, borderRadius: '5px', outline: 'none', transition: 'border-color 0.15s ease' },
  searchWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: '10px', color: COLORS.textMuted },
  searchInput: { padding: '8px 12px 8px 32px', borderRadius: '6px', border: `1px solid ${COLORS.border}`, backgroundColor: 'var(--bg-input)', fontSize: '13px', width: '180px', outline: 'none', color: COLORS.textDark, transition: 'border-color 0.15s ease' },
  btnNew: { display: 'flex', alignItems: 'center', backgroundColor: COLORS.djezzyRed, color: '#FFFFFF', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s ease' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' },
  thRow: { backgroundColor: 'var(--bg-main)', borderBottom: `1px solid ${COLORS.border}` },
  th: { padding: '12px 14px', fontWeight: 700, color: 'var(--text-muted2)', fontSize: '10px', textTransform: 'uppercase' },
  tr: { borderBottom: `1px solid ${COLORS.border}`, transition: 'background 0.1s' },
  td: { padding: '14px', color: COLORS.textDark, verticalAlign: 'middle', whiteSpace: 'nowrap' },
  emptyCell: { textAlign: 'center', padding: '30px', color: COLORS.textMuted },
  badgeBase: { padding: '4px 10px', borderRadius: '4px', fontWeight: 700, fontSize: '10px', display: 'inline-flex', alignItems: 'center' },

  formHeader: { padding: '16px 20px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center' },
  formBody: { padding: '24px 30px' },
  formSectionTitle: { fontSize: '11px', fontWeight: 700, color: 'var(--text-muted2)', letterSpacing: '0.5px', marginBottom: '16px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', marginBottom: '12px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '11px', fontWeight: 700, color: COLORS.textDark },
  input: { padding: '10px 14px', borderRadius: '6px', border: `1px solid ${COLORS.border}`, fontSize: '13px', backgroundColor: 'var(--bg-input)', outline: 'none' },
  select: { padding: '10px 14px', borderRadius: '6px', border: `1px solid ${COLORS.border}`, fontSize: '13px', backgroundColor: 'var(--bg-input)', outline: 'none', color: COLORS.textDark },
  textarea: { padding: '10px 14px', borderRadius: '6px', border: `1px solid ${COLORS.border}`, fontSize: '13px', resize: 'none', backgroundColor: 'var(--bg-input)', outline: 'none' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '30px' },
  btnCancel: { backgroundColor: 'var(--bg-card)', border: `1px solid ${COLORS.border}`, padding: '10px 24px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: COLORS.textDark },
  btnSubmit: { display: 'flex', alignItems: 'center', backgroundColor: COLORS.djezzyRed, color: '#FFFFFF', border: 'none', padding: '10px 24px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' },
  btnDanger: { display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', padding: '10px 24px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', marginRight: 'auto' },

  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: 'var(--bg-card)', borderRadius: '12px', width: '850px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
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
  comment: { padding: '12px', backgroundColor: 'var(--bg-input)', borderRadius: '8px', marginBottom: '8px' },
  modalFooter: { padding: '16px 24px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'flex-end' },

  userChip: { fontSize: '13px', color: COLORS.djezzyRed, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: 'rgba(232,64,26,0.3)', position: 'relative' },

  userTooltip: { position: 'fixed', zIndex: 1200, backgroundColor: '#1E293B', color: '#F1F5F9', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', pointerEvents: 'none', whiteSpace: 'nowrap' },
  userTooltipArrow: { position: 'absolute', top: '-5px', left: '16px', width: '10px', height: '10px', backgroundColor: '#1E293B', transform: 'rotate(45deg)', borderRadius: '2px' },
  userTooltipName: { fontWeight: 700, fontSize: '13px', marginBottom: '4px' },
  userTooltipDetail: { color: 'var(--text-muted2)', fontSize: '11px', lineHeight: '1.6' },
};
