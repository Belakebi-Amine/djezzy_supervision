/*
 * EngineerDashboard.jsx
 *
 * Main dashboard page for network engineers at Djezzy.
 * Provides three main views:
 *   1. Reclamations – view and manage customer complaint tickets
 *   2. Sites Reseau – manage telecom network sites (status, creation, archiving)
 *   3. Cartographie – map view showing site locations and coverage
 *
 * Author: PFE Intern
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { spawnParticles } from '../hooks/useAnimations';
import { getTickets, updateTicket, getSites, getAllSites, updateSiteStatus, createSite, archiverSite, restoreSite, getTokenRole } from '../api/tickets';
import MapComponent from '../components/Map';
import logoDjezzy from '../assets/Djezzy_Logo.png';


// Theme colors used throughout the dashboard (mix of CSS variables and hardcoded values)
const COLORS = {
  sidebarBg: 'var(--bg-sidebar)',
  sidebarActive: '#850a27',
  mainBg: 'var(--bg-main)',
  cardBg: 'var(--bg-card)',
  textDark: 'var(--text-primary)',
  textMuted: 'var(--text-muted)',
  border: 'var(--border-color)',
  djezzyRed: '#e60023',

  // Badge color schemes for client types
  types: {
    PARTICULIER: { bg: '#E2E8F0', text: '#475569', border: '#CBD5E1' },
    ENTREPRISE: { bg: '#475569', text: '#FFFFFF', border: '#334155' },
  },
  // Badge color schemes for ticket priority levels
  priorities: {
    BASSE: { bg: '#E0F2FE', text: '#0284C7', side: '#0284C7' },
    NORMALE: { bg: '#DCFCE7', text: '#15803D', side: '#15803D' },
    HAUTE: { bg: '#FEF3C7', text: '#D97706', side: '#D97706' },
    CRITIQUE: { bg: '#FEE2E2', text: '#DC2626', side: '#DC2626' },
  },
  // Badge color schemes for ticket status
  status: {
    OUVERT: { bg: '#BAE6FD', text: '#0369A1', dot: '#0284C7' },
    'EN COURS': { bg: '#FDE68A', text: '#B45309', dot: '#D97706' },
    RESOLU: { bg: '#A7F3D0', text: '#047857', dot: '#15803D' },
    FERME: { bg: '#FECACA', text: '#B91C1C', dot: '#DC2626' },
  },
};

// French month abbreviations for date formatting
const MOIS_FR = ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOU', 'SEP', 'OCT', 'NOV', 'DEC'];

const now = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

// Format an ISO date string to short French format: "15 JAN"
const formatDateFr = (isoString) => {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${MOIS_FR[d.getMonth()]}`;
};

// Format an ISO date string to full French datetime: "15 JAN 2025 14:30"
const formatDateTimeFr = (isoString) => {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${MOIS_FR[d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Default SVG icon props applied to all inline icons
const iconProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

// ----- Inline SVG icon components -----
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
const IconMap = (p) => (
  <svg {...iconProps} {...p}><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
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

// Possible ticket statuses and their display labels
const ALL_STATUSES = ['ferme', 'ouvert', 'resolu'];
const ALL_LABELS = { ferme: 'Ferme', ouvert: 'Ouvert', resolu: 'Resolu' };

// Site status display labels and color mappings
const SITE_LABELS = { UP: 'Actif', DOWN: 'Inactif' };
const ST = { UP: '#059669', DOWN: '#DC2626' };
const ST_BG = { UP: '#DCFCE7', DOWN: '#FEE2E2' };

// Returns the list of valid forward transitions for a given ticket status
// e.g. 'ferme' can move to 'ouvert', 'ouvert' can move to 'resolu'
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

  // Role guard
  const tokenRole = getTokenRole();
  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAuthChecked(true), 100); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (!authChecked) return;
    if (!tokenRole) { navigate('/login', { replace: true }); return; }
    if (tokenRole !== 'INGENIEUR_RESEAUX') {
      const dashMap = { ADMIN: '/admin-dashboard', AGENT_CALL_CENTER: '/call-center-dashboard', SUPERVISEUR: '/supervisor-dashboard' };
      navigate(dashMap[tokenRole] || '/login', { replace: true });
    }
  }, [authChecked, tokenRole, navigate]);

  // --- View & Navigation State ---
  const [currentView, setCurrentView] = useState('reclamations'); // 'reclamations' | 'sites' | 'cartographie'

  // --- Tickets State ---
  const [tickets, setTickets] = useState([]);       // all tickets from the API
  const [loading, setLoading] = useState(false);     // loading indicator for tickets

  // --- Sites State ---
  const [sites, setSites] = useState([]);            // sites list used for ticket filter dropdown
  const [sitesList, setSitesList] = useState([]);    // full sites list for the sites management view
  const [sitesLoading, setSitesLoading] = useState(false);

  // --- Search & Filters (Reclamations) ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterSiteId, setFilterSiteId] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // --- Selection & Interaction State ---
  const [selectedTicket, setSelectedTicket] = useState(null);   // ticket opened in modal
  const [updatingId, setUpdatingId] = useState(null);           // ID of ticket being updated (for loading state)
  const [togglingSiteId, setTogglingSiteId] = useState(null);   // ID of site being toggled/archived
  const [selectedSite, setSelectedSite] = useState(null);       // site opened in modal
  const [hoveredUser, setHoveredUser] = useState(null);         // user info shown in tooltip on hover

  // --- Site Form State ---
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [siteSubmitting, setSiteSubmitting] = useState(false);
  const [newSiteForm, setNewSiteForm] = useState({
    nom: '', wilaya: '', commune: '', coordX: '', coordY: '', adresse: '', statut: 'UP', technologie: '5G',
  });

  // --- Sites Filters ---
  const [siteFilterCommune, setSiteFilterCommune] = useState('');
  const [siteFilterWilaya, setSiteFilterWilaya] = useState('');
  const [siteFilterStatut, setSiteFilterStatut] = useState('');
  const [showSiteFilters, setShowSiteFilters] = useState(false);

  // Fetch sites on mount (used for the ticket filter dropdown)
  useEffect(() => {
    getSites().then(setSites).catch(() => setSites([]));
  }, []);

  // Fetch all tickets from the backend
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

  // Load tickets on mount
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Fetch all sites including archived (for inline grayed-out display)
  const fetchSitesData = useCallback(async () => {
    setSitesLoading(true);
    try {
      const data = await getAllSites();
      setSitesList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Impossible de charger les sites', err);
      setSitesList([]);
    } finally {
      setSitesLoading(false);
    }
  }, []);

  // Only fetch sites data when the user switches to the sites view
  useEffect(() => {
    if (currentView === 'sites') fetchSitesData();
  }, [currentView, fetchSitesData]);

  // Toggle a site between UP (active) and DOWN (inactive) status
  const handleSiteToggle = useCallback(async (siteId, currentStatut) => {
    const newStatut = currentStatut === 'UP' ? 'DOWN' : 'UP';
    const action = newStatut === 'UP' ? 'activer' : 'desactiver';
    if (!window.confirm(`Confirmer la ${action} de ce site ?`)) return;

    setTogglingSiteId(siteId);
    try {
      await updateSiteStatus(siteId, { statut: newStatut });
      // Update the site in the local list without refetching
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

  // Archive a site – marks it as archived (grayed out in list)
  const handleArchiverSite = useCallback(async (siteId) => {
    if (!window.confirm('Archiver ce site ? Il sera grisé dans la liste.')) return;
    setTogglingSiteId(siteId);
    try {
      await archiverSite(siteId);
      setSitesList((prev) =>
        prev.map((s) => (s.id === siteId ? { ...s, archive: true } : s))
      );
      setSelectedSite(null);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'archivage.');
    } finally {
      setTogglingSiteId(null);
    }
  }, []);

  // Restore an archived site – marks it as non-archived
  const handleRestaurerSite = useCallback(async (siteId) => {
    setTogglingSiteId(siteId);
    try {
      await restoreSite(siteId);
      setSitesList((prev) =>
        prev.map((s) => (s.id === siteId ? { ...s, archive: false } : s))
      );
      setSelectedSite(null);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la restauration.');
    } finally {
      setTogglingSiteId(null);
    }
  }, []);

  // Change ticket status with confirmation dialog for forward transitions
  const handleStatusChange = useCallback(async (ticketId, newStatut, currentStatut) => {
    // Only show confirmation for meaningful transitions
    const msgs = {
      'ferme->ouvert': 'Confirmer l ouverture de ce ticket ?',
      'ouvert->resolu': 'Confirmer la resolution de ce ticket ?',
    };
    const key = `${currentStatut}->${newStatut}`;
    if (msgs[key] && !window.confirm(msgs[key])) return;

    setUpdatingId(ticketId);
    try {
      await updateTicket(ticketId, { statut: newStatut });
      // Optimistically update the ticket status in local state
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

  // Submit new site creation form
  const handleCreateSite = useCallback(async (e) => {
    e.preventDefault();
    setSiteSubmitting(true);
    try {
      const payload = {
        ...newSiteForm,
        // Send null for empty coordinates so the backend handles defaults
        coordX: newSiteForm.coordX || null,
        coordY: newSiteForm.coordY || null,
      };
      await createSite(payload);
      setShowSiteForm(false);
      // Reset form to defaults after successful creation
      setNewSiteForm({ nom: '', wilaya: '', commune: '', coordX: '', coordY: '', adresse: '', statut: 'UP', technologie: '5G' });
      fetchSitesData(); // refresh the list
    } catch (err) {
      console.error(err);
      alert('Erreur: ' + err.message);
    } finally {
      setSiteSubmitting(false);
    }
  }, [newSiteForm, fetchSitesData]);

  // Generic input handler for the new site form
  const handleSiteFormChange = (e) => {
    setNewSiteForm({ ...newSiteForm, [e.target.name]: e.target.value });
  };

  // Logout – clear tokens and redirect to login
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  // Convert a raw status string to the uppercase key used in the COLORS map
  const getStatutKey = (statut) => statut?.replace('_', ' ').toUpperCase();

  // ---- Filtered & sorted sites list ----
  // Non-archived sites first (sorted by code), then archived sites at the bottom (sorted by code)
  const filteredSites = sitesList.filter((s) => {
    if (siteFilterCommune) {
      if (!s.commune?.toLowerCase().includes(siteFilterCommune.toLowerCase())) return false;
    }
    if (siteFilterWilaya) {
      if (!s.wilaya?.toLowerCase().includes(siteFilterWilaya.toLowerCase())) return false;
    }
    if (siteFilterStatut) {
      if (s.statut !== siteFilterStatut) return false;
    }
    return true;
  }).sort((a, b) => {
    // Archived sites go to the bottom
    if (a.archive && !b.archive) return 1;
    if (!a.archive && b.archive) return -1;
    // Within same archive group, sort by numeric code
    const numA = parseInt(a.codeSite?.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.codeSite?.replace(/\D/g, '')) || 0;
    return numA - numB;
  });

  // ---- Filtered tickets list ----
  // Resolved tickets are excluded by default (engineer only handles open ones)
  const filteredTickets = tickets.filter((t) => {
    if (t.statut === 'resolu') return false;

    // Text search across multiple ticket fields
    const term = searchTerm.toLowerCase();
    const matchSearch =
      t.nom_complet_client?.toLowerCase().includes(term) ||
      t.numero_ticket?.toLowerCase().includes(term) ||
      t.site_display?.toLowerCase().includes(term) ||
      t.description?.toLowerCase().includes(term);
    if (!matchSearch) return false;

    // Apply each active filter independently
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
    if (filterStatut) {
      const st = (t.statut || '').toLowerCase();
      if (st !== filterStatut.toLowerCase()) return false;
    }
    return true;
  });

  return (
    <div style={styles.appLayout}>
      {/* ===== Sidebar Navigation ===== */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <img src={logoDjezzy} alt="" style={styles.brandLogo} />
          <div><div style={styles.brandName}>Djezzy Hub</div><div style={styles.brandRole}>Ingénieur Réseau</div></div>
        </div>
        <div style={styles.menu}>
          <span style={styles.sectionLabel}>PRINCIPAL</span>
          <button style={{ ...styles.navItem, ...(currentView === 'reclamations' ? styles.navItemActive : {}) }} onClick={(e) => { spawnParticles(e.clientX, e.clientY, 4); setCurrentView('reclamations'); }}>
            <IconTicket /> Réclamations
          </button>
          <button style={{ ...styles.navItem, ...(currentView === 'sites' ? styles.navItemActive : {}) }} onClick={(e) => { spawnParticles(e.clientX, e.clientY, 4); setCurrentView('sites'); setSelectedTicket(null); }}>
            <IconSite /> Sites Réseau
          </button>
          <button style={{ ...styles.navItem, ...(currentView === 'cartographie' ? styles.navItemActive : {}) }} onClick={(e) => { spawnParticles(e.clientX, e.clientY, 4); setCurrentView('cartographie'); }}>
            <IconMap /> Cartographie
          </button>
        </div>
      </aside>

      {/* ===== Main Content Area ===== */}
      <div style={{ ...styles.mainContent, backgroundColor: COLORS.mainBg }}>
        {/* Sticky header bar with dynamic title */}
        <header style={{ position: 'sticky', top: 0, height: 51, display: 'flex', alignItems: 'center', padding: '0 27px', background: COLORS.cardBg, borderBottom: `1px solid ${COLORS.border}`, boxShadow: 'var(--shadow-sm)', zIndex: 10 }}>
          <h1 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>{currentView === 'sites' ? 'Sites Réseau' : currentView === 'cartographie' ? 'Cartographie' : 'Réclamations'}</h1>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => { fetchTickets(); if (currentView === 'sites') fetchSitesData(); }} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-toolbar)', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-muted3)' }} title="Actualiser"><IconRefresh style={{ width: 14, height: 14 }} /></button>
            <span style={{ fontSize: 10, color: 'var(--text-muted2)', fontWeight: 500, padding: '4px 10px', background: 'var(--bg-toolbar)', borderRadius: 4 }}>{now()}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8, paddingLeft: 12, borderLeft: '1px solid var(--border-color)' }}>
              <button style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FEE2E2', border: 'none', cursor: 'pointer', color: '#E8401A' }} title="Profil" onClick={() => navigate('/profile')}><IconUser style={{ width: 15, height: 15 }} /></button>
              <button style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FEE2E2', border: 'none', cursor: 'pointer', color: '#E8401A' }} title="Déconnexion" onClick={handleLogout}><IconLogout style={{ width: 15, height: 15 }} /></button>
            </div>
          </div>
        </header>

        {/* ===== View Router ===== */}
        {currentView === 'cartographie' ? (
          /* ---------- Cartographie (Map) View ---------- */
          <div style={styles.pageContent}>
            <div style={{ ...styles.tableCard, backgroundColor: COLORS.cardBg }}>
              <div style={styles.formHeader}>
                <IconMap style={{ marginRight: '10px' }} />
                <span style={{ fontWeight: 700, fontSize: '14px' }}>Cartographie des sites 5G</span>
              </div>
              {/* Map component fills available height */}
              <div style={{ height: 'calc(100vh - 200px)', minHeight: 500 }}>
                <MapComponent sites={sitesList} showCoverage />
              </div>
            </div>
          </div>
        ) : currentView === 'sites' ? (
          /* ---------- Sites Management View ---------- */
          showSiteForm ? (
            /* -- New Site Creation Form -- */
          <div style={styles.pageContent}>
            <div style={styles.tableCard}>
              <div style={styles.formHeader}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.djezzyRed} strokeWidth="2" style={{ marginRight: '10px' }}><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.3" /></svg>
                <span style={{ fontWeight: 700, fontSize: '14px' }}>Ajouter un site reseau</span>
              </div>
              <form onSubmit={handleCreateSite} style={styles.formBody}>
                {/* Two-column grid layout for site form fields */}
                <div style={styles.formGrid}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Nom Site</label>
                    <input type="text" name="nom" value={newSiteForm.nom} onChange={handleSiteFormChange} placeholder="Ex: Alger Centre" style={styles.input} required />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Wilaya</label>
                    <input type="text" name="wilaya" value={newSiteForm.wilaya} onChange={handleSiteFormChange} placeholder="Ex: Alger" style={styles.input} required />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Commune</label>
                    <input type="text" name="commune" value={newSiteForm.commune} onChange={handleSiteFormChange} placeholder="Ex: Hydra" style={styles.input} required />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Coordonnée X</label>
                    <input type="text" name="coordX" value={newSiteForm.coordX} onChange={handleSiteFormChange} placeholder="Ex: 3.058" style={styles.input} />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Coordonnée Y</label>
                    <input type="text" name="coordY" value={newSiteForm.coordY} onChange={handleSiteFormChange} placeholder="Ex: 36.753" style={styles.input} />
                  </div>
                  {/* Full-width address field */}
                  <div style={{ ...styles.inputGroup, gridColumn: '1 / -1' }}>
                    <label style={styles.label}>Adresse Site</label>
                    <input type="text" name="adresse" value={newSiteForm.adresse} onChange={handleSiteFormChange} placeholder="Adresse complete" style={styles.input} />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Statut</label>
                    <select name="statut" value={newSiteForm.statut} onChange={handleSiteFormChange} style={styles.select}>
                      <option value="UP">Actif</option>
                      <option value="DOWN">Inactif</option>
                    </select>
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Technologie</label>
                    <select name="technologie" value={newSiteForm.technologie} onChange={handleSiteFormChange} style={styles.select}>
                      <option value="4G">4G</option>
                      <option value="5G">5G</option>
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
          /* -- Sites List View -- */
          <div style={styles.pageContent}>
            {/* Summary stat cards */}
            <div style={styles.statsRow}>
              <div className="fade-in stat-card" style={{ ...styles.statCard, borderLeftColor: '#3B82F6', backgroundColor: COLORS.cardBg, animationDelay: '0s' }}>
                <span style={{ ...styles.statNumber, color: '#171a21' }}>{sitesList.length}</span>
                <span style={styles.statLabel}>Total sites</span>
              </div>
              <div className="fade-in stat-card" style={{ ...styles.statCard, borderLeftColor: '#15803D', backgroundColor: COLORS.cardBg, animationDelay: '0.05s' }}>
                <span style={{ ...styles.statNumber, color: '#15803D' }}>{sitesList.filter((s) => s.statut === 'UP' && !s.archive).length}</span>
                <span style={styles.statLabel}>Actif</span>
              </div>
              <div className="fade-in stat-card" style={{ ...styles.statCard, borderLeftColor: '#DC2626', backgroundColor: COLORS.cardBg, animationDelay: '0.1s' }}>
                <span style={{ ...styles.statNumber, color: '#DC2626' }}>{sitesList.filter((s) => s.statut === 'DOWN' && !s.archive).length}</span>
                <span style={styles.statLabel}>Inactif</span>
              </div>
              <div className="fade-in stat-card" style={{ ...styles.statCard, borderLeftColor: '#9CA3AF', backgroundColor: COLORS.cardBg, animationDelay: '0.15s' }}>
                <span style={{ ...styles.statNumber, color: '#6B7280' }}>{sitesList.filter((s) => s.archive).length}</span>
                <span style={styles.statLabel}>Archivé</span>
              </div>
            </div>

            {/* Sites table card */}
            <div className="fade-in table-card" style={{ ...styles.tableCard, backgroundColor: COLORS.cardBg, animationDelay: '0.15s' }}>
              {/* Toolbar: title + action buttons */}
              <div style={{ ...styles.toolbar, borderBottom: `1px solid ${COLORS.border}` }}>
                <div style={styles.toolbarLeft}>
                  <h2 style={{ ...styles.tableTitle, color: '#181c24' }}>Liste des sites reseau</h2>
                </div>
                <div style={styles.toolbarActions}>
                  <button onClick={fetchSitesData} style={styles.btnFilter}>
                    <IconRefresh style={{ marginRight: '6px' }} /> Actualiser
                  </button>
                  <button onClick={() => setShowSiteFilters(!showSiteFilters)} style={styles.btnFilter}>
                    <IconFilter style={{ marginRight: '6px' }} /> Filtrer
                  </button>
                  <button onClick={() => { setShowSiteForm(true); setSelectedSite(null); }} style={styles.btnNew}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Nouveau Site
                  </button>
                </div>
              </div>

              {/* Collapsible filter bar for sites */}
              {showSiteFilters && (
                <div style={styles.filterArea}>
                  <input
                    type="text"
                    placeholder="Wilaya..."
                    value={siteFilterWilaya}
                    onChange={(e) => setSiteFilterWilaya(e.target.value)}
                    style={styles.filterSelect}
                  />
                  <input
                    type="text"
                    placeholder="Commune..."
                    value={siteFilterCommune}
                    onChange={(e) => setSiteFilterCommune(e.target.value)}
                    style={styles.filterSelect}
                  />
                  <select
                    value={siteFilterStatut}
                    onChange={(e) => setSiteFilterStatut(e.target.value)}
                    style={styles.filterSelect}
                  >
                    <option value="">Tous les etats</option>
                    <option value="UP">Actif</option>
                    <option value="DOWN">Inactif</option>
                  </select>
                </div>
              )}

              {/* Sites data table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>Code Site</th>
                      <th style={styles.th}>Nom Site</th>
                      <th style={styles.th}>Wilaya</th>
                      <th style={styles.th}>Commune</th>
                      <th style={{ ...styles.th, textAlign: 'center' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sitesLoading ? (
                      <tr><td colSpan="5" style={styles.emptyCell}>Chargement des sites...</td></tr>
                    ) : filteredSites.length === 0 ? (
                      <tr><td colSpan="5" style={styles.emptyCell}>Aucun site trouve.</td></tr>
                    ) : filteredSites.map((site) => {
                      const isArchived = site.archive;
                      return (
                        <tr
                          key={site.id}
                          style={{
                            ...styles.tr,
                            cursor: 'pointer',
                            opacity: isArchived ? 0.45 : 1,
                            backgroundColor: isArchived ? '#F3F4F6' : undefined,
                          }}
                          onClick={() => setSelectedSite(site)}
                          onMouseEnter={(e) => { if (!isArchived) e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                          onMouseLeave={(e) => { if (!isArchived) e.currentTarget.style.backgroundColor = isArchived ? '#F3F4F6' : ''; }}
                        >
                          {/* Code column with colored status indicator dot */}
                          <td style={{ ...styles.td, fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                width: 10, height: 10, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
                                backgroundColor: isArchived ? '#9CA3AF' : (ST[site.statut] || '#64748B'),
                                boxShadow: isArchived ? 'none' : (site.statut === 'UP' ? '0 0 6px rgba(5,150,105,0.6)' : site.statut === 'DOWN' ? '0 0 6px rgba(220,38,38,0.6)' : 'none'),
                              }} />
                              {site.codeSite}
                              {isArchived && <span style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 600, backgroundColor: '#E5E7EB', padding: '1px 6px', borderRadius: 4 }}>ARCHIVÉ</span>}
                            </div>
                          </td>
                          <td style={{ ...styles.td, color: isArchived ? '#9CA3AF' : undefined }}>{site.nom}</td>
                          <td style={{ ...styles.td, color: isArchived ? '#9CA3AF' : undefined }}>{site.wilaya}</td>
                          <td style={{ ...styles.td, color: isArchived ? '#9CA3AF' : undefined }}>{site.commune}</td>
                          {/* Toggle buttons: Actif / Inactif – hidden for archived sites */}
                          <td style={{ ...styles.td, textAlign: 'center' }}>
                            {isArchived ? (
                              <span style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 600 }}>Archivé</span>
                            ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
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
                                        backgroundColor: isActive ? (s === 'UP' ? '#059669' : '#DC2626') : (isTarget ? '#FFFFFF' : '#FFFFFF'),
                                        color: isActive ? '#FFFFFF' : (isTarget ? (s === 'UP' ? '#059669' : '#DC2626') : '#D0D0D0'),
                                        borderColor: isActive ? (s === 'UP' ? '#059669' : '#DC2626') : (isTarget ? (s === 'UP' ? '#059669' : '#DC2626') : '#E5E5E5'),
                                        cursor: isTarget && togglingSiteId !== site.id ? 'pointer' : 'not-allowed',
                                        fontWeight: isActive ? 700 : (isTarget ? 600 : 500),
                                      }}
                                    >
                                      {SITE_LABELS[s]}
                                    </button>
                                  );
                                })}
                              </div>
                              <button onClick={() => setSelectedSite(site)} title="Modifier" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '3px 8px', fontSize: 10, fontWeight: 600, borderRadius: 4, border: '1px solid #2563EB33', background: '#2563EB0D', color: '#2563EB', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                                Modifier
                              </button>
                              <button onClick={() => handleArchiverSite(site.id)} title="Archiver" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '3px 8px', fontSize: 10, fontWeight: 600, borderRadius: 4, border: '1px solid #DC262633', background: '#DC26260D', color: '#DC2626', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                                Archiver
                              </button>
                            </div>
                            )}
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
        /* ---------- Reclamations (Tickets) View ---------- */
        <div style={styles.pageContent}>
          <div className="fade-in table-card" style={{ ...styles.tableCard, backgroundColor: COLORS.cardBg, animationDelay: '0.1s' }}>
            {/* Toolbar with search and filter controls */}
            <div style={{ ...styles.toolbar, borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={styles.toolbarLeft}>
                <h2 style={{ ...styles.tableTitle, color: '#181c24' }}>Listes des reclamations</h2>
              </div>

              <div style={styles.toolbarActions}>
                <button onClick={fetchTickets} style={{ ...styles.btnFilter, backgroundColor: COLORS.cardBg, color: '#3a404a', border: `1px solid ${COLORS.border}` }}>
                  <IconRefresh style={{ marginRight: '6px' }} /> Actualiser
                </button>
                <button onClick={() => setShowFilters(!showFilters)} style={{ ...styles.btnFilter, backgroundColor: COLORS.cardBg, color: '#3a404a', border: `1px solid ${COLORS.border}` }}>
                  <IconFilter style={{ marginRight: '6px' }} /> Filtrer
                </button>

                {/* Search bar */}
                <div style={{ ...styles.searchWrapper, backgroundColor: '#F8FAFC' }}>
                  <IconSearch style={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ ...styles.searchInput, backgroundColor: 'transparent', color: '#1c212b' }}
                  />
                </div>
              </div>
            </div>

            {/* Collapsible filter panel for tickets */}
            {showFilters && (
              <div style={{ ...styles.filterArea, backgroundColor: '#fafbfc', borderBottom: `1px solid ${COLORS.border}` }}>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  style={{ ...styles.filterSelect, backgroundColor: COLORS.inputBg, color: '#4e5561', border: `1px solid ${COLORS.border}` }}
                />
                <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)} style={{ ...styles.filterSelect, backgroundColor: COLORS.inputBg, color: '#4e5561', border: `1px solid ${COLORS.border}` }}>
                  <option value="">Tous statuts</option>
                  <option value="ferme">Ferme</option>
                  <option value="ouvert">Ouvert</option>
                  <option value="resolu">Resolu</option>
                </select>
                <select value={filterSiteId} onChange={(e) => setFilterSiteId(e.target.value)} style={{ ...styles.filterSelect, backgroundColor: COLORS.inputBg, color: '#4e5561', border: `1px solid ${COLORS.border}` }}>
                  <option value="">Tous les sites</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.nom}</option>
                  ))}
                </select>
                <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={{ ...styles.filterSelect, backgroundColor: COLORS.inputBg, color: '#4e5561', border: `1px solid ${COLORS.border}` }}>
                  <option value="">Toutes priorites</option>
                  <option value="critique">Critique</option>
                  <option value="haute">Haute</option>
                  <option value="normale">Normale</option>
                  <option value="basse">Basse</option>
                </select>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ ...styles.filterSelect, backgroundColor: COLORS.inputBg, color: '#4e5561', border: `1px solid ${COLORS.border}` }}>
                  <option value="">Tous types</option>
                  <option value="particulier">Particulier</option>
                  <option value="entreprise">Entreprise</option>
                </select>
              </div>
            )}

            {/* Tickets data table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ ...styles.table, backgroundColor: COLORS.cardBg }}>
                <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>N° Ticket</th>
                      <th style={styles.th}>Type Client</th>
                      <th style={styles.th}>Code Site</th>
                      <th style={styles.th}>Priorité</th>
                      <th style={styles.th}>Statut</th>
                      <th style={styles.th}>Date Création</th>
                      <th style={{ ...styles.th, textAlign: 'center' }}>ACTION</th>
                    </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" style={styles.emptyCell}>Chargement des donnees...</td></tr>
                  ) : filteredTickets.length === 0 ? (
                    <tr><td colSpan="7" style={styles.emptyCell}>Aucune reclamation trouvee.</td></tr>
                  ) : filteredTickets.map((ticket) => {
                    // Resolve color config for this ticket's priority, type, and status
                    const prio = COLORS.priorities[ticket.priorite?.toUpperCase()] || COLORS.priorities.NORMALE;
                    const typ = COLORS.types[ticket.type_client?.toUpperCase()] || COLORS.types.PARTICULIER;
                    const statutKey = getStatutKey(ticket.statut);
                    const stat = COLORS.status[statutKey] || COLORS.status.FERME;

                    return (
                      <tr
                        key={ticket.id}
                        style={styles.tr}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                      >
                        {/* Ticket number – clickable to open detail modal */}
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
                        <td style={styles.td}>
                          <span style={{ ...styles.badgeBase, backgroundColor: prio.bg, color: prio.text }}>
                            {ticket.priorite?.toUpperCase()}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badgeBase, backgroundColor: stat.bg, color: stat.text }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: stat.dot, marginRight: '6px', display: 'inline-block' }} />
                            {getStatutKey(ticket.statut)}
                          </span>
                        </td>
                        <td style={{ ...styles.td, color: COLORS.textMuted }}>{formatDateFr(ticket.created_at)}</td>
                        {/* Status action buttons – only forward transitions are enabled */}
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
                                    backgroundColor: isCurrent ? sc.bg : (canGo ? '#FFFFFF' : '#FFFFFF'),
                                    color: isCurrent ? '#FFFFFF' : (canGo ? sc.text : '#D0D0D0'),
                                    borderColor: isCurrent ? sc.bg : (canGo ? sc.text : '#E5E5E5'),
                                    cursor: canGo && updatingId !== ticket.id ? 'pointer' : 'not-allowed',
                                    fontWeight: isCurrent ? 700 : (canGo ? 600 : 500),
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

      {/* ===== Ticket Detail Modal ===== */}
      {selectedTicket && (
        <div className="fade-in" style={styles.overlay} onClick={() => setSelectedTicket(null)}>
          <div className="scale-in" style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Ticket {selectedTicket.numero_ticket}</h2>
              <button style={styles.modalClose} onClick={() => setSelectedTicket(null)}><IconX /></button>
            </div>

            <div style={styles.modalBody}>
              {/* Two-column grid: client info + ticket info */}
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
                  {/* Created-by user chip with hover tooltip */}
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Cree par</span>
                    {selectedTicket.cree_par ? (
                      <span style={styles.userChip}
                        onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHoveredUser({ user: selectedTicket.cree_par, rect: r }); }}
                        onMouseLeave={() => setHoveredUser(null)}
                      >
                        {selectedTicket.cree_par.code_user}
                      </span>
                    ) : (
                      <span style={styles.modalValue}>{selectedTicket.cree_par?.code_user || '-'}</span>
                    )}
                  </div>
                  {/* Assigned-to user chip with hover tooltip */}
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Assigne a</span>
                    {selectedTicket.assigne_a ? (
                      <span style={styles.userChip}
                        onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHoveredUser({ user: selectedTicket.assigne_a, rect: r }); }}
                        onMouseLeave={() => setHoveredUser(null)}
                      >
                        {selectedTicket.assigne_a_display}
                      </span>
                    ) : (
                      <span style={styles.modalValue}>{selectedTicket.assigne_a_display || '-'}</span>
                    )}
                  </div>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Date creation</span>
                    <span style={styles.modalValue}>{formatDateTimeFr(selectedTicket.created_at)}</span>
                  </div>
                  {/* Show resolution date only if the ticket was resolved */}
                  {selectedTicket.resolu_le && (
                    <div style={styles.modalField}>
                      <span style={styles.modalLabel}>Resolu le</span>
                      <span style={styles.modalValue}>{formatDateTimeFr(selectedTicket.resolu_le)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* AI-generated keywords section */}
              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>Mots-cles saisis</h3>
                <p style={styles.modalText}>{selectedTicket.mots_cles_ia || 'Aucun mot-cle saisi.'}</p>
              </div>

              {/* Ticket description (if present) */}
              {selectedTicket.description && (
                <div style={styles.modalSection}>
                  <h3 style={styles.modalSectionTitle}>Description</h3>
                  <p style={styles.modalText}>{selectedTicket.description}</p>
                </div>
              )}

            </div>

            {/* Modal footer with status transition buttons */}
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
                        backgroundColor: isCurrent ? sc.bg : (canGo ? '#FFFFFF' : '#FFFFFF'),
                        color: isCurrent ? '#FFFFFF' : (canGo ? sc.text : '#D0D0D0'),
                        borderColor: isCurrent ? sc.bg : (canGo ? sc.text : '#E5E5E5'),
                        cursor: canGo && updatingId !== selectedTicket.id ? 'pointer' : 'not-allowed',
                        fontWeight: isCurrent ? 700 : (canGo ? 600 : 500),
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
          {/* User tooltip – positioned near the hovered user chip */}
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

      {/* ===== Site Detail Modal ===== */}
      {selectedSite && (
        <div className="fade-in" style={styles.overlay} onClick={() => setSelectedSite(null)}>
          <div className="scale-in" style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Site {selectedSite.codeSite} {selectedSite.archive && <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, backgroundColor: '#F3F4F6', padding: '2px 8px', borderRadius: 4, marginLeft: 8 }}>ARCHIVÉ</span>}</h2>
              <button style={styles.modalClose} onClick={() => setSelectedSite(null)}><IconX /></button>
            </div>
            <div style={styles.modalBody}>
              {/* Two-column grid: site info + status info */}
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
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Technologie</span>
                    <span style={styles.modalValue}><span style={{ ...styles.badgeBase, backgroundColor: selectedSite.technologie === '4G' ? '#DCFCE7' : '#E0E7FF', color: selectedSite.technologie === '4G' ? '#15803D' : '#4338CA' }}>{selectedSite.technologie || '5G'}</span></span>
                  </div>
                </div>
                <div style={styles.modalSection}>
                  <h3 style={styles.modalSectionTitle}>Etat</h3>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Statut</span>
                    <span style={styles.modalValue}>
                      <span style={{
                        ...styles.badgeBase,
                        backgroundColor: ST_BG[selectedSite.statut] || '#F1F5F9',
                        color: ST[selectedSite.statut] || '#64748B',
                      }}>
                        {SITE_LABELS[selectedSite.statut]}
                      </span>
                    </span>
                  </div>
                  {/* Conditionally show coordinates if they exist */}
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
            {/* Modal footer: toggle status + archive */}
            <div style={styles.modalFooter}>
              {selectedSite.archive ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    disabled={togglingSiteId === selectedSite.id}
                    onClick={() => handleRestaurerSite(selectedSite.id)}
                    style={{ display: 'flex', alignItems: 'center', backgroundColor: '#D1FAE5', color: '#059669', border: '1px solid #A7F3D0', padding: '10px 24px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                    Restaurer
                  </button>
                </div>
              ) : (
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
                        backgroundColor: isActive ? (s === 'UP' ? '#059669' : '#DC2626') : (isTarget ? '#FFFFFF' : '#FFFFFF'),
                        color: isActive ? '#FFFFFF' : (isTarget ? (s === 'UP' ? '#059669' : '#DC2626') : '#D0D0D0'),
                        borderColor: isActive ? (s === 'UP' ? '#059669' : '#DC2626') : (isTarget ? (s === 'UP' ? '#059669' : '#DC2626') : '#E5E5E5'),
                        cursor: isTarget && togglingSiteId !== selectedSite.id ? 'pointer' : 'not-allowed',
                        fontWeight: isActive ? 700 : (isTarget ? 600 : 500),
                      }}
                    >
                      {SITE_LABELS[s]}
                    </button>
                  );
                })}
              </div>
              )}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {!selectedSite.archive && (
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

/*
 * ===== Inline Styles Object =====
 * All component styles are defined here at the bottom of the file.
 * Uses a mix of CSS variables (for theming) and hardcoded values.
 */
const styles = {
  appLayout: { display: 'flex', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif", width: '100%' },
  sidebar: { width: 193, backgroundColor: COLORS.sidebarBg, color: 'var(--text-sidebar)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' },
  brand: { height: 82, display: 'flex', alignItems: 'center', gap: 13, padding: '0 17px', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  brandLogo: { width: 34, height: 'auto', objectFit: 'contain' },
  brandName: { color: '#FFFFFF', fontWeight: 700, fontSize: 16 },
  brandRole: { marginTop: 6, fontSize: 10, color: 'var(--text-sidebar)' },
  menu: { display: 'flex', flexDirection: 'column', gap: 5, padding: '26px 12px 0' },
  sectionLabel: { margin: '0 5px 10px', fontSize: 6, fontWeight: 700, color: 'var(--text-muted3)', letterSpacing: '1px' },
  navItem: { display: 'flex', alignItems: 'center', gap: 9, background: 'transparent', border: 'none', color: 'var(--text-sidebar)', padding: '0 10px', borderRadius: 6, cursor: 'pointer', textAlign: 'left', fontSize: 13, width: '100%', height: 34, textDecoration: 'none', outline: 'none' },
  navItemActive: { background: 'linear-gradient(90deg, #9a0c2d, #710820)', color: '#FFFFFF', fontWeight: 600 },
  mainContent: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },
  topHeader: { position: 'sticky', top: 0, height: '51px', display: 'flex', alignItems: 'center', padding: '0 27px', borderBottom: `1px solid ${COLORS.border}`, boxShadow: 'var(--shadow-sm)', zIndex: 10 },
  pageTitle: { margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' },
  pageTitleDark: { margin: 0, fontSize: '14px', fontWeight: 700, color: '#e2e8f0' },
  pageContent: { padding: '24px 21px 40px', flex: 1 },
  statsRow: { display: 'flex', gap: '16px', marginBottom: '20px' },
  statCard: { flex: 1, backgroundColor: 'var(--bg-card)', borderRadius: '8px', padding: '16px 20px', borderLeft: '4px solid', border: `1px solid ${COLORS.border}`, borderLeftWidth: '4px', display: 'flex', flexDirection: 'column', gap: '4px' },
  statNumber: { fontSize: '24px', fontWeight: 700, color: COLORS.textDark },
  statLabel: { fontSize: '11px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.3px' },
  backNav: { display: 'flex', alignItems: 'center', fontSize: '16px', color: COLORS.textDark, cursor: 'pointer', marginBottom: '4px' },
  breadcrumb: { fontSize: '12px', color: COLORS.textMuted, fontWeight: 500 },
  tableCard: { backgroundColor: COLORS.cardBg, borderRadius: '7px', border: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', width: '100%', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' },
  formHeader: { padding: '16px 20px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center' },
  formBody: { padding: '24px 30px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', marginBottom: '12px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '11px', fontWeight: 700, color: COLORS.textDark },
  input: { padding: '10px 14px', borderRadius: '6px', border: `1px solid ${COLORS.border}`, fontSize: '13px', outline: 'none' },
  select: { padding: '10px 14px', borderRadius: '6px', border: `1px solid ${COLORS.border}`, fontSize: '13px', backgroundColor: 'var(--inputBg, #FFFFFF)', outline: 'none', color: COLORS.textDark },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '30px' },
  btnSubmit: { display: 'flex', alignItems: 'center', backgroundColor: COLORS.djezzyRed, color: '#FFFFFF', border: 'none', padding: '10px 24px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' },
  toolbar: { minHeight: '44px', padding: '0 18px', display: 'flex', alignItems: 'center', borderBottom: `1px solid ${COLORS.border}` },
  toolbarLeft: { display: 'flex', alignItems: 'center', gap: '11px' },
  tableTitle: { margin: 0, fontSize: '11px', fontWeight: 700, color: COLORS.textDark },
  toolbarActions: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '9px' },
  btnFilter: { display: 'flex', alignItems: 'center', backgroundColor: 'var(--cardBg, #FFFFFF)', border: `1px solid ${COLORS.border}`, padding: '0 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: COLORS.textDark, height: '28px', transition: 'all 0.15s ease' },
  searchWrapper: { position: 'relative', display: 'flex', alignItems: 'center', width: '188px', height: '28px' },
  searchIcon: { position: 'absolute', left: '10px', color: COLORS.textMuted },
  searchInput: { width: '100%', height: '100%', padding: '0 10px 0 31px', borderRadius: '6px', border: `1px solid ${COLORS.border}`, backgroundColor: 'var(--inputBg, #f8f9fc)', fontSize: '9px', outline: 'none', color: COLORS.textDark, transition: 'border-color 0.15s ease' },
  filterArea: { display: 'flex', gap: '10px', padding: '12px 18px', backgroundColor: 'var(--mainBg, #fafbfc)', borderBottom: `1px solid ${COLORS.border}`, flexWrap: 'wrap' },
  filterSelect: { minWidth: '150px', height: '31px', padding: '0 10px', color: COLORS.textDark, backgroundColor: 'var(--inputBg, #FFFFFF)', border: `1px solid ${COLORS.border}`, borderRadius: '5px', outline: 'none' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', minWidth: '1100px' },
  thRow: { backgroundColor: 'var(--mainBg, #f3f6f9)' },
  th: { height: '30px', padding: '0 14px', fontWeight: 500, color: COLORS.textMuted, fontSize: '7px', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: `1px solid ${COLORS.border}` },
  tr: { borderBottom: `1px solid ${COLORS.border}`, transition: 'background 0.1s' },
  td: { height: '44px', padding: '0 14px', color: COLORS.textDark, verticalAlign: 'middle', whiteSpace: 'nowrap' },
  emptyCell: { textAlign: 'center', padding: '30px', color: COLORS.textMuted },
  badgeBase: { padding: '4px 10px', borderRadius: '4px', fontWeight: 700, fontSize: '10px', display: 'inline-flex', alignItems: 'center' },
  statusActions: { display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' },
  statusBtn: { display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: '9px', border: '1px solid', fontSize: '9px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s ease' },

  // Modal overlay and container styles
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: 'var(--cardBg, #FFFFFF)', borderRadius: '12px', width: '700px', maxWidth: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
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
  comment: { padding: '12px', backgroundColor: 'var(--inputBg, #F8FAFC)', borderRadius: '8px', marginBottom: '8px' },
  modalFooter: { padding: '16px 24px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  btnCancel: { backgroundColor: 'var(--cardBg, #FFFFFF)', border: `1px solid ${COLORS.border}`, padding: '10px 24px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: COLORS.textDark },
  btnNew: { display: 'flex', alignItems: 'center', backgroundColor: COLORS.djezzyRed, color: '#FFFFFF', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' },
  btnDanger: { display: 'flex', alignItems: 'center', backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', padding: '10px 24px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },

  // User hover tooltip styles
  userChip: { fontSize: '13px', color: COLORS.djezzyRed, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: 'rgba(230,0,35,0.3)', position: 'relative' },

  userTooltip: { position: 'fixed', zIndex: 1200, backgroundColor: '#1E293B', color: '#F1F5F9', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', pointerEvents: 'none', whiteSpace: 'nowrap' },
  userTooltipArrow: { position: 'absolute', top: '-5px', left: '16px', width: '10px', height: '10px', backgroundColor: '#1E293B', transform: 'rotate(45deg)', borderRadius: '2px' },
  userTooltipName: { fontWeight: 700, fontSize: '13px', marginBottom: '4px' },
  userTooltipDetail: { color: '#94A3B8', fontSize: '11px', lineHeight: '1.6' },
};
