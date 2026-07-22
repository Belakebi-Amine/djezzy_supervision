/*
 * EngineerDashboard.jsx
 *
 * Main dashboard page for network engineers at Djezzy.
 * Provides three main views:
 *   1. Tickets – view and manage customer complaint tickets
 *   2. Sites Reseau – manage telecom network sites (status, creation, archiving)
 *   3. Cartographie – map view showing site locations and coverage
 *
 * Author: PFE Intern
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { spawnParticles } from '../hooks/useAnimations';
import { useNotification } from '../context/NotificationContext';
import { getTickets, getSites, getAllSites, updateSiteStatus, createSite, archiverSite, restoreSite, getTokenRole, getGroupeTickets, getGroupeTicketStats, resoudreGroupeTicket, assignerGroupeTicket, verrouillerGroupeTicket, deverrouillerGroupeTicket, getArchivedSites, getArchivedTickets } from '../api/tickets';
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
    OUVERT: { bg: '#DBEAFE', text: '#1D4ED8', dot: '#2563EB' },
    'EN COURS': { bg: '#FDE68A', text: '#B45309', dot: '#D97706' },
    RESOLU: { bg: '#A7F3D0', text: '#047857', dot: '#15803D' },
    FERME: { bg: '#FEE2E2', text: '#DC2626', dot: '#DC2626' },
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
const IconFilter = (p) => (
  <svg {...iconProps} {...p}><path d="M4 5h16l-6 7v6l-4 1v-7L4 5Z" /></svg>
);
const IconX = (p) => (
  <svg {...iconProps} {...p}><path d="M18 6L6 18M6 6l12 12" /></svg>
);
const IconArchive = (p) => (
  <svg {...iconProps} {...p}><path d="M21 4H3M8 2v2M16 2v2M4 7l1 12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2l1-12M10 11v6M14 11v6" /></svg>
);
const IconEdit = (p) => (
  <svg {...iconProps} {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
);

// Site status display labels and color mappings
const SITE_LABELS = { UP: 'Actif', DOWN: 'Inactif' };
const ST = { UP: '#059669', DOWN: '#DC2626' };
const ST_BG = { UP: '#DCFCE7', DOWN: '#FEE2E2' };

export default function EngineerDashboard() {
  const navigate = useNavigate();
  const { addNotification } = useNotification();

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
  const [, setTickets] = useState([]);       // all tickets from the API

  // --- Grouped Tickets State ---
  const [groupeTickets, setGroupeTickets] = useState([]);
  const [groupeStats, setGroupeStats] = useState({ tickets_ouverts: 0, tickets_total: 0, tickets_resolus: 0, tickets_fermes: 0, reclamations_total: 0, top_site: null });
  const [groupeLoading, setGroupeLoading] = useState(false);
  const [selectedGroupe, setSelectedGroupe] = useState(null);
  const [updatingGroupeId, setUpdatingGroupeId] = useState(null);

  // --- Sites State ---
  const [sites, setSites] = useState([]);            // sites list used for ticket filter dropdown
  const [sitesList, setSitesList] = useState([]);    // full sites list for the sites management view
  const [sitesLoading, setSitesLoading] = useState(false);

  // --- Search & Filters (Reclamations) ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const [filterSiteId, setFilterSiteId] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // --- Selection & Interaction State ---
  const [, setSelectedTicket] = useState(null);   // ticket opened in modal
  const [togglingSiteId, setTogglingSiteId] = useState(null);   // ID of site being toggled/archived
  const [selectedSite, setSelectedSite] = useState(null);       // site opened in modal

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

  // --- Archived Sites State ---
  const [archivedSites, setArchivedSites] = useState([]);
  const [archivedLoading, setArchivedLoading] = useState(false);

  // --- Archived Tickets State ---
  const [archivedTickets, setArchivedTickets] = useState([]);
  const [archiveTab, setArchiveTab] = useState('sites');

  const fetchArchivedSites = useCallback(async () => {
    setArchivedLoading(true);
    try { const d = await getArchivedSites(); setArchivedSites(Array.isArray(d) ? d : []); }
    catch { setArchivedSites([]); }
    finally { setArchivedLoading(false); }
  }, []);

  const fetchArchivedTickets = useCallback(async () => {
    try { const d = await getArchivedTickets(); setArchivedTickets(Array.isArray(d) ? d : []); }
    catch { setArchivedTickets([]); }
  }, []);

  useEffect(() => {
    if (currentView === 'archives') { fetchArchivedSites(); fetchArchivedTickets(); }
  }, [currentView, fetchArchivedSites, fetchArchivedTickets]);

  // Fetch sites on mount (used for the ticket filter dropdown)
  useEffect(() => {
    getSites().then(setSites).catch(() => setSites([]));
  }, []);

  // Fetch all tickets from the backend (include archived so ferme tickets are visible)
  const fetchTickets = useCallback(async () => {
    try {
      const data = await getTickets('', 'all');
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      addNotification('Impossible de charger les réclamations.', 'error');
      setTickets([]);
    }
  }, [addNotification]);

  // Silent background refresh (no loading spinner)
  const refreshTickets = useCallback(async () => {
    try {
      const data = await getTickets('', 'all');
      if (Array.isArray(data)) setTickets(data);
    } catch {}
  }, []);

  // Load tickets on mount
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // ─── Fetch grouped tickets (include archived so ferme groups are visible) ───
  const fetchGroupeTickets = useCallback(async () => {
    setGroupeLoading(true);
    try {
      const data = await getGroupeTickets({ archived: 'all' });
      setGroupeTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      addNotification('Impossible de charger les tickets groupés.', 'error');
      setGroupeTickets([]);
    } finally {
      setGroupeLoading(false);
    }
  }, [addNotification]);

  // Silent background refresh for grouped tickets
  const refreshGroupeTickets = useCallback(async () => {
    try {
      const data = await getGroupeTickets({ archived: 'all' });
      if (Array.isArray(data)) setGroupeTickets(data);
    } catch {}
  }, []);

  const fetchGroupeStats = useCallback(async () => {
    try {
      const data = await getGroupeTicketStats();
      setGroupeStats(data);
    } catch (err) {
      addNotification('Impossible de charger les statistiques.', 'error');
    }
  }, [addNotification]);

  useEffect(() => {
    fetchGroupeTickets();
    fetchGroupeStats();
  }, [fetchGroupeTickets, fetchGroupeStats]);

  // ─── Auto-refresh every 5 seconds (transparent, no loading flash) ───
  useEffect(() => {
    const interval = setInterval(() => {
      refreshTickets();
      refreshGroupeTickets();
      fetchGroupeStats();
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshTickets, refreshGroupeTickets, fetchGroupeStats]);

  // ─── Lock ticket when opening modal, unlock when closing ───
  useEffect(() => {
    if (!selectedGroupe) return;
    handleVerrouillerGroupe(selectedGroupe.id);
    const prevGroupeId = selectedGroupe.id;
    return () => { handleDeverrouillerGroupe(prevGroupeId); };
  }, [selectedGroupe?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch all sites including archived (for inline grayed-out display)
  const fetchSitesData = useCallback(async () => {
    setSitesLoading(true);
    try {
      const data = await getAllSites();
      setSitesList(Array.isArray(data) ? data : []);
    } catch (err) {
      addNotification('Impossible de charger les sites.', 'error');
      setSitesList([]);
    } finally {
      setSitesLoading(false);
    }
  }, [addNotification]);

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
      addNotification(`Site passé en ${newStatut === 'UP' ? 'actif' : 'inactif'}`);
    } catch (err) {
      addNotification('Erreur lors du changement de statut du site.', 'error');
    } finally {
      setTogglingSiteId(null);
    }
  }, [addNotification]);

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
      addNotification("Erreur lors de l'archivage.", 'error');
    } finally {
      setTogglingSiteId(null);
    }
  }, [addNotification]);

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
      addNotification('Erreur lors de la restauration.', 'error');
    } finally {
      setTogglingSiteId(null);
    }
  }, [addNotification]);

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
      addNotification('Site créé avec succès');
      fetchSitesData(); // refresh the list
    } catch (err) {
      addNotification('Erreur création site: ' + err.message, 'error');
    } finally {
      setSiteSubmitting(false);
    }
  }, [newSiteForm, fetchSitesData, addNotification]);

  // Generic input handler for the new site form
  const handleSiteFormChange = (e) => {
    setNewSiteForm({ ...newSiteForm, [e.target.name]: e.target.value });
  };

  // Logout – clear tokens and redirect to login
  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login');
  };

  // ─── Grouped ticket actions ───
  const handleResoudreGroupe = useCallback(async (groupeId) => {
    if (!window.confirm('Confirmer la résolution de ce ticket ? Toutes les réclamations seront résolues.')) return;
    setUpdatingGroupeId(groupeId);
    try {
      await resoudreGroupeTicket(groupeId);
      setGroupeTickets((prev) =>
        prev.map((g) => g.id === groupeId ? { ...g, statut: 'resolu' } : g)
      );
      setSelectedGroupe(null);
      addNotification('Ticket résolu avec succès');
      fetchGroupeStats();
    } catch (err) {
      addNotification('Erreur lors de la résolution du ticket.', 'error');
    } finally {
      setUpdatingGroupeId(null);
    }
  }, [fetchGroupeStats, addNotification]);

  const handleAssignerGroupe = useCallback(async (groupeId) => {
    const isFerme = groupeTickets.find(g => g.id === groupeId)?.statut === 'ferme';
    if (!window.confirm(isFerme ? 'Prendre ce ticket ? Les réclamations seront rouvertes et assignées à vous.' : 'Vous assigner à ce ticket ? Toutes les réclamations vous seront assignées.')) return;
    setUpdatingGroupeId(groupeId);
    try {
      await assignerGroupeTicket(groupeId);
      addNotification('Ticket assigné avec succès');
      fetchGroupeTickets();
      fetchGroupeStats();
    } catch (err) {
      const msg = err?.data?.error || err?.message || "Erreur lors de l'assignation du ticket.";
      addNotification(msg, 'error');
    } finally {
      setUpdatingGroupeId(null);
    }
  }, [addNotification, fetchGroupeTickets, fetchGroupeStats, groupeTickets]);

  // Lock a ticket when opening the detail modal
  const handleVerrouillerGroupe = useCallback(async (groupeId) => {
    try {
      const data = await verrouillerGroupeTicket(groupeId);
      setSelectedGroupe(prev => prev && prev.id === groupeId ? { ...prev, ...data } : prev);
      setGroupeTickets(prev => prev.map(g => g.id === groupeId ? { ...g, ...data } : g));
    } catch (err) {
      if (err.status === 409) {
        addNotification(`Ticket en cours par ${err.data.locked_by} — consultez en lecture seule`, 'warning');
      }
      // Still allow viewing — just don't lock
    }
  }, [addNotification]);

  // Unlock a ticket when closing the detail modal
  const handleDeverrouillerGroupe = useCallback(async (groupeId) => {
    try {
      const data = await deverrouillerGroupeTicket(groupeId);
      setSelectedGroupe(prev => prev && prev.id === groupeId ? { ...prev, ...data } : prev);
      setGroupeTickets(prev => prev.map(g => g.id === groupeId ? { ...g, ...data } : g));
    } catch {}
  }, []);

  // Convert a raw status string to the uppercase key used in the COLORS map
  const getStatutKey = (statut) => statut?.replace('_', ' ').toUpperCase();

  // Priority sort order: higher priority = sort first
  const PRIO_ORDER = { critique: 0, haute: 1, normale: 2, basse: 3 };

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

  // ---- Filtered grouped tickets ----
  const filteredGroupeTickets = groupeTickets.filter((g) => {
    if (g.statut === 'resolu') return false;
    const term = searchTerm.toLowerCase();
    const matchSearch =
      g.titre?.toLowerCase().includes(term) ||
      g.numero_ticket?.toLowerCase().includes(term) ||
      g.site_display?.toLowerCase().includes(term) ||
      g.mots_cles?.toLowerCase().includes(term);
    if (!matchSearch) return false;
    if (filterPriority) {
      const prio = (g.priorite || '').toUpperCase();
      if (prio !== filterPriority.toUpperCase()) return false;
    }
    if (filterSiteId) {
      if (String(g.site?.id) !== String(filterSiteId)) return false;
    }
    if (filterStatut) {
      const st = (g.statut || '').toLowerCase();
      if (st !== filterStatut.toLowerCase()) return false;
    }
    return true;
  }).sort((a, b) => {
    // Sort: entreprise tickets first, then by priority, then by date
    const entA = a.has_entreprise ? 0 : 1;
    const entB = b.has_entreprise ? 0 : 1;
    if (entA !== entB) return entA - entB;
    const prioA = PRIO_ORDER[a.priorite] ?? 4;
    const prioB = PRIO_ORDER[b.priorite] ?? 4;
    if (prioA !== prioB) return prioA - prioB;
    return new Date(b.created_at) - new Date(a.created_at);
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
            <IconTicket /> Tickets
          </button>
          <button style={{ ...styles.navItem, ...(currentView === 'sites' ? styles.navItemActive : {}) }} onClick={(e) => { spawnParticles(e.clientX, e.clientY, 4); setCurrentView('sites'); setSelectedTicket(null); }}>
            <IconSite /> Sites Réseau
          </button>
          <button style={{ ...styles.navItem, ...(currentView === 'cartographie' ? styles.navItemActive : {}) }} onClick={(e) => { spawnParticles(e.clientX, e.clientY, 4); setCurrentView('cartographie'); }}>
            <IconMap /> Cartographie
          </button>
        </div>
        <div style={{ ...styles.menu, marginTop: 8 }}>
          <span style={styles.sectionLabel}>ARCHIVES</span>
          <button style={{ ...styles.navItem, ...(currentView === 'archives' ? styles.navItemActive : {}) }} onClick={(e) => { spawnParticles(e.clientX, e.clientY, 4); setCurrentView('archives'); }}>
            <IconArchive /> Archives
          </button>
        </div>
      </aside>

      {/* ===== Main Content Area ===== */}
      <div style={{ ...styles.mainContent, backgroundColor: COLORS.mainBg }}>
        {/* Sticky header bar with dynamic title */}
        <header style={{ position: 'sticky', top: 0, height: 51, display: 'flex', alignItems: 'center', padding: '0 27px', background: COLORS.cardBg, borderBottom: `1px solid ${COLORS.border}`, boxShadow: 'var(--shadow-sm)', zIndex: 10 }}>
          <h1 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>{currentView === 'sites' ? 'Sites Réseau' : currentView === 'cartographie' ? 'Cartographie' : currentView === 'archives' ? 'Archives' : 'Tickets'}</h1>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
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
                <MapComponent sites={sitesList} />
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
                      <th style={styles.th}>Statut</th>
                      <th style={{ ...styles.th, textAlign: 'center' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sitesLoading ? (
                      <tr><td colSpan="6" style={styles.emptyCell}>Chargement des sites...</td></tr>
                    ) : filteredSites.length === 0 ? (
                      <tr><td colSpan="6" style={styles.emptyCell}>Aucun site trouve.</td></tr>
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
                          {/* Status badge */}
                          <td style={styles.td}>
                            <span style={{ padding: '3px 10px', borderRadius: 4, fontWeight: 700, fontSize: 11, backgroundColor: ST_BG[site.statut] || '#F1F5F9', color: ST[site.statut] || '#64748B' }}>
                              {SITE_LABELS[site.statut] || site.statut}
                            </span>
                          </td>
                          {/* Actions: modifier + archiver icons */}
                          <td style={{ ...styles.td, textAlign: 'center' }}>
                            {isArchived ? (
                              <span style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 600 }}>Archivé</span>
                            ) : (
                            <div style={styles.statusActions}>
                              <button onClick={(e) => { e.stopPropagation(); setSelectedSite(site); }} title="Modifier"
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, border: '1px solid #2563EB33', background: '#2563EB0D', color: '#2563EB', cursor: 'pointer' }}>
                                <IconEdit style={{ width: 12, height: 12 }} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleArchiverSite(site.id); }} title="Archiver"
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, border: '1px solid #DC262633', background: '#DC26260D', color: '#DC2626', cursor: 'pointer' }}>
                                <IconArchive style={{ width: 12, height: 12 }} />
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
        )) : currentView === 'archives' ? (
          /* ---------- Archives View (Sites + Tickets, read-only) ---------- */
          <div style={styles.pageContent}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#64748B22,#64748B0A)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconArchive style={{ width: 18, height: 18, color: '#64748B' }} />
              </span>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Archives</h2>
                <span style={{ fontSize: 10, color: 'var(--text-muted2)' }}>Consultation seule</span>
              </div>
            </div>
            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 6, background: 'var(--bg-toolbar)', borderRadius: 8, padding: 4, marginBottom: 16 }}>
              {[
                { key: 'sites', label: 'Sites', icon: <IconSite style={{ width: 13, height: 13 }} />, count: archivedSites.length },
                { key: 'tickets', label: 'Tickets', icon: <IconTicket style={{ width: 13, height: 13 }} />, count: archivedTickets.length },
              ].map((tab) => (
                <button key={tab.key} onClick={() => setArchiveTab(tab.key)}
                  style={{ padding: '7px 16px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
                    background: archiveTab === tab.key ? 'var(--bg-card)' : 'transparent',
                    color: archiveTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted3)',
                    boxShadow: archiveTab === tab.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                  {tab.icon} {tab.label}
                  <span style={{ fontSize: 9, fontWeight: 700, background: archiveTab === tab.key ? '#64748B22' : 'var(--bg-hover)', color: archiveTab === tab.key ? '#64748B' : 'var(--text-muted2)', padding: '1px 6px', borderRadius: 8, lineHeight: '16px' }}>{tab.count}</span>
                </button>
              ))}
            </div>
            <div style={{ ...styles.tableCard, backgroundColor: COLORS.cardBg }}>
              <div style={{ overflowX: 'auto' }}>
                {archiveTab === 'sites' ? (
                  archivedLoading ? (
                    <div style={{ padding: 50, textAlign: 'center', color: 'var(--text-muted2)', fontSize: 12 }}>Chargement...</div>
                  ) : archivedSites.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted2)', fontSize: 12 }}>
                      <IconArchive style={{ width: 32, height: 32, color: 'var(--text-muted2)', opacity: 0.3, margin: '0 auto 12px' }} />
                      <div style={{ fontWeight: 600 }}>Aucun site archivé</div>
                    </div>
                  ) : (
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.thRow}>
                          <th style={styles.th}>Code Site</th><th style={styles.th}>Nom Site</th><th style={styles.th}>Wilaya</th><th style={styles.th}>Commune</th><th style={styles.th}>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {archivedSites.map((site) => (
                          <tr key={site.id} style={styles.tr}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}>
                            <td style={{ ...styles.td, fontWeight: 600 }}>{site.codeSite}</td>
                            <td style={styles.td}>{site.nom}</td>
                            <td style={styles.td}>{site.wilaya}</td>
                            <td style={styles.td}>{site.commune}</td>
                            <td style={styles.td}>
                              <span style={{ padding: '3px 10px', borderRadius: 4, fontWeight: 700, fontSize: 11, backgroundColor: ST_BG[site.statut] || '#F1F5F9', color: ST[site.statut] || '#64748B' }}>
                                {SITE_LABELS[site.statut] || site.statut}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                ) : (
                  archivedTickets.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted2)', fontSize: 12 }}>
                      <IconArchive style={{ width: 32, height: 32, color: 'var(--text-muted2)', opacity: 0.3, margin: '0 auto 12px' }} />
                      <div style={{ fontWeight: 600 }}>Aucun ticket archivé</div>
                    </div>
                  ) : (
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.thRow}>
                          <th style={styles.th}>N° Ticket</th><th style={styles.th}>Client</th><th style={styles.th}>Site</th><th style={styles.th}>Priorité</th><th style={styles.th}>Archivé le</th>
                        </tr>
                      </thead>
                      <tbody>
                        {archivedTickets.map((t) => (
                          <tr key={t.id} style={styles.tr}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}>
                            <td style={{ ...styles.td, fontWeight: 600 }}>{t.numero_ticket}</td>
                            <td style={styles.td}>{t.nom_complet_client || t.nom_client}</td>
                            <td style={styles.td}>{t.site?.nom || '-'}</td>
                            <td style={styles.td}>
                              <span style={{ padding: '3px 10px', borderRadius: 4, fontWeight: 700, fontSize: 11, backgroundColor: (COLORS.priorities[t.priorite?.toUpperCase()] || COLORS.priorities.NORMALE).bg, color: (COLORS.priorities[t.priorite?.toUpperCase()] || COLORS.priorities.NORMALE).text }}>
                                {{ basse:'Basse', normale:'Normal', haute:'Haute', critique:'Critique' }[t.priorite?.toLowerCase()] || t.priorite}
                              </span>
                            </td>
                            <td style={{ ...styles.td, color: 'var(--text-muted)' }}>{t.archived_at ? new Date(t.archived_at).toLocaleDateString('fr', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                )}
              </div>
            </div>
          </div>
        ) : (
        /* ---------- Tickets View ---------- */
        <div style={styles.pageContent}>
          {/* ─── Stats Row ─── */}
          <div style={styles.statsRow}>
            <div className="fade-in stat-card" style={{ ...styles.statCard, borderLeftColor: '#3B82F6', backgroundColor: COLORS.cardBg, animationDelay: '0s' }}>
              <span style={{ ...styles.statNumber, color: '#171a21' }}>{groupeStats.tickets_total || 0}</span>
              <span style={styles.statLabel}>Total tickets</span>
            </div>
            <div className="fade-in stat-card" style={{ ...styles.statCard, borderLeftColor: '#D97706', backgroundColor: COLORS.cardBg, animationDelay: '0.05s' }}>
              <span style={{ ...styles.statNumber, color: '#D97706' }}>{groupeStats.tickets_ouverts || 0}</span>
              <span style={styles.statLabel}>Ouverts</span>
            </div>
            <div className="fade-in stat-card" style={{ ...styles.statCard, borderLeftColor: '#15803D', backgroundColor: COLORS.cardBg, animationDelay: '0.1s' }}>
              <span style={{ ...styles.statNumber, color: '#15803D' }}>{groupeStats.tickets_resolus || 0}</span>
              <span style={styles.statLabel}>Résolus</span>
            </div>
            <div className="fade-in stat-card" style={{ ...styles.statCard, borderLeftColor: '#8B5CF6', backgroundColor: COLORS.cardBg, animationDelay: '0.15s' }}>
              <span style={{ ...styles.statNumber, color: '#8B5CF6' }}>{groupeStats.reclamations_total || 0}</span>
              <span style={styles.statLabel}>Réclamations</span>
            </div>
          </div>

          <div className="fade-in table-card" style={{ ...styles.tableCard, backgroundColor: COLORS.cardBg, animationDelay: '0.1s' }}>
            {/* Toolbar with title, search and filter */}
            <div style={{ ...styles.toolbar, borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={styles.toolbarLeft}>
                <h2 style={{ ...styles.tableTitle, color: '#181c24' }}>Liste des tickets</h2>
              </div>

              <div style={styles.toolbarActions}>
                <button onClick={() => setShowFilters(!showFilters)} style={{ ...styles.btnFilter, backgroundColor: COLORS.cardBg, color: '#3a404a', border: `1px solid ${COLORS.border}` }}>
                  <IconFilter style={{ marginRight: '6px' }} /> Filtrer
                </button>

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

            {/* Collapsible filter panel */}
            {showFilters && (
              <div style={{ ...styles.filterArea, backgroundColor: '#fafbfc', borderBottom: `1px solid ${COLORS.border}` }}>
                <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)} style={{ ...styles.filterSelect, backgroundColor: 'var(--inputBg, #FFFFFF)', color: '#4e5561', border: `1px solid ${COLORS.border}` }}>
                  <option value="">Tous statuts</option>
                  <option value="ouvert">Ouvert</option>
                  <option value="ferme">Fermé</option>
                </select>
                <select value={filterSiteId} onChange={(e) => setFilterSiteId(e.target.value)} style={{ ...styles.filterSelect, backgroundColor: 'var(--inputBg, #FFFFFF)', color: '#4e5561', border: `1px solid ${COLORS.border}` }}>
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
              </div>
            )}

            {/* ─── Ticket Cards Grid ─── */}
            <div style={{ padding: '20px' }}>
              {groupeLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMuted }}>Chargement des tickets...</div>
              ) : filteredGroupeTickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMuted }}>Aucun ticket trouvé.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
                  {filteredGroupeTickets.map((groupe) => {
                      const prio = COLORS.priorities[groupe.priorite?.toUpperCase()] || COLORS.priorities.NORMALE;
                      const statutKey = getStatutKey(groupe.statut);
                      const stat = COLORS.status[statutKey] || COLORS.status.OUVERT;

                      return (
                        <div
                          key={groupe.id}
                          onClick={() => setSelectedGroupe(groupe)}
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '12px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                            border: `1px solid ${COLORS.border}`,
                            borderLeft: `4px solid ${prio.side}`,
                            padding: '0',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            overflow: 'hidden',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'none'; }}
                        >
                          {/* Top color band */}
                          <div style={{ height: '3px', background: `linear-gradient(90deg, ${prio.side}, ${prio.side}44)` }} />

                          <div style={{ padding: '14px 18px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Header: ticket number + badges */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: COLORS.textMuted, letterSpacing: '0.3px' }}>{groupe.numero_ticket}</span>
                              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                {groupe.has_entreprise && (
                                  <span style={{ padding: '2px 7px', borderRadius: '4px', fontWeight: 700, fontSize: '9px', backgroundColor: '#FFF3E0', color: '#E65100', border: '1px solid #FFB74D' }}>
                                    ENT
                                  </span>
                                )}
                                <span style={{ padding: '2px 7px', borderRadius: '4px', fontWeight: 700, fontSize: '9px', backgroundColor: prio.bg, color: prio.text }}>
                                  {{ basse:'Basse', normale:'Normal', haute:'Haute', critique:'Critique' }[groupe.priorite?.toLowerCase()] || groupe.priorite}
                                </span>
                              </div>
                            </div>

                            {/* Title */}
                            <div style={{ fontSize: '14px', fontWeight: 700, color: COLORS.textDark, lineHeight: '1.35', minHeight: '38px' }}>
                              {groupe.titre}
                            </div>

                            {/* Site name */}
                            <div style={{ fontSize: '12px', color: COLORS.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <IconSite style={{ width: 13, height: 13, opacity: 0.6 }} />
                              <span>{groupe.site_display}</span>
                            </div>

                            {/* Divider */}
                            <div style={{ height: '1px', background: COLORS.border, margin: '0 -2px' }} />

                            {/* Bottom row: date, recl count, status */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '10px', backgroundColor: stat.bg, color: stat.text, gap: '5px' }}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: stat.dot, display: 'inline-block' }} />
                                  {statutKey}
                                </span>
                                <span style={{ fontSize: '10px', color: COLORS.textMuted }}>
                                  {groupe.reclamations_count || groupe.nombre_reclamations} récl.
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '10px', color: COLORS.textMuted }}>{formatDateFr(groupe.premier_signalement || groupe.created_at)}</span>
                                <div style={{ display: 'flex', gap: '3px' }}>
                                  {groupe.statut === 'ouvert' && (
                                    <button
                                      disabled={updatingGroupeId === groupe.id}
                                      onClick={(e) => { e.stopPropagation(); handleResoudreGroupe(groupe.id); }}
                                      style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #15803D33', backgroundColor: '#DCFCE7', color: '#15803D', fontSize: '10px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#BBF7D0'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#DCFCE7'; }}
                                    >Résoudre</button>
                                  )}
                                  {groupe.locked_by && groupe.locked_by !== '-' ? (
                                    <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '9px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                      {groupe.locked_by_display || 'En cours'}
                                    </span>
                                  ) : groupe.statut === 'ouvert' && (!groupe.assigne_a_display || groupe.assigne_a_display === '-') ? (
                                    <button
                                      disabled={updatingGroupeId === groupe.id}
                                      onClick={(e) => { e.stopPropagation(); handleAssignerGroupe(groupe.id); }}
                                      style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #2563EB33', backgroundColor: '#EFF6FF', color: '#2563EB', fontSize: '10px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#DBEAFE'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#EFF6FF'; }}
                                    >S'assigner</button>
                                  ) : groupe.assigne_a_display && groupe.assigne_a_display !== '-' ? (
                                    <span style={{ fontSize: '10px', color: COLORS.textMuted, padding: '2px 6px', backgroundColor: '#F1F5F9', borderRadius: '4px' }}>
                                      {groupe.assigne_a_display}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

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

      {/* ===== Grouped Ticket Detail Modal ===== */}
      {selectedGroupe && (
        <div className="fade-in" style={styles.overlay} onClick={() => setSelectedGroupe(null)}>
          <div className="scale-in" style={{ ...styles.modal, maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ width: '4px', height: '36px', borderRadius: '2px', background: 'linear-gradient(180deg, #e60023, #FF6B3D)' }} />
                <h2 style={styles.modalTitle}>{selectedGroupe.numero_ticket}</h2>
                <span style={{ padding: '4px 12px', borderRadius: '6px', fontWeight: 700, fontSize: '11px', backgroundColor: (COLORS.status[getStatutKey(selectedGroupe.statut)] || COLORS.status.OUVERT).bg, color: (COLORS.status[getStatutKey(selectedGroupe.statut)] || COLORS.status.OUVERT).text, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: (COLORS.status[getStatutKey(selectedGroupe.statut)] || COLORS.status.OUVERT).dot }} />
                  {getStatutKey(selectedGroupe.statut)}
                </span>
                <span style={{ padding: '4px 12px', borderRadius: '6px', fontWeight: 700, fontSize: '11px', backgroundColor: (COLORS.priorities[selectedGroupe.priorite?.toUpperCase()] || COLORS.priorities.NORMALE).bg, color: (COLORS.priorities[selectedGroupe.priorite?.toUpperCase()] || COLORS.priorities.NORMALE).text }}>
                  {{ basse:'Basse', normale:'Normal', haute:'Haute', critique:'Critique' }[selectedGroupe.priorite?.toLowerCase()] || selectedGroupe.priorite}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedGroupe.statut === 'ferme' && (
                  <button
                    disabled={updatingGroupeId === selectedGroupe.id}
                    onClick={() => handleAssignerGroupe(selectedGroupe.id)}
                    style={{ display: 'flex', alignItems: 'center', backgroundColor: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s ease', whiteSpace: 'nowrap' }}
                  >
                    <IconUser style={{ marginRight: '4px', width: '12', height: '12' }} />
                    Prendre le ticket
                  </button>
                )}
                {selectedGroupe.statut === 'ouvert' && (
                  <button
                    disabled={updatingGroupeId === selectedGroupe.id}
                    onClick={() => handleResoudreGroupe(selectedGroupe.id)}
                    style={{ display: 'flex', alignItems: 'center', backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #A7F3D0', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s ease', whiteSpace: 'nowrap' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}><path d="M4 12l5 5 11-11" /></svg>
                    Resoudre
                  </button>
                )}
                <button style={styles.modalClose} onClick={() => setSelectedGroupe(null)}><IconX /></button>
              </div>
            </div>

            <div style={styles.modalBody}>
              {/* Title */}
              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '4px', backgroundColor: '#FEF3C7', marginRight: '8px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                  </span>
                  Titre
                </h3>
                <p style={{ fontSize: '16px', fontWeight: 700, color: COLORS.textDark, margin: 0 }}>{selectedGroupe.titre}</p>
              </div>

              {/* Site info */}
              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '4px', backgroundColor: '#EFF6FF', marginRight: '8px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                  </span>
                  Site
                </h3>
                <div style={styles.modalGrid}>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Nom</span>
                    <span style={styles.modalValue}>{selectedGroupe.site_display || '-'}</span>
                  </div>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Assigné à</span>
                    <span style={styles.modalValue}>{selectedGroupe.assigne_a_display || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedGroupe.description && (
                <div style={styles.modalSection}>
                  <h3 style={styles.modalSectionTitle}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '4px', backgroundColor: '#EDE9FE', marginRight: '8px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                    </span>
                    Description du problème
                  </h3>
                  <div style={{ padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: `1px solid ${COLORS.border}`, borderLeft: '3px solid #7C3AED' }}>
                    <p style={{ fontSize: '13px', color: COLORS.textDark, lineHeight: '1.7', margin: 0, whiteSpace: 'pre-wrap' }}>{selectedGroupe.description}</p>
                  </div>
                </div>
              )}

              {/* Keywords */}
              {selectedGroupe.mots_cles && (
                <div style={styles.modalSection}>
                  <h3 style={styles.modalSectionTitle}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '4px', backgroundColor: '#F0FDF4', marginRight: '8px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
                    </span>
                    Mots-clés consolidés
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedGroupe.mots_cles.split(',').map((kw, i) => (
                      <span key={i} style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, backgroundColor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
                        {kw.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Reclamations list */}
              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '4px', backgroundColor: '#F1F5F9', marginRight: '8px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></svg>
                  </span>
                  Réclamations ({selectedGroupe.reclamations?.length || selectedGroupe.reclamations_count || 0})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                  {selectedGroupe.reclamations?.map((rec) => {
                    const recPrio = COLORS.priorities[rec.priorite?.toUpperCase()] || COLORS.priorities.NORMALE;
                    const recStat = COLORS.status[getStatutKey(rec.statut)] || COLORS.status.OUVERT;
                    return (
                      <div key={rec.id} style={{ padding: '12px 14px', backgroundColor: '#FAFBFC', borderRadius: '10px', border: `1px solid ${COLORS.border}`, borderLeft: `4px solid ${recPrio.side}`, transition: 'all 0.15s ease' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: COLORS.textDark }}>{rec.numero_ticket}</span>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, backgroundColor: recPrio.bg, color: recPrio.text }}>{{ basse:'Basse', normale:'Normal', haute:'Haute', critique:'Critique' }[rec.priorite?.toLowerCase()] || rec.priorite}</span>
                          </div>
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, backgroundColor: recStat.bg, color: recStat.text }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: recStat.dot, marginRight: '4px', display: 'inline-block' }} />
                            {getStatutKey(rec.statut)}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: COLORS.textDark, fontWeight: 600 }}>{rec.nom_complet_client || rec.nom_client}</div>
                        <div style={{ fontSize: '11px', color: COLORS.textMuted, marginTop: '3px' }}>{rec.telephone_client} — {formatDateFr(rec.created_at)}</div>
                        {rec.mots_cles_ia && (
                          <div style={{ fontSize: '10px', color: '#16A34A', marginTop: '4px', fontStyle: 'italic', fontWeight: 500 }}>Mots-clés: {rec.mots_cles_ia}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dates */}
              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '4px', backgroundColor: '#F1F5F9', marginRight: '8px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" /></svg>
                  </span>
                  Dates
                </h3>
                <div style={styles.modalGrid}>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Premier signalement</span>
                    <span style={styles.modalValue}>{formatDateTimeFr(selectedGroupe.premier_signalement || selectedGroupe.created_at)}</span>
                  </div>
                  <div style={styles.modalField}>
                    <span style={styles.modalLabel}>Dernière mise à jour</span>
                    <span style={styles.modalValue}>{formatDateTimeFr(selectedGroupe.updated_at)}</span>
                  </div>
                  {selectedGroupe.resolu_le && (
                    <div style={styles.modalField}>
                      <span style={styles.modalLabel}>Résolu le</span>
                      <span style={styles.modalValue}>{formatDateTimeFr(selectedGroupe.resolu_le)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div style={styles.modalFooter}>
              {/* Lock indicator — hidden when ticket is ouvert */}
              {selectedGroupe.statut !== 'ouvert' && selectedGroupe.locked_by && selectedGroupe.locked_by !== '-' && (
                <div style={{ width: '100%', padding: '8px 12px', backgroundColor: '#FEF3C7', borderRadius: '8px', fontSize: '11px', color: '#92400E', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #FDE68A' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  En cours par <strong>{selectedGroupe.locked_by_display || selectedGroupe.locked_by}</strong>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'stretch', width: '100%' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
                {selectedGroupe.statut === 'ouvert' && (!selectedGroupe.assigne_a_display || selectedGroupe.assigne_a_display === '-') && (
                  <button
                    disabled={updatingGroupeId === selectedGroupe.id}
                    onClick={() => handleAssignerGroupe(selectedGroupe.id)}
                    style={{ display: 'flex', alignItems: 'center', backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s ease' }}
                  >
                    <IconUser style={{ marginRight: '4px', width: '12', height: '12' }} />
                    S'assigner
                  </button>
                )}
                </div>
                <button style={{ display: 'flex', alignItems: 'center', padding: '8px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, border: 'none', backgroundColor: '#DC2626', color: '#FFFFFF', cursor: 'pointer', transition: 'all 0.15s ease', boxShadow: '0 2px 8px rgba(220,38,38,0.25)', whiteSpace: 'nowrap' }} onClick={() => setSelectedGroupe(null)}>Fermer</button>
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
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modal: { backgroundColor: 'var(--cardBg, #FFFFFF)', borderRadius: '14px', width: '700px', maxWidth: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${COLORS.border}`, background: 'linear-gradient(180deg, rgba(248,250,252,0.8) 0%, rgba(255,255,255,0) 100%)' },
  modalTitle: { margin: 0, fontSize: '18px', fontWeight: 700, color: COLORS.textDark, letterSpacing: '-0.01em' },
  modalClose: { width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FEE2E2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#DC2626', padding: '4px', transition: 'all 0.15s ease' },
  modalBody: { padding: '24px', overflowY: 'auto', flex: 1 },
  modalGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
  modalSection: { marginBottom: '20px' },
  modalSectionTitle: { fontSize: '11px', fontWeight: 700, color: COLORS.textDark, textTransform: 'uppercase', margin: '0 0 12px 0', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', paddingBottom: '8px', borderBottom: '2px solid var(--border-light)' },
  modalField: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid var(--border-light)` },
  modalLabel: { fontSize: '12px', color: COLORS.textMuted, fontWeight: 500 },
  modalValue: { fontSize: '13px', color: COLORS.textDark, fontWeight: 600 },
  modalText: { fontSize: '13px', color: COLORS.textDark, lineHeight: '1.7', margin: 0, whiteSpace: 'pre-wrap' },
  comment: { padding: '12px', backgroundColor: 'var(--inputBg, #F8FAFC)', borderRadius: '8px', marginBottom: '8px' },
  modalFooter: { padding: '16px 24px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(0deg, rgba(248,250,252,0.6) 0%, rgba(255,255,255,0) 100%)' },
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
