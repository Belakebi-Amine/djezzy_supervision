/**
 * AdminDashboard.jsx
 *
 * Main dashboard component for the admin panel of the Djezzy supervision platform.
 * Provides a full-featured NOC (Network Operations Center) interface including:
 *   - Real-time KPIs and charts for network/ticket monitoring
 *   - Ticket (reclamation) management with status workflows
 *   - 5G site management (CRUD, status toggling, archiving)
 *   - User management (create, edit, activate/deactivate, delete)
 *   - Interactive map view of network sites
 *   - Supervisor reports viewer
 *   - Team performance analytics
 *
 * Only accessible to users with the ADMIN role; non-admins are redirected
 * to the engineer dashboard on mount.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import DOMPurify from 'dompurify';
import { useCountUp, useRipple, spawnParticles } from '../hooks/useAnimations';
import {
  getDashboardStats, getDashboardReporting,
  getRapportsIA, deleteRapportIA,
} from '../api/dashboard';
import { getSites, getUsers, createUser, getTickets, createTicket, updateTicket, createSite, updateSiteStatus, archiverSite, archiveUser, updateUser, restoreUser, deleteUser, getTokenRole } from '../api/tickets';
import MapComponent from '../components/Map';
import DetailModal from '../components/DetailModal';
import logoDjezzy from '../assets/Djezzy_Logo.png';

// ─── Theme colors and style constants ───
const COLORS = {
  sidebarBg: 'var(--bg-sidebar)', mainBg: 'var(--bg-main)', cardBg: 'var(--bg-card)',
  textDark: 'var(--text-primary)', textMuted: 'var(--text-muted)', border: 'var(--border-color)', djezzyRed: '#e60023',
  accent: '#E8401A', accentDark: '#9A2A3C',
  // Client type badge styles
  types: {
    PARTICULIER: { bg: '#E2E8F0', text: '#475569', border: '#CBD5E1' },
    ENTREPRISE: { bg: '#475569', text: '#FFFFFF', border: '#334155' },
  },
  // Priority level badge styles (Basse -> Critique)
  priorities: {
    BASSE: { bg: '#E0F2FE', text: '#0284C7', side: '#0284C7' },
    NORMALE: { bg: '#DCFCE7', text: '#15803D', side: '#15803D' },
    HAUTE: { bg: '#FEF3C7', text: '#D97706', side: '#D97706' },
    CRITIQUE: { bg: '#FEE2E2', text: '#DC2626', side: '#DC2626' },
  },
  // Ticket status badge styles
  status: {
    OUVERT: { bg: '#BAE6FD', text: '#0369A1', dot: '#0284C7' },
    RESOLU: { bg: '#A7F3D0', text: '#047857', dot: '#15803D' },
    FERME: { bg: '#FECACA', text: '#B91C1C', dot: '#DC2626' },
  },
};
// Bar chart color palette
const PALETTE = ['#E8401A', '#2563EB', '#10B981', '#F59E0B', '#8B5CF6'];

// French label maps for priority and role enums
const LABEL_MAP = { critique: 'Critique', haute: 'Haute', normale: 'Normale', basse: 'Basse' };
const ROLE_LABELS = {
  ADMIN: 'ADMINISTRATEUR', INGENIEUR_RESEAUX: 'ING RÉSEAU',
  AGENT_CALL_CENTER: 'AGENT CC', SUPERVISEUR: 'SUPERVISEUR',
};
// Role badge color themes
const ROLE_STYLES = {
  ADMIN: { color: '#de2a3b', background: '#ffdfe2' },
  INGENIEUR_RESEAUX: { color: '#8b5e2f', background: '#efdac6' },
  AGENT_CALL_CENTER: { color: '#355ead', background: '#dce6ff' },
  SUPERVISEUR: { color: '#7440a5', background: '#eadcff' },
};
// Ticket status flow: defines which status transitions are allowed
const ALL_STATUSES = ['ferme', 'ouvert', 'resolu'];
const STATUS_FLOW = { ferme: ['ouvert'], ouvert: ['resolu'], resolu: [] };

// Site status display labels and colors
const SITE_LABELS = { UP: 'Actif', DOWN: 'Inactif' };
const ST = { UP: '#059669', DOWN: '#DC2626' };
const ST_BG = { UP: '#DCFCE7', DOWN: '#FEE2E2' };

// ─── Date formatting helpers (French locale) ───
const MOIS_FR = ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOU', 'SEP', 'OCT', 'NOV', 'DEC'];
const formatDateFr = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${MOIS_FR[d.getMonth()]}`;
};
const formatDateTimeFr = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${MOIS_FR[d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
// Returns today's date as DD/MM/YYYY
const now = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

// ─── Inline SVG icon components ───
// Common props applied to all icons for consistent sizing and stroke style
const iconProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IconDashboard = (p) => <svg {...iconProps} {...p}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>;
const IconMap = (p) => <svg {...iconProps} {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>;
const IconTicket = (p) => <svg {...iconProps} {...p}><path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 6v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-6V7Z" /><path d="M10 6v2M10 16v2" /></svg>;
const IconSite = (p) => <svg {...iconProps} {...p}><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.3" /></svg>;
const IconUsers = (p) => <svg {...iconProps} {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const IconReport = (p) => <svg {...iconProps} {...p}><path d="M4 9V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" /><path d="M4 13v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" /><path d="M2 9h20" /></svg>;
const IconX = (p) => <svg {...iconProps} {...p}><path d="M18 6L6 18M6 6l12 12" /></svg>;
const IconLogout = (p) => <svg {...iconProps} {...p}><path d="M15 16l4-4-4-4" /><path d="M19 12H8" /><path d="M12 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" /></svg>;
const IconSearch = (p) => <svg {...iconProps} {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>;
const IconPlus = (p) => <svg {...iconProps} {...p}><path d="M12 5v14M5 12h14" /></svg>;
const IconRefresh = (p) => <svg {...iconProps} {...p}><path d="M3 12a9 9 0 0 1 15.5-6.3M21 12a9 9 0 0 1-15.5 6.3" /><path d="M3 4v5h5M21 20v-5h-5" /></svg>;
const IconFilter = (p) => <svg {...iconProps} {...p}><path d="M4 5h16l-6 7v6l-4 1v-7L4 5Z" /></svg>;
const IconCheck = (p) => <svg {...iconProps} {...p}><path d="M4 12l5 5 11-11" /></svg>;
const IconInfo = (p) => <svg {...iconProps} {...p}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>;
const IconUser = (p) => <svg {...iconProps} {...p}><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>;
const IconArchive = (p) => <svg {...iconProps} {...p}><path d="M21 4H3M8 2v2M16 2v2M4 7l1 12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2l1-12M10 11v6M14 11v6" /></svg>;
const IconTrash = (p) => <svg {...iconProps} {...p}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;
const IconEdit = (p) => <svg {...iconProps} {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;

// ─── Utility: normalize status string for color lookup ───
const getStatutKey = (statut) => statut?.replace('_', ' ').toUpperCase();

// Returns a color based on availability percentage thresholds
const dispoColor = (v) => {
  if (v >= 100) return '#059669';
  if (v >= 75) return '#65A30D';
  if (v >= 50) return '#F59E0B';
  if (v >= 25) return '#EA580C';
  return '#DC2626';
};

// ─── Recharts custom tooltip component ───
const Tip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '8px 14px', boxShadow: 'var(--shadow-card)', fontSize: 12 }}>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{label}</p>
      {payload.map((e, i) => (
        <p key={i} style={{ margin: '2px 0', color: e.color || '#555' }}>
          {e.name}: {typeof e.value === 'number' ? e.value.toLocaleString() : e.value}
        </p>
      ))}
    </div>
  );
};

/**
 * InfoPopup - Hover-triggered tooltip that displays help text.
 * Positioned relative to the hovered element using fixed positioning.
 */
function InfoPopup({ text }) {
  const [state, setState] = useState({ open: false, style: {} });
  return (
    <span style={{ position: 'relative', display: 'inline-flex', marginLeft: 6, cursor: 'pointer' }}
      onMouseEnter={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setState({ open: true, style: { top: r.bottom + 6, left: Math.max(4, r.left + r.width / 2 - 130) } });
      }}
      onMouseLeave={() => setState({ open: false, style: {} })}>
      <IconInfo style={{ width: 14, height: 14, color: 'var(--text-muted2)' }} />
      {state.open && (
        <div style={{
          position: 'fixed', top: state.style.top, left: state.style.left,
          background: 'var(--text-primary)', color: 'var(--bg-card)', padding: '8px 12px', borderRadius: 6,
          fontSize: 10, lineHeight: 1.5, zIndex: 99999, maxWidth: 260,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)', pointerEvents: 'none',
        }}>
          {text}
          <div style={{ position: 'absolute', top: '-5px', left: '50%', marginLeft: -5,
            border: '5px solid transparent', borderBottomColor: 'var(--text-primary)' }} />
        </div>
      )}
    </span>
  );
}

// Animated KPI card with count-up and ripple on click
function AnimatedKpi({ label, value, sub, color, accent }) {
  // Extract numeric value from string (e.g. "95%" -> 95)
  const numVal = parseFloat(String(value).replace(/[^0-9.]/g, ''));
  const animated = useCountUp(Number.isNaN(numVal) ? 0 : numVal, 900);
  // Keep the suffix character (e.g. "%")
  const suffix = String(value).replace(/[0-9.]/g, '');
  const { containerRef, spawnRipple } = useRipple();
  return (
    <div ref={containerRef} onClick={spawnRipple}
      className="interactive-card stagger-child"
      style={{ padding: '14px 16px', background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 8, boxShadow: 'var(--shadow-sm)', position: 'relative', overflow: 'hidden' }}>
      <span style={{ display: 'block', marginBottom: 4, fontSize: 8, fontWeight: 700, color: 'var(--text-muted3)', textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</span>
      <strong className="counter-value" style={{ fontSize: 22, color, lineHeight: 1.2, display: 'block' }}>{Number.isNaN(numVal) ? value : `${Math.round(animated)}${suffix}`}</strong>
      <span style={{ fontSize: 9, color: 'var(--text-muted2)', marginTop: 2, display: 'block' }}>{sub}</span>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  // ─── Role-based access guard: only admins can access this page ───
  const tokenRole = getTokenRole();
  const isAdmin = tokenRole === 'ADMIN';
  useEffect(() => {
    if (!isAdmin) navigate('/engineer-dashboard', { replace: true });
  }, [isAdmin, navigate]);

  // ─── Navigation & view state ───
  const [currentView, setCurrentView] = useState('dashboard');
  const [period, setPeriod] = useState(30); // reporting period in days

  // ─── Core data state ───
  const [stats, setStats] = useState(null);
  const [reporting, setReporting] = useState(null);
  const [sites, setSites] = useState([]);
  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [detail, setDetail] = useState(null); // detail modal for chart drill-down

  // ─── Search and filter state ───
  const [searchTerm, setSearchTerm] = useState('');

  // ─── Loading/optimistic update indicators ───
  const [updatingId, setUpdatingId] = useState(null);
  const [togglingSiteId, setTogglingSiteId] = useState(null);

  // ─── Modal visibility states ───
  const [showUserForm, setShowUserForm] = useState(false);
  const [showEditUserForm, setShowEditUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [hoveredUser, setHoveredUser] = useState(null); // user tooltip in ticket detail
  const [submitting, setSubmitting] = useState(false);

  // ─── Toast notification system ───
  // Notifications auto-dismiss after 3.5 seconds
  const [notifications, setNotifications] = useState([]);
  const addNotification = useCallback((message, type = 'success') => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 3500);
  }, []);
  // Rapport IA state
  const [allRapports, setAllRapports] = useState([]);
  const [selectedRapport, setSelectedRapport] = useState(null);
  const [loadingRapports, setLoadingRapports] = useState(false);

  // Performance state
  // ─── Performance view: toggles between engineers and call center agents ───
  const [perfRole, setPerfRole] = useState('ingenieurs');
  const [perfUser, setPerfUser] = useState(null);

  // ─── Filter visibility and filter values ───
  const [showFilters, setShowFilters] = useState(false);
  const [showSiteFilters, setShowSiteFilters] = useState(false);
  const [filterStatut, setFilterStatut] = useState('');
  const [filterPriorite, setFilterPriorite] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterSiteId, setFilterSiteId] = useState('');
  const [siteFilterWilaya, setSiteFilterWilaya] = useState('');
  const [siteFilterCommune, setSiteFilterCommune] = useState('');
  const [siteFilterStatut, setSiteFilterStatut] = useState('');

  // ─── Form data for creating new entities ───
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', role: 'AGENT_CALL_CENTER', password: '', password2: '',
  });
  const [ticketForm, setTicketForm] = useState({
    nom_client: '', telephone_client: '', email_client: '', type_client: 'particulier',
    site: '', priorite: 'normale', mots_cles_ia: '',
  });
  const [siteForm, setSiteForm] = useState({
    nom: '', wilaya: '', commune: '', coordX: '', coordY: '', adresse: '', statut: 'UP', technologie: '5G',
  });

  // ─── Data fetching functions ───
  // Fetches dashboard stats and reporting data in parallel based on selected period
  const fetchStats = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([getDashboardStats(period), getDashboardReporting(period)]);
      setStats(a); setReporting(b);
    } catch { setStats(null); setReporting(null); }
  }, [period]);

  const fetchSites = useCallback(async () => {
    try { const d = await getSites(); setSites(Array.isArray(d) ? d : []); } catch { setSites([]); }
  }, []);
  const fetchUsers = useCallback(async () => {
    try { const d = await getUsers(); setUsers(Array.isArray(d) ? d : []); } catch { setUsers([]); }
  }, []);
  const fetchTickets = useCallback(async () => {
    try { const d = await getTickets(); setTickets(Array.isArray(d) ? d : []); } catch { setTickets([]); }
  }, []);
  const fetchRapports = useCallback(async () => {
    setLoadingRapports(true);
    try { const d = await getRapportsIA(); setAllRapports(Array.isArray(d) ? d : []); } catch { setAllRapports([]); }
    finally { setLoadingRapports(false); }
  }, []);

  // ─── Initial data load on mount and when period changes ───
  useEffect(() => {
    fetchStats(); fetchSites(); fetchUsers(); fetchTickets();
  }, [fetchStats, fetchSites, fetchUsers, fetchTickets]);

  // Load supervisor reports only when the reports view is active
  useEffect(() => {
    if (currentView === 'reports') fetchRapports();
  }, [currentView, fetchRapports]);

  // Convenience: refresh stats + sites + tickets together
  const refreshAll = () => { fetchStats(); fetchSites(); fetchTickets(); };

  // Toggle report detail view (click same report to collapse)
  const handleViewRapport = useCallback((id) => {
    const r = allRapports.find((x) => x.id === id);
    if (r) setSelectedRapport(selectedRapport?.id === id ? null : r);
  }, [allRapports, selectedRapport]);

  // Delete an IA report with confirmation dialog
  const handleDeleteRapport = useCallback(async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm('Supprimer ce rapport ?')) return;
    try {
      await deleteRapportIA(id);
      setAllRapports((prev) => prev.filter((r) => r.id !== id));
      if (selectedRapport?.id === id) setSelectedRapport(null);
    } catch (err) { alert(err.message); }
  }, [selectedRapport]);

  // ─── Derived / computed data ───
  // Count users per role for the dashboard breakdown
  const roleCounts = {};
  users.forEach((u) => { const r = ROLE_LABELS[u.role_user] || u.role_user || 'INCONNU'; roleCounts[r] = (roleCounts[r] || 0) + 1; });
  const ticketsOuvert = tickets.filter((t) => t.statut === 'ouvert').length;
  const ticketsResolu = tickets.filter((t) => t.statut === 'resolu').length;

  // ─── Filtered users: search by name/email/code + optional role filter ───
  const filteredUsers = users.filter((u) => {
    const t = searchTerm.toLowerCase();
    const matchSearch = (u.nom_user || '').toLowerCase().includes(t) || (u.email || '').toLowerCase().includes(t) || (u.code_user || '').toLowerCase().includes(t);
    const matchRole = !userRoleFilter || u.role_user === userRoleFilter;
    return matchSearch && matchRole;
  });

  // ─── Filtered tickets: multi-criteria filtering (search, status, priority, type, date, site) ───
  const filteredTickets = tickets.filter((t) => {
    const term = searchTerm.toLowerCase();
    if (term && !t.nom_client?.toLowerCase().includes(term) && !t.numero_ticket?.toLowerCase().includes(term) &&
        !t.description?.toLowerCase().includes(term)) return false;
    if (filterStatut && t.statut !== filterStatut) return false;
    if (filterPriorite) { if ((t.priorite || '').toUpperCase() !== filterPriorite.toUpperCase()) return false; }
    if (filterType) { if ((t.type_client || '').toUpperCase() !== filterType.toUpperCase()) return false; }
    if (filterDate) { const d = new Date(t.created_at); if (d.toISOString().slice(0, 10) !== filterDate) return false; }
    if (filterSiteId) {
      const sid = t.site?.id || t.site;
      if (String(sid) !== String(filterSiteId)) return false;
    }
    return true;
  });

  // ─── Filtered sites: search by wilaya/commune + status filter, sorted by code number ───
  const filteredSites = sites.filter((s) => {
    if (siteFilterWilaya && !s.wilaya?.toLowerCase().includes(siteFilterWilaya.toLowerCase())) return false;
    if (siteFilterCommune && !s.commune?.toLowerCase().includes(siteFilterCommune.toLowerCase())) return false;
    if (siteFilterStatut && s.statut !== siteFilterStatut) return false;
    return true;
  }).sort((a, b) => {
    const na = parseInt(a.codeSite?.replace(/\D/g, '')) || 0;
    const nb = parseInt(b.codeSite?.replace(/\D/g, '')) || 0;
    return na - nb;
  });

  // ─── Chart data preparation ───
  // Evolution of tickets over time - format dates for display
  const evo = (stats?.graphiques?.evolution_tickets ?? []).map((d) => {
    const dd = new Date(d.jour);
    return { ...d, _raw: d.jour, jour: isNaN(dd.getTime()) ? d.jour : dd.toLocaleDateString('fr', { day: '2-digit', month: 'short' }) };
  });
  const reso = stats?.graphiques?.resolutions_par_jour ?? [];
  // Build a lookup map for daily resolution counts
  const evoResoMap = {};
  reso.forEach((r) => { const k = r.jour.slice(0, 10); evoResoMap[k] = (evoResoMap[k] || 0) + r.resolus; });
  // Merge created vs resolved into one dataset for comparison chart
  const creesVsResolus = evo.map((d) => ({ ...d, crees: d.total, resolus: evoResoMap[d._raw.slice(0, 10)] || 0 }));
  const topSites = stats?.graphiques?.top_sites_impactes ?? [];
  const communes = reporting?.tableau_communes ?? [];
  const wilayas = reporting?.tableau_complet_wilayas ?? [];
  const jourSemaine = stats?.graphiques?.tickets_par_jour_semaine ?? [];
  const delaiParPrio = stats?.graphiques?.delai_moyen_par_priorite ?? {};

  // ─── Key Performance Indicators (technical KPIs) ───
  const dispoGlobale = stats?.reseau_global?.disponibilite_globale ?? '100%';
  const tauxResolution = stats?.tickets?.taux_resolution ?? '0%';
  const delaiMoyen = stats?.tickets?.delai_moyen_resolution ?? 'N/A';
  const ouvertsCritiques = stats?.tickets?.ouverts_critiques ?? 0;

  // ─── Performance data: parse average delay from "Xh Ym" format to decimal hours ───
  const employes = (stats?.stats_employes ?? []).map((e) => {
    const m = (e.delai_moyen || '').match(/(\d+)h\s*(\d+)m/);
    return { ...e, label: `${e.nom} (${e.code})`, delai_h: m ? parseInt(m[1]) + parseInt(m[2]) / 60 : 0 };
  });
  const agentsCC = (stats?.stats_agents_cc ?? []).map((a) => ({ ...a, label: `${a.nom} (${a.code})` }));
  const perfUsers = perfRole === 'ingenieurs' ? employes : agentsCC;
  const selectedPerfUser = perfUsers.find((u) => u.code === perfUser) || null;

  // ─── Delay per priority chart: convert "Xh Ym" strings to decimal hours for bar chart ───
  const delaiPrioData = Object.entries(delaiParPrio).map(([k, v]) => {
    const match = (v || '').match(/(\d+)h\s*(\d+)m/);
    const hours = match ? parseInt(match[1]) + parseInt(match[2]) / 60 : 0;
    return {
      name: LABEL_MAP[k] || k,
      heures: Math.round(hours * 10) / 10,
      color: { critique: '#DC2626', haute: '#F59E0B', normale: '#2563EB', basse: '#10B981' }[k] || '#999',
    };
  }).filter(d => d.heures > 0);

  // ─── Event Handlers ───

  // Clear auth tokens and redirect to login
  const handleLogout = () => {
    ['token', 'access_token', 'refresh_token'].forEach((k) => localStorage.removeItem(k));
    navigate('/login');
  };

  // Create a new user account with password confirmation check
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.password2) { addNotification('Les mots de passe ne correspondent pas.', 'error'); return; }
    setSubmitting(true);
    try {
      await createUser({
        first_name: formData.first_name, last_name: formData.last_name,
        email: formData.email, role: formData.role, password: formData.password, password2: formData.password2,
      });
      setShowUserForm(false);
      setFormData({ first_name: '', last_name: '', email: '', role: 'AGENT_CALL_CENTER', password: '', password2: '' });
      fetchUsers();
      addNotification('Utilisateur créé avec succès', 'success');
    } catch { addNotification('Erreur lors de la création.', 'error'); } finally { setSubmitting(false); }
  };

  // Create a new ticket (reclamation)
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createTicket(ticketForm);
      setShowTicketForm(false);
      setTicketForm({ nom_client: '', telephone_client: '', email_client: '', type_client: 'particulier', site: '', priorite: 'normale', mots_cles_ia: '' });
      fetchTickets();
      addNotification('Ticket créé avec succès', 'success');
    } catch { addNotification('Erreur création ticket.', 'error'); } finally { setSubmitting(false); }
  };

  // Create a new network site
  const handleCreateSite = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createSite({ ...siteForm, coordX: siteForm.coordX || null, coordY: siteForm.coordY || null });
      setShowSiteForm(false);
      setSiteForm({ nom: '', wilaya: '', commune: '', coordX: '', coordY: '', adresse: '', statut: 'UP', technologie: '5G' });
      fetchSites();
      addNotification('Site créé avec succès', 'success');
    } catch { addNotification('Erreur création site.', 'error'); } finally { setSubmitting(false); }
  };

  // Transition ticket status following the defined STATUS_FLOW
  // e.g. ferme -> ouvert, ouvert -> resolu
  const handleTicketStatus = useCallback(async (id, newStatut, oldStatut) => {
    const msgs = {
      'ferme->ouvert': 'Confirmer l ouverture de ce ticket ?',
      'ouvert->resolu': 'Confirmer la resolution ?',
    };
    const key = `${oldStatut}->${newStatut}`;
    if (msgs[key] && !window.confirm(msgs[key])) return;
    setUpdatingId(id);
    try {
      await updateTicket(id, { statut: newStatut });
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, statut: newStatut } : t)));
      addNotification(`Ticket passé à ${newStatut}`, 'success');
    } catch { addNotification('Erreur mise à jour.', 'error'); }
    finally { setUpdatingId(null); }
  }, [addNotification]);

  // Archive a ticket by setting its status to "ferme"
  const handleArchiveTicket = useCallback(async (ticket) => {
    if (!window.confirm(`Archiver le ticket ${ticket.numero_ticket} ? (statut → ferme)`)) return;
    setUpdatingId(ticket.id);
    try {
      await updateTicket(ticket.id, { statut: 'ferme' });
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, statut: 'ferme' } : t)));
      setSelectedTicket(null);
      addNotification(`Ticket ${ticket.numero_ticket} archivé`, 'success');
    } catch { addNotification('Erreur archivage.', 'error'); }
    finally { setUpdatingId(null); }
  }, [addNotification]);

  // Toggle a site between UP (active) and DOWN (inactive)
  const handleToggleSite = useCallback(async (id, currentStatut) => {
    const newStatut = currentStatut === 'UP' ? 'DOWN' : 'UP';
    if (!window.confirm(`Confirmer le passage en ${newStatut === 'UP' ? 'actif' : 'inactif'} ?`)) return;
    setTogglingSiteId(id);
    try {
      await updateSiteStatus(id, { statut: newStatut });
      setSites((prev) => prev.map((s) => (s.id === id ? { ...s, statut: newStatut } : s)));
      addNotification(`Site passé en ${newStatut === 'UP' ? 'actif' : 'inactif'}`, 'success');
    } catch { addNotification('Erreur mise à jour statut.', 'error'); }
    finally { setTogglingSiteId(null); }
  }, [addNotification]);

  // Archive (soft-delete) a network site
  const handleArchiveSite = useCallback(async (id) => {
    if (!window.confirm('Archiver ce site ?')) return;
    setTogglingSiteId(id);
    try {
      await archiverSite(id);
      setSites((prev) => prev.filter((s) => s.id !== id));
      setSelectedSite(null);
      addNotification('Site archivé avec succès', 'success');
    }
    catch { addNotification("Erreur d'archivage.", 'error'); }
    finally { setTogglingSiteId(null); }
  }, [addNotification]);

  // Deactivate a user account (soft-delete via archive)
  const handleArchiveUser = useCallback(async (user) => {
    if (!window.confirm(`Désactiver l'utilisateur ${user.code_user} ?`)) return;
    setUpdatingId(user.id);
    try {
        await archiveUser(user.code_user);
      setUsers((prev) => prev.map((u) => u.code_user === user.code_user ? { ...u, is_active: false } : u));
      addNotification(`Utilisateur ${user.code_user} désactivé`, 'success');
    } catch { addNotification("Erreur lors de la désactivation.", 'error'); }
    finally { setUpdatingId(null); }
  }, [addNotification]);

  // Reactivate a previously deactivated user
  const handleRestoreUser = useCallback(async (user) => {
    setUpdatingId(user.id);
    try {
      await restoreUser(user.code_user);
      setUsers((prev) => prev.map((u) => u.code_user === user.code_user ? { ...u, is_active: true } : u));
      addNotification(`Utilisateur ${user.code_user} restauré`, 'success');
    } catch { addNotification("Erreur lors de la restauration.", 'error'); }
    finally { setUpdatingId(null); }
  }, [addNotification]);

  // Permanently delete a user account (irreversible)
  const handleDeleteUser = useCallback(async (user) => {
    if (!window.confirm(`Supprimer définitivement ${user.code_user} ? Cette action est irréversible.`)) return;
    setUpdatingId(user.id);
    try {
      await deleteUser(user.code_user);
      setUsers((prev) => prev.filter((u) => u.code_user !== user.code_user));
      addNotification(`Utilisateur ${user.code_user} supprimé`, 'success');
    } catch { addNotification("Erreur lors de la suppression.", 'error'); }
    finally { setUpdatingId(null); }
  }, [addNotification]);

  // ─── Edit user form state ───
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '', role: '' });

  // Populate edit form with existing user data and open modal
  const openEditUser = (u) => {
    setEditingUser(u);
    setEditForm({ first_name: u.first_name || '', last_name: u.last_name || '', email: u.email || '', role: u.role_user || 'AGENT_CALL_CENTER' });
    setShowEditUserForm(true);
  };

  // Submit updated user data to the API
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    try {
      await updateUser(editingUser.code_user, editForm);
      setUsers((prev) => prev.map((u) => u.code_user === editingUser.code_user ? { ...u, ...editForm, role_user: editForm.role } : u));
      setShowEditUserForm(false);
      setEditingUser(null);
      addNotification(`Utilisateur ${editingUser.code_user} mis à jour`, 'success');
    } catch { addNotification("Erreur lors de la mise à jour.", 'error'); }
    finally { setSubmitting(false); }
  };

  // ─── Helper: render a role badge with appropriate colors ───
  const getRoleBadge = (role) => {
    const s = ROLE_STYLES[role] || ROLE_STYLES.AGENT_CALL_CENTER;
    return <span style={{ ...styles.badgeBase, ...s }}>{ROLE_LABELS[role] || role || 'INCONNU'}</span>;
  };

  // ─── Helper: resolve ticket site display name ───
  const siteDisplay = (t) => {
    if (typeof t.site === 'object') return t.site?.nom || t.site?.codeSite || '-';
    const found = sites.find((s) => s.id === t.site);
    return found?.nom || found?.codeSite || '-';
  };

  // ─── Sidebar navigation ───
  const sidebar = () => (
    <aside style={styles.sidebar}>
      <div style={styles.brand}>
        <img src={logoDjezzy} alt="" style={styles.logo} />
        <div><div style={styles.brandName}>Djezzy Hub</div><div style={styles.brandRole}>Administrateur</div></div>
      </div>
      <div style={styles.menu}>
        <span style={styles.sectionLabel}>PRINCIPAL</span>
        {[
          { key: 'dashboard', label: 'Dashboard', icon: IconDashboard },
          { key: 'map', label: 'Cartographie', icon: IconMap },
          { key: 'tickets', label: 'Réclamations', icon: IconTicket },
          { key: 'sites', label: 'Sites Réseau', icon: IconSite },
          { key: 'users', label: 'Utilisateurs', icon: IconUsers },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={(e) => { spawnParticles(e.clientX, e.clientY, 4); setCurrentView(key); }}
            style={{ ...styles.navItem, ...(currentView === key ? styles.navItemActive : {}) }}>
            <Icon /> {label}
          </button>
        ))}
        <span style={{ ...styles.sectionLabel, marginTop: 16 }}>ANALYTICS</span>
        {[
          { key: 'performance', label: 'Performance', icon: IconUsers },
          { key: 'reports', label: 'Rapports (SV)', icon: IconReport },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={(e) => { spawnParticles(e.clientX, e.clientY, 4); setCurrentView(key); }}
            style={{ ...styles.navItem, ...(currentView === key ? styles.navItemActive : {}) }}>
            <Icon /> {label}
          </button>
        ))}
      </div>
      <div style={{ ...styles.menu, marginTop: 'auto' }}>
        <span style={styles.sectionLabel}>PERSONNEL</span>
        <button onClick={() => navigate('/profile')} style={styles.navItem}><IconUser /> Profile</button>
        <button onClick={handleLogout} style={styles.navItem}><IconLogout /> Déconnexion</button>
      </div>
    </aside>
  );

  // ─── DASHBOARD (Technical NOC View) ───
  const dashboardView = () => (
    <>
      {/* ── ROW 0 : KPIs Techniques enrichis ── */}
      <div style={{ marginBottom: 8 }}><span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted3)', letterSpacing: 0.5 }}><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: COLORS.accent, marginRight: 6, verticalAlign: 'middle' }} />KPIs RÉSEAU</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <AnimatedKpi label="Disponibilité" value={dispoGlobale} sub="réseau global" color={parseFloat(dispoGlobale) >= 95 ? '#10B981' : parseFloat(dispoGlobale) >= 80 ? '#F59E0B' : '#EF4444'} />
        <AnimatedKpi label="Taux Résolution" value={tauxResolution} sub={`${ticketsResolu} résolus`} color={parseFloat(tauxResolution) >= 80 ? '#10B981' : parseFloat(tauxResolution) >= 50 ? '#F59E0B' : '#EF4444'} />
        <AnimatedKpi label="Tickets Ouverts" value={ticketsOuvert} sub={ouvertsCritiques > 0 ? `${ouvertsCritiques} critiques !` : 'aucun critique'} color={ouvertsCritiques > 0 ? '#DC2626' : COLORS.accent} />
        <AnimatedKpi label="Délai Moyen" value={delaiMoyen} sub="résolution" color="#8B5CF6" />
      </div>

      {/* ── ROW 1 : Tendance ── */}
      <div style={{ marginBottom: 8 }}><span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted3)', letterSpacing: 0.5 }}><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#3B82F6', marginRight: 6, verticalAlign: 'middle' }} />TENDANCE</span></div>
      <div style={styles.chartsRow}>
        <div className="fade-in chart-card" style={{ ...styles.chartBox, flex: 1 }}>
          <div style={styles.ch}><span style={styles.cht}>Évolution des tickets</span><InfoPopup text="Nombre total de tickets créés par jour." /></div>
          <div style={styles.cb}>
            {evo.length === 0 ? <div style={styles.empty}>Aucune donnée</div>
            : <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evo} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}
                  onClick={(e) => e?.activePayload && setDetail({ type: 'evolution', data: e.activePayload[0].payload })}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="jour" tick={{ fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#e8e8e8' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} width={25} />
                  <RechartsTooltip content={<Tip />} />
                  <Line type="monotone" dataKey="total" stroke={COLORS.accent} strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 6 }} name="Tickets" />
                </LineChart>
              </ResponsiveContainer>}
          </div>
        </div>
      </div>

      {/* ── ROW 2 : Analytique avancée ── */}
      <div style={{ marginBottom: 8 }}><span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted3)', letterSpacing: 0.5 }}><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#8B5CF6', marginRight: 6, verticalAlign: 'middle' }} />ANALYTIQUE</span></div>
      <div style={styles.chartsRow}>
        <div className="fade-in chart-card" style={{ ...styles.chartBox, flex: 1 }}>
          <div style={styles.ch}><span style={styles.cht}>Créés vs Résolus</span><InfoPopup text="Évolution quotidienne des tickets créés et résolus." /></div>
          <div style={styles.cb}>
            {creesVsResolus.length === 0 ? <div style={styles.empty}>Aucune donnée</div>
            : <ResponsiveContainer width="100%" height="100%">
                <LineChart data={creesVsResolus} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="jour" tick={{ fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#e8e8e8' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} width={25} />
                  <RechartsTooltip content={<Tip />} />
                  <Line type="monotone" dataKey="crees" stroke={COLORS.accent} strokeWidth={2} dot={{ r: 1.5 }} activeDot={{ r: 5 }} name="Créés" />
                  <Line type="monotone" dataKey="resolus" stroke="#10B981" strokeWidth={2} dot={{ r: 1.5 }} activeDot={{ r: 5 }} name="Résolus" />
                </LineChart>
              </ResponsiveContainer>}
          </div>
        </div>
        <div className="fade-in chart-card" style={{ ...styles.chartBox, flex: 1 }}>
          <div style={styles.ch}><span style={styles.cht}>Délai / Priorité</span><InfoPopup text="Délai moyen de résolution par niveau de priorité (en heures)." /></div>
          <div style={styles.cb}>
            {delaiPrioData.length === 0 ? <div style={styles.empty}>Aucune donnée</div>
            : <ResponsiveContainer width="100%" height="100%">
                <BarChart data={delaiPrioData} margin={{ top: 5, right: 10, left: -5, bottom: 5 }} barSize={28}>
                  <CartesianGrid stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#e8e8e8' }} />
                  <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} width={25} tickFormatter={(v) => `${v}h`} />
                  <RechartsTooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '8px 14px', fontSize: 12 }}>
                      <p style={{ margin: 0, fontWeight: 700 }}>{payload[0].payload.name}</p>
                      <p style={{ margin: '2px 0', color: payload[0].payload.color }}>{payload[0].value}h moyen</p>
                    </div>;
                  }} />
                  <Bar dataKey="heures" radius={[4, 4, 0, 0]} name="Délai (h)">
                    {delaiPrioData.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>}
          </div>
        </div>
      </div>

      {/* ── ROW 3 : Réseau ── */}
      <div style={{ marginBottom: 8 }}><span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted3)', letterSpacing: 0.5 }}><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#10B981', marginRight: 6, verticalAlign: 'middle' }} />RÉSEAU</span></div>
      <div style={styles.chartsRow}>
        <div className="fade-in chart-card" style={{ ...styles.chartBox, flex: 1 }}>
          <div style={styles.ch}><span style={styles.cht}>Sites les plus impactés</span><InfoPopup text="Top sites avec le plus de réclamations." /></div>
          <div style={styles.cb}>
            {topSites.length === 0 ? <div style={styles.empty}>Aucune donnée</div>
            : <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSites} margin={{ top: 5, right: 10, left: -5, bottom: 5 }} barSize={28}
                  onClick={(e) => e?.activePayload && setDetail({ type: 'top_site', data: e.activePayload[0].payload })}>
                  <CartesianGrid stroke="#f5f5f5" vertical={false} horizontal={false} />
                  <XAxis dataKey="codeSite" tick={{ fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#e8e8e8' }} />
                  <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} width={25} />
                  <RechartsTooltip content={<Tip />} />
                  <Bar dataKey="num_reclamations" radius={[4, 4, 0, 0]} name="Réclamations" style={{ cursor: 'pointer' }}>
                    {topSites.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} style={{ cursor: 'pointer' }} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>}
          </div>
        </div>
        <div className="fade-in chart-card" style={{ ...styles.chartBox, flex: 1.2 }}>
          <div style={styles.ch}><span style={styles.cht}>Disponibilité par commune</span><InfoPopup text="Taux de disponibilité des sites par commune." /></div>
          <div style={{ ...styles.cb, overflowY: 'auto', minHeight: 280 }}>
            {communes.length === 0 ? <div style={styles.empty}>Aucune donnée</div>
            : <div style={{ height: Math.max(communes.length * 26, 200), width: '100%' }}>
                <ResponsiveContainer width="100%" height={Math.max(communes.length * 28, 200)}>
                  <BarChart data={communes} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }} barSize={18}
                    onClick={(e) => e?.activePayload && setDetail({ type: 'commune', data: e.activePayload[0].payload })}>
                    <CartesianGrid stroke="#f5f5f5" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 9 }} domain={[0, 100]} tickLine={false} axisLine={{ stroke: '#e8e8e8' }} tickFormatter={(v) => `${v}%`} width={30} />
                    <YAxis type="category" dataKey="commune" tick={false} tickLine={false} axisLine={false} width={4} />
                    <RechartsTooltip content={<Tip />} />
                    <Bar dataKey="taux_dispo_num" radius={[0, 4, 4, 0]} name="Disponibilité" style={{ cursor: 'pointer' }}
                      shape={(props) => {
                        const { x, y, width, height, value } = props;
                        return <rect x={x} y={y} width={Math.max(width, value === 0 ? 6 : 0)} height={height} fill={dispoColor(value)} rx={2} />;
                      }}>
                      {communes.map((e) => <Cell key={e.commune} fill={dispoColor(e.taux_dispo_num)} style={{ cursor: 'pointer' }} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>}
          </div>
        </div>
      </div>

      {/* ── ROW 4 : Patterns temporels ── */}
      <div style={{ marginBottom: 8 }}><span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted3)', letterSpacing: 0.5 }}><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#F59E0B', marginRight: 6, verticalAlign: 'middle' }} />TEMPORALITÉ</span></div>
      <div style={styles.chartsRow}>
        <div className="fade-in chart-card" style={{ ...styles.chartBox, flex: 1 }}>
          <div style={styles.ch}><span style={styles.cht}>Tickets par jour de semaine</span><InfoPopup text="Volume de tickets créé par jour de la semaine. Utile pour identifier les pics d'activité." /></div>
          <div style={styles.cb}>
            {jourSemaine.length === 0 ? <div style={styles.empty}>Aucune donnée</div>
            : <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jourSemaine} margin={{ top: 5, right: 10, left: -5, bottom: 5 }} barSize={36}>
                  <CartesianGrid stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="jour" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#e8e8e8' }} />
                  <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} width={25} />
                  <RechartsTooltip content={<Tip />} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]} name="Tickets" fill={COLORS.accent} />
                </BarChart>
              </ResponsiveContainer>}
          </div>
        </div>
      </div>

      {/* ── ROW 5 : Tableau suivi Wilayas ── */}
      {wilayas.length > 0 && (
        <>
          <div style={{ marginBottom: 8 }}><span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted3)', letterSpacing: 0.5 }}><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#EC4899', marginRight: 6, verticalAlign: 'middle' }} />SUIVI PAR WILAYA</span></div>
          <div className="fade-in" style={{ ...styles.tableCard, marginBottom: 24 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ ...styles.table, minWidth: 900 }}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>WILAYA</th>
                    <th style={styles.th}>SITES</th>
                    <th style={styles.th}>DOWN</th>
                    <th style={styles.th}>TICKETS OUVERTS</th>
                    <th style={styles.th}>DISPONIBILITÉ</th>
                    <th style={styles.th}>DÉLAI MOYEN</th>
                    <th style={styles.th}>TENDANCE</th>
                  </tr>
                </thead>
                <tbody>
                  {wilayas.map((w) => (
                    <tr key={w.wilaya} style={styles.tr}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{w.wilaya}</td>
                      <td style={styles.td}>{w.total_sites}</td>
                      <td style={{ ...styles.td, color: w.sites_down > 0 ? '#DC2626' : '#10B981', fontWeight: 600 }}>{w.sites_down}</td>
                      <td style={{ ...styles.td, color: w.tickets_ouverts > 0 ? '#D97706' : 'inherit', fontWeight: w.tickets_ouverts > 0 ? 600 : 400 }}>{w.tickets_ouverts}</td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden', maxWidth: 80 }}>
                            <div style={{ height: '100%', width: `${w.taux_dispo_num}%`, background: dispoColor(w.taux_dispo_num), borderRadius: 3, transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 600, color: dispoColor(w.taux_dispo_num) }}>{w.taux_disponibilite}</span>
                        </div>
                      </td>
                      <td style={styles.td}>{w.delai_moyen_resolution}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badgeBase, backgroundColor: w.tendance === 'En hausse' ? '#DCFCE7' : w.tendance === 'En baisse' ? '#FEE2E2' : '#F1F5F9', color: w.tendance === 'En hausse' ? '#15803D' : w.tendance === 'En baisse' ? '#DC2626' : '#64748B' }}>
                          {w.tendance === 'En hausse' ? '↑' : w.tendance === 'En baisse' ? '↓' : '→'} {w.tendance}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );

  // ─── TICKETS VIEW ───
  // Displays the ticket management table with toolbar, filters, and status actions
  const ticketsView = () => (
    <div style={styles.tableCard}>
      <div style={{ ...styles.toolbar, borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={styles.toolbarLeft}><h2 style={styles.tableTitle}><IconTicket /> Réclamations</h2></div>
        <div style={styles.toolbarActions}>
          <button onClick={fetchTickets} style={styles.btnFilter}><IconRefresh /> Actualiser</button>
          <button onClick={() => setShowFilters(!showFilters)} style={styles.btnFilter}><IconFilter /> Filtrer</button>
          <div style={styles.searchWrapper}>
            <IconSearch style={styles.searchIcon} />
            <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.searchInput} />
          </div>
          <button onClick={() => setShowTicketForm(true)} style={styles.btnNew}><IconPlus /> Nouveau Ticket</button>
        </div>
      </div>
      {/* Collapsible filter bar with date, status, site, priority, and type filters */}
      {showFilters && (
        <div style={styles.filterArea}>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={styles.filterSelect} />
          <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)} style={styles.filterSelect}>
            <option value="">Tous statuts</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
          </select>
          <select value={filterSiteId} onChange={(e) => setFilterSiteId(e.target.value)} style={styles.filterSelect}>
            <option value="">Tous les sites</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </select>
          <select value={filterPriorite} onChange={(e) => setFilterPriorite(e.target.value)} style={styles.filterSelect}>
            <option value="">Toutes priorités</option>
            {['critique', 'haute', 'normale', 'basse'].map((p) => <option key={p} value={p.toUpperCase()}>{p}</option>)}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={styles.filterSelect}>
            <option value="">Tous types</option>
            <option value="PARTICULIER">Particulier</option>
            <option value="ENTREPRISE">Entreprise</option>
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
              <th style={styles.th}>PRIORITÉ</th>
              <th style={styles.th}>STATUT</th>
              <th style={styles.th}>DATE</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.length === 0 ? (
              <tr><td colSpan="7" style={styles.emptyCell}>Aucune réclamation trouvée.</td></tr>
            ) : filteredTickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((ticket) => {
              const prio = COLORS.priorities[ticket.priorite?.toUpperCase()] || COLORS.priorities.NORMALE;
              const typ = COLORS.types[ticket.type_client?.toUpperCase()] || COLORS.types.PARTICULIER;
              const statutKey = getStatutKey(ticket.statut);
              const stat = COLORS.status[statutKey] || COLORS.status.FERME;
              // Get allowed next statuses based on current status
              const forward = STATUS_FLOW[ticket.statut] || [];
              return (
                <tr key={ticket.id} style={styles.tr}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}>
                  <td style={{ ...styles.td, borderLeft: `4px solid ${prio.side}`, fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => setSelectedTicket(ticket)}>
                    {ticket.numero_ticket}
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badgeBase, backgroundColor: typ.bg, color: typ.text, border: `1px solid ${typ.border}` }}>
                      {ticket.type_client?.toUpperCase()}
                    </span>
                  </td>
                  <td style={styles.td}>{siteDisplay(ticket)}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badgeBase, backgroundColor: prio.bg, color: prio.text }}>
                      {ticket.priorite?.toUpperCase()}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badgeBase, backgroundColor: stat.bg, color: stat.text }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: stat.dot, marginRight: 6, display: 'inline-block' }} />
                      {statutKey}
                    </span>
                  </td>
                  <td style={{ ...styles.td, color: COLORS.textMuted }}>{formatDateFr(ticket.created_at)}</td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <div style={styles.statusActions}>
                      {/* Render status transition buttons based on the STATUS_FLOW */}
                      {ALL_STATUSES.map((s) => {
                        const sk = getStatutKey(s);
                        const sc = COLORS.status[sk] || COLORS.status.OUVERT;
                        const isCurrent = ticket.statut === s;
                        const canGo = forward.includes(s);
                        return (
                          <button key={s} disabled={!canGo || updatingId === ticket.id}
                            onClick={(e) => { e.stopPropagation(); handleTicketStatus(ticket.id, s, ticket.statut); }}
                            style={{
                              ...styles.statusBtn,
                              backgroundColor: isCurrent ? sc.bg : (canGo ? 'var(--bg-card)' : 'var(--bg-card)'),
                              color: isCurrent ? '#FFFFFF' : (canGo ? sc.text : '#D0D0D0'),
                              borderColor: isCurrent ? sc.bg : (canGo ? sc.text : '#E5E5E5'),
                              cursor: canGo && updatingId !== ticket.id ? 'pointer' : 'not-allowed',
                              fontWeight: isCurrent ? 700 : (canGo ? 600 : 500),
                            }}>
                            {s.charAt(0).toUpperCase() + s.slice(1, 2)}
                          </button>
                        );
                      })}
                      <button onClick={(e) => { e.stopPropagation(); handleArchiveTicket(ticket); }}
                        style={{ ...styles.statusBtn, backgroundColor: '#FEE2E2', color: '#DC2626', borderColor: '#FECACA', cursor: 'pointer', marginLeft: 4 }}
                        title="Archiver (fermer)">
                        <IconArchive style={{ width: 10, height: 10 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── SITES VIEW ───
  // Displays network site management with summary cards, filters, and toggle/archive actions
  const sitesView = () => (
    <>
      {/* Summary stats: total, active, and inactive site counts */}
      <div style={styles.statsRow}>
        <div className="fade-in stat-card" style={{ ...styles.statCard, animationDelay: '0s' }}>
          <span style={{ ...styles.statNumber, color: 'var(--text-secondary)' }}>{filteredSites.length}</span>
          <span style={styles.statLabel}>Total sites</span>
        </div>
        <div className="fade-in stat-card" style={{ ...styles.statCard, animationDelay: '0.05s' }}>
          <span style={{ ...styles.statNumber, color: '#15803D' }}>{filteredSites.filter((s) => s.statut === 'UP').length}</span>
          <span style={styles.statLabel}>Actif</span>
        </div>
        <div className="fade-in stat-card" style={{ ...styles.statCard, animationDelay: '0.1s' }}>
          <span style={{ ...styles.statNumber, color: '#DC2626' }}>{filteredSites.filter((s) => s.statut === 'DOWN').length}</span>
          <span style={styles.statLabel}>Inactif</span>
        </div>
      </div>
      <div className="fade-in table-card" style={styles.tableCard}>
        <div style={{ ...styles.toolbar, borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={styles.toolbarLeft}><h2 style={styles.tableTitle}><IconSite /> Sites réseau 5G</h2></div>
          <div style={styles.toolbarActions}>
            <button onClick={fetchSites} style={styles.btnFilter}><IconRefresh /> Actualiser</button>
            <button onClick={() => setShowSiteFilters(!showSiteFilters)} style={styles.btnFilter}><IconFilter /> Filtrer</button>
            <button onClick={() => { setShowSiteForm(true); setSelectedSite(null); }} style={styles.btnNew}><IconPlus /> Nouveau Site</button>
          </div>
        </div>
        {/* Site filters: wilaya, commune, and status */}
        {showSiteFilters && (
          <div style={styles.filterArea}>
            <input type="text" placeholder="Wilaya..." value={siteFilterWilaya} onChange={(e) => setSiteFilterWilaya(e.target.value)} style={styles.filterSelect} />
            <input type="text" placeholder="Commune..." value={siteFilterCommune} onChange={(e) => setSiteFilterCommune(e.target.value)} style={styles.filterSelect} />
            <select value={siteFilterStatut} onChange={(e) => setSiteFilterStatut(e.target.value)} style={styles.filterSelect}>
              <option value="">Tous les états</option>
              <option value="UP">Actif</option>
              <option value="DOWN">Inactif</option>
            </select>
          </div>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>CODE</th>
                <th style={styles.th}>NOM</th>
                <th style={styles.th}>WILAYA</th>
                <th style={styles.th}>COMMUNE</th>
                <th style={styles.th}>COORD X</th>
                <th style={styles.th}>COORD Y</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredSites.length === 0 ? (
                <tr><td colSpan="7" style={styles.emptyCell}>Aucun site trouvé.</td></tr>
              ) : filteredSites.map((site) => (
                <tr key={site.id} style={{ ...styles.tr, cursor: 'pointer' }}
                  onClick={() => setSelectedSite(site)}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* Status indicator dot with glow effect for active/inactive */}
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
                        backgroundColor: ST[site.statut] || 'var(--text-muted3)',
                        boxShadow: site.statut === 'UP' ? '0 0 6px rgba(5,150,105,0.6)' : site.statut === 'DOWN' ? '0 0 6px rgba(220,38,38,0.6)' : 'none',
                      }} />
                      {site.codeSite}
                    </div>
                  </td>
                  <td style={styles.td}>{site.nom}</td>
                  <td style={styles.td}>{site.wilaya}</td>
                  <td style={styles.td}>{site.commune}</td>
                  <td style={styles.td}>{site.coordX || '-'}</td>
                  <td style={styles.td}>{site.coordY || '-'}</td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <div style={styles.statusActions}>
                      {/* UP/DOWN toggle buttons - only the opposite status is clickable */}
                      {['UP', 'DOWN'].map((s) => {
                        const isActive = site.statut === s;
                        const isTarget = site.statut !== s;
                        return (
                          <button key={s} disabled={!isTarget || togglingSiteId === site.id}
                            onClick={(e) => { e.stopPropagation(); handleToggleSite(site.id, site.statut); }}
                            style={{
                              ...styles.statusBtn,
                              backgroundColor: isActive ? (s === 'UP' ? '#059669' : '#DC2626') : 'var(--bg-card)',
                              color: isActive ? '#FFFFFF' : (isTarget ? (s === 'UP' ? '#059669' : '#DC2626') : '#D0D0D0'),
                              borderColor: isActive ? (s === 'UP' ? '#059669' : '#DC2626') : (isTarget ? (s === 'UP' ? '#059669' : '#DC2626') : '#E5E5E5'),
                              cursor: isTarget && togglingSiteId !== site.id ? 'pointer' : 'not-allowed',
                              fontWeight: isActive ? 700 : (isTarget ? 600 : 500),
                            }}>
                            {SITE_LABELS[s]}
                          </button>
                        );
                      })}
                      <button onClick={(e) => { e.stopPropagation(); handleArchiveSite(site.id); }}
                        style={{ ...styles.statusBtn, backgroundColor: '#FEE2E2', color: '#DC2626', borderColor: '#FECACA', cursor: 'pointer', marginLeft: 4 }}
                        title="Archiver">
                        <IconArchive style={{ width: 10, height: 10 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  // ─── USERS VIEW ───
  // User management table with role filtering, search, and CRUD actions per row
  const usersView = () => (
    <div style={styles.tableCard}>
      <div style={{ ...styles.toolbar, borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={styles.toolbarLeft}><h2 style={styles.tableTitle}><IconUsers /> Utilisateurs</h2>
          <span style={{ fontSize: 10, color: 'var(--text-muted3)' }}>({filteredUsers.length})</span>
        </div>
        <div style={styles.toolbarActions}>
          <select value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)}
            style={{ ...styles.filterSelect, height: 28, fontSize: 10, minWidth: 130 }}>
            <option value="">Tous les rôles</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div style={styles.searchWrapper}>
            <IconSearch style={styles.searchIcon} />
            <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.searchInput} />
          </div>
          <button onClick={() => setShowUserForm(true)} style={styles.btnNew}><IconPlus /> Nouveau User</button>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th style={styles.th}>CODE</th>
              <th style={styles.th}>PRÉNOM</th>
              <th style={styles.th}>NOM</th>
              <th style={styles.th}>EMAIL</th>
              <th style={styles.th}>RÔLE</th>
              <th style={styles.th}>STATUT</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr><td colSpan="7" style={styles.emptyCell}>Aucun utilisateur trouvé.</td></tr>
            ) : filteredUsers.map((u) => (
              <tr key={u.code_user} style={styles.tr}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}>
                <td style={{ ...styles.td, fontWeight: 600 }}>{u.code_user}</td>
                <td style={styles.td}>{u.first_name || '-'}</td>
                <td style={styles.td}>{u.last_name || '-'}</td>
                <td style={styles.td}>{u.email}</td>
                <td style={styles.td}>{getRoleBadge(u.role_user)}</td>
                <td style={styles.td}>
                  {u.is_active !== false ? (
                    <span style={{ ...styles.badgeBase, color: '#169742', background: '#dcf8e4' }}>ACTIF</span>
                  ) : (
                    <span style={{ ...styles.badgeBase, color: '#B91C1C', background: '#FEE2E2' }}>INACTIF</span>
                  )}
                </td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                    <button onClick={() => openEditUser(u)}
                      style={{ ...styles.statusBtn, backgroundColor: '#DBEAFE', color: '#2563EB', borderColor: '#BFDBFE', cursor: 'pointer' }}
                      title="Modifier">
                      <IconEdit style={{ width: 10, height: 10 }} />
                    </button>
                    {/* Show restore button for inactive users, archive button for active ones */}
                    {u.is_active !== false ? (
                      <button onClick={() => handleArchiveUser(u)}
                        style={{ ...styles.statusBtn, backgroundColor: '#FEF3C7', color: '#D97706', borderColor: '#FDE68A', cursor: 'pointer' }}
                        title="Désactiver">
                        <IconArchive style={{ width: 10, height: 10 }} />
                      </button>
                    ) : (
                      <button onClick={() => handleRestoreUser(u)}
                        style={{ ...styles.statusBtn, backgroundColor: '#D1FAE5', color: '#059669', borderColor: '#A7F3D0', cursor: 'pointer' }}
                        title="Restaurer">
                        <IconCheck style={{ width: 10, height: 10 }} />
                      </button>
                    )}
                    <button onClick={() => handleDeleteUser(u)}
                      style={{ ...styles.statusBtn, backgroundColor: '#FEE2E2', color: '#DC2626', borderColor: '#FECACA', cursor: 'pointer' }}
                      title="Supprimer">
                      <IconTrash style={{ width: 10, height: 10 }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── MAP VIEW ───
  // Renders the interactive map component showing all network sites with coverage
  const mapView = () => (
    <div style={styles.tableCard}>
      <div style={styles.panelHeader}>
        <span style={styles.panelTitle}><IconMap /> Cartographie des sites 5G</span>
        <span style={{ fontSize: 9, color: COLORS.textMuted }}>{sites.length} site{sites.length > 1 ? 's' : ''}</span>
      </div>
      <div style={{ height: 'calc(100vh - 160px)', minHeight: 500 }}>
        <MapComponent sites={sites} showCoverage />
      </div>
    </div>
  );

  // ─── REPORTS VIEW ───
  // Lists all supervisor-submitted reports in a table with view/delete actions
  const reportsView = () => (
    <div style={styles.tableCard}>
      <div style={{ ...styles.panelHeader, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={styles.panelTitle}><IconReport style={{ width: 15, height: 15 }} /> Rapports des superviseurs</span>
        <button onClick={fetchRapports} style={styles.textBtn}><IconRefresh style={{ width: 12, height: 12 }} /> Actualiser</button>
      </div>
      {loadingRapports ? (
        <div style={styles.empty}>Chargement...</div>
      ) : allRapports.length === 0 ? (
        <div style={{ ...styles.empty, padding: 40 }}>Aucun rapport disponible.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead><tr style={styles.thRow}>
              <th style={styles.th}>Titre</th>
              <th style={styles.th}>Auteur</th>
              <th style={styles.th}>Période</th>
              <th style={styles.th}>Créé le</th>
              <th style={styles.th}></th>
            </tr></thead>
            <tbody>
              {allRapports.map((r) => (
                <tr key={r.id} onClick={() => handleViewRapport(r.id)}
                  style={{ ...styles.tr, cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}>
                  <td style={{ ...styles.td, fontWeight: 600, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.titre}</td>
                  <td style={styles.td}>{r.cree_par?.nom_user || '—'}</td>
                  <td style={styles.td}>
                    {r.date_debut && r.date_fin
                      ? `${new Date(r.date_debut).toLocaleDateString('fr')} → ${new Date(r.date_fin).toLocaleDateString('fr')}`
                      : '30 jours'}
                  </td>
                  <td style={styles.td}>
                    {new Date(r.created_at).toLocaleDateString('fr', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={styles.td}>
                    <button onClick={(e) => handleDeleteRapport(r.id, e)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#DC2626' }} title="Supprimer">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ─── RAPPORT READING MODAL ───
  // Full-screen-ish modal to display a sanitized HTML report
  const rapportReadModal = () => {
    if (!selectedRapport) return null;
    const r = selectedRapport;
    return (
      <div className="fade-in" style={styles.overlay} onClick={() => setSelectedRapport(null)}>
        <div className="scale-in" style={{ ...styles.modal, width: 780, maxHeight: '88vh' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
              <span style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(232,64,26,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconReport style={{ width: 16, height: 16, color: '#E8401A' }} />
              </span>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: COLORS.textDark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.titre}</h2>
                <div style={{ fontSize: 10, color: 'var(--text-muted2)', marginTop: 2 }}>
                  {r.cree_par?.nom_user || '—'} · {new Date(r.created_at).toLocaleDateString('fr', { day: '2-digit', month: 'long', year: 'numeric' })}
                  {r.date_debut && r.date_fin ? ` · ${new Date(r.date_debut).toLocaleDateString('fr')} → ${new Date(r.date_fin).toLocaleDateString('fr')}` : ''}
                </div>
              </div>
            </div>
            <button onClick={() => setSelectedRapport(null)}
              style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${COLORS.border}`, background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted3)', flexShrink: 0, marginLeft: 12 }}
              title="Fermer">
              <IconX />
            </button>
          </div>
          {/* Render HTML content sanitized with DOMPurify to prevent XSS */}
          <div style={{ padding: '20px 28px', overflowY: 'auto', flex: 1, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.8 }}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(r.contenu) }} />
        </div>
      </div>
    );
  };

  // ─── PERFORMANCE VIEW ───
  // Displays per-employee stats: toggle between engineers and call center agents,
  // then select an individual to see their KPIs and a bar chart
  const performanceView = () => (
    <div style={styles.tableCard}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: COLORS.textDark, display: 'flex', alignItems: 'center', gap: 8 }}><IconUsers /> Performances Équipe</h2>
        {/* Role toggle: engineers vs call center agents */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-toolbar)', borderRadius: 6, padding: 2, marginLeft: 8 }}>
          <button onClick={() => { setPerfRole('ingenieurs'); setPerfUser(null); }}
            style={{ padding: '4px 12px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', background: perfRole === 'ingenieurs' ? 'var(--bg-card)' : 'transparent', color: perfRole === 'ingenieurs' ? 'var(--text-primary)' : 'var(--text-muted3)', boxShadow: perfRole === 'ingenieurs' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>Ingénieurs</button>
          <button onClick={() => { setPerfRole('agents_cc'); setPerfUser(null); }}
            style={{ padding: '4px 12px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', background: perfRole === 'agents_cc' ? 'var(--bg-card)' : 'transparent', color: perfRole === 'agents_cc' ? 'var(--text-primary)' : 'var(--text-muted3)', boxShadow: perfRole === 'agents_cc' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>Call Center</button>
        </div>
        <select value={perfUser || ''} onChange={(e) => setPerfUser(e.target.value || null)}
          style={{ marginLeft: 'auto', padding: '5px 12px', fontSize: 11, borderRadius: 4, border: `1px solid ${COLORS.border}`, fontFamily: 'inherit', maxWidth: 240, cursor: 'pointer', backgroundColor: 'var(--bg-input)' }}>
          <option value="">Choisir un utilisateur...</option>
          {perfUsers.map((u) => <option key={u.code} value={u.code}>{u.nom} ({u.code})</option>)}
        </select>
      </div>
      {!selectedPerfUser ? (
        <div style={{ padding: 50, textAlign: 'center', color: 'var(--text-muted2)', fontSize: 13 }}>
          Sélectionnez un utilisateur pour voir ses statistiques de performance
        </div>
      ) : (
        <div className="fade-in" style={{ padding: 20 }}>
          {/* KPI cards for the selected user - different metrics for engineers vs agents */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            {perfRole === 'ingenieurs' ? (
              <>
                <div style={{ flex: 1, minWidth: 120, padding: '14px 18px', background: 'var(--bg-hover)', borderRadius: 8, border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedPerfUser.total_assignes}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted2)', marginTop: 2 }}>Assignés</div>
                </div>
                <div style={{ flex: 1, minWidth: 120, padding: '14px 18px', background: 'var(--bg-hover)', borderRadius: 8, border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#10B981' }}>{selectedPerfUser.resolus}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted2)', marginTop: 2 }}>Résolus</div>
                </div>
                <div style={{ flex: 1, minWidth: 120, padding: '14px 18px', background: 'var(--bg-hover)', borderRadius: 8, border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: selectedPerfUser.taux_resolution >= 80 ? '#10B981' : selectedPerfUser.taux_resolution >= 50 ? '#F59E0B' : '#EF4444' }}>{selectedPerfUser.taux_resolution}%</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted2)', marginTop: 2 }}>Taux résolution</div>
                </div>
                <div style={{ flex: 1, minWidth: 120, padding: '14px 18px', background: 'var(--bg-hover)', borderRadius: 8, border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedPerfUser.delai_h ? `${selectedPerfUser.delai_h.toFixed(1)}h` : selectedPerfUser.delai_moyen}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted2)', marginTop: 2 }}>Délai moyen</div>
                </div>
              </>
            ) : (
              <>
                <div style={{ flex: 1, minWidth: 120, padding: '14px 18px', background: 'var(--bg-hover)', borderRadius: 8, border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#E8401A' }}>{selectedPerfUser.tickets_crees}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted2)', marginTop: 2 }}>Créés</div>
                </div>
                <div style={{ flex: 1, minWidth: 120, padding: '14px 18px', background: 'var(--bg-hover)', borderRadius: 8, border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#F59E0B' }}>{selectedPerfUser.ouverts}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted2)', marginTop: 2 }}>Ouverts</div>
                </div>
                <div style={{ flex: 1, minWidth: 120, padding: '14px 18px', background: 'var(--bg-hover)', borderRadius: 8, border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#10B981' }}>{selectedPerfUser.resolus}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted2)', marginTop: 2 }}>Résolus</div>
                </div>
                <div style={{ flex: 1, minWidth: 120, padding: '14px 18px', background: 'var(--bg-hover)', borderRadius: 8, border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-muted3)' }}>{selectedPerfUser.fermes}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted2)', marginTop: 2 }}>Fermés</div>
                </div>
              </>
            )}
          </div>
          {/* Performance bar chart for selected user */}
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              {perfRole === 'ingenieurs' ? (
                <BarChart data={[selectedPerfUser]} margin={{ top: 5, right: 10, left: -5, bottom: 5 }} barSize={50}>
                  <CartesianGrid stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e8e8e8' }} />
                  <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} width={25} />
                  <RechartsTooltip content={<Tip />} />
                  <Bar dataKey="total_assignes" radius={[4, 4, 0, 0]} fill="#2563EB" name="Assignés" />
                  <Bar dataKey="resolus" radius={[4, 4, 0, 0]} fill="#10B981" name="Résolus" />
                </BarChart>
              ) : (
                <BarChart data={[selectedPerfUser]} margin={{ top: 5, right: 10, left: -5, bottom: 5 }} barSize={50}>
                  <CartesianGrid stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e8e8e8' }} />
                  <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} width={25} />
                  <RechartsTooltip content={<Tip />} />
                  <Bar dataKey="tickets_crees" radius={[4, 4, 0, 0]} fill="#E8401A" name="Créés" />
                  <Bar dataKey="ouverts" radius={[4, 4, 0, 0]} fill="#F59E0B" name="Ouverts" />
                  <Bar dataKey="resolus" radius={[4, 4, 0, 0]} fill="#10B981" name="Résolus" />
                  <Bar dataKey="fermes" radius={[4, 4, 0, 0]} fill="var(--text-muted3)" name="Fermés" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );

  // ─── USER FORM MODAL ───
  // Modal for creating a new user with personal info and password fields
  const userFormModal = () => (
    <div style={styles.overlay} onClick={() => setShowUserForm(false)}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Créer un utilisateur</h2>
          <button onClick={() => setShowUserForm(false)} style={styles.modalClose}><IconX /></button>
        </div>
        <form onSubmit={handleCreateUser} style={styles.formBody}>
          <p style={{ ...styles.modalSectionTitle, marginTop: 0 }}>Informations</p>
          <div style={styles.formGrid}>
            <div style={styles.inputGroup}><label style={styles.label}>NOM</label><input type="text" placeholder="NOM" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} style={styles.input} required /></div>
            <div style={styles.inputGroup}><label style={styles.label}>PRÉNOM</label><input type="text" placeholder="PRÉNOM" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} style={styles.input} required /></div>
            <div style={styles.inputGroup}><label style={styles.label}>EMAIL</label><input type="email" placeholder="utilisateur@gmail.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={styles.input} required /></div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>RÔLE</label>
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} style={styles.input}>
                {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <p style={styles.modalSectionTitle}>Sécurité</p>
          <div style={styles.formGrid}>
            <div style={styles.inputGroup}><label style={styles.label}>MOT DE PASSE</label><input type="password" placeholder="••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} style={styles.input} required /></div>
            <div style={styles.inputGroup}><label style={styles.label}>CONFIRMATION</label><input type="password" placeholder="••••••" value={formData.password2} onChange={(e) => setFormData({ ...formData, password2: e.target.value })} style={styles.input} required /></div>
          </div>
          <div style={styles.formActions}>
            <button type="button" onClick={() => setShowUserForm(false)} style={styles.btnCancel}>Annuler</button>
            <button type="submit" disabled={submitting} style={styles.btnSubmit}>
              <IconCheck /> {submitting ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // ─── EDIT USER MODAL ───
  // Modal for editing an existing user's info (name, email, role)
  const editUserModal = () => (
    <div style={styles.overlay} onClick={() => { setShowEditUserForm(false); setEditingUser(null); }}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Modifier {editingUser?.code_user}</h2>
          <button onClick={() => { setShowEditUserForm(false); setEditingUser(null); }} style={styles.modalClose}><IconX /></button>
        </div>
        <form onSubmit={handleUpdateUser} style={styles.formBody}>
          <div style={styles.formGrid}>
            <div style={styles.inputGroup}><label style={styles.label}>PRÉNOM</label><input type="text" value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} style={styles.input} required /></div>
            <div style={styles.inputGroup}><label style={styles.label}>NOM</label><input type="text" value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} style={styles.input} required /></div>
            <div style={styles.inputGroup}><label style={styles.label}>EMAIL</label><input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} style={styles.input} required /></div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>RÔLE</label>
              <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} style={styles.input}>
                {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div style={styles.formActions}>
            <button type="button" onClick={() => { setShowEditUserForm(false); setEditingUser(null); }} style={styles.btnCancel}>Annuler</button>
            <button type="submit" disabled={submitting} style={styles.btnSubmit}>
              <IconCheck /> {submitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // ─── TICKET FORM MODAL ───
  // Modal for creating a new ticket (reclamation) with client info and priority
  const ticketFormModal = () => (
    <div style={styles.overlay} onClick={() => setShowTicketForm(false)}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Nouvelle réclamation</h2>
          <button onClick={() => setShowTicketForm(false)} style={styles.modalClose}><IconX /></button>
        </div>
        <form onSubmit={handleCreateTicket} style={styles.formBody}>
          <div style={styles.formGrid}>
            <div style={styles.inputGroup}><label style={styles.label}>CLIENT</label><input type="text" placeholder="Nom complet" value={ticketForm.nom_client} onChange={(e) => setTicketForm({ ...ticketForm, nom_client: e.target.value })} style={styles.input} required /></div>
            <div style={styles.inputGroup}><label style={styles.label}>TÉLÉPHONE</label><input type="text" placeholder="0550 00 00 00" value={ticketForm.telephone_client} onChange={(e) => setTicketForm({ ...ticketForm, telephone_client: e.target.value })} style={styles.input} required /></div>
            <div style={styles.inputGroup}><label style={styles.label}>EMAIL</label><input type="email" placeholder="client@gmail.com" value={ticketForm.email_client} onChange={(e) => setTicketForm({ ...ticketForm, email_client: e.target.value })} style={styles.input} /></div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>TYPE</label>
              <select value={ticketForm.type_client} onChange={(e) => setTicketForm({ ...ticketForm, type_client: e.target.value })} style={styles.input}>
                <option value="particulier">Particulier</option>
                <option value="entreprise">Entreprise</option>
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>SITE</label>
              <select value={ticketForm.site} onChange={(e) => setTicketForm({ ...ticketForm, site: e.target.value })} style={styles.input} required>
                <option value="">Choisir un site...</option>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.nom || s.codeSite}</option>)}
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>PRIORITÉ</label>
              <select value={ticketForm.priorite} onChange={(e) => setTicketForm({ ...ticketForm, priorite: e.target.value })} style={styles.input}>
                <option value="basse">Basse</option>
                <option value="normale">Normale</option>
                <option value="haute">Haute</option>
                <option value="critique">Critique</option>
              </select>
            </div>
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>MOTS CLÉS</label>
            <input type="text" placeholder="perte signal, zone rurale" value={ticketForm.mots_cles_ia} onChange={(e) => setTicketForm({ ...ticketForm, mots_cles_ia: e.target.value })} style={styles.input} />
          </div>
          <div style={styles.formActions}>
            <button type="button" onClick={() => setShowTicketForm(false)} style={styles.btnCancel}>Annuler</button>
            <button type="submit" disabled={submitting} style={styles.btnSubmit}>
              <IconCheck /> {submitting ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // ─── SITE FORM MODAL ───
  // Modal for creating a new network site with location and tech info
  const siteFormModal = () => (
    <div style={styles.overlay} onClick={() => setShowSiteForm(false)}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Nouveau site 5G</h2>
          <button onClick={() => setShowSiteForm(false)} style={styles.modalClose}><IconX /></button>
        </div>
        <form onSubmit={handleCreateSite} style={styles.formBody}>
          <div style={styles.formGrid}>
            <div style={styles.inputGroup}><label style={styles.label}>NOM</label><input type="text" name="nom" value={siteForm.nom} onChange={(e) => setSiteForm({ ...siteForm, nom: e.target.value })} placeholder="Ex: Alger Centre" style={styles.input} required /></div>
            <div style={styles.inputGroup}><label style={styles.label}>WILAYA</label><input type="text" name="wilaya" value={siteForm.wilaya} onChange={(e) => setSiteForm({ ...siteForm, wilaya: e.target.value })} placeholder="Ex: Alger" style={styles.input} required /></div>
            <div style={styles.inputGroup}><label style={styles.label}>COMMUNE</label><input type="text" name="commune" value={siteForm.commune} onChange={(e) => setSiteForm({ ...siteForm, commune: e.target.value })} placeholder="Ex: Hydra" style={styles.input} required /></div>
            <div style={styles.inputGroup}><label style={styles.label}>X (Longitude)</label><input type="text" name="coordX" value={siteForm.coordX} onChange={(e) => setSiteForm({ ...siteForm, coordX: e.target.value })} placeholder="Ex: 3.058" style={styles.input} /></div>
            <div style={styles.inputGroup}><label style={styles.label}>Y (Latitude)</label><input type="text" name="coordY" value={siteForm.coordY} onChange={(e) => setSiteForm({ ...siteForm, coordY: e.target.value })} placeholder="Ex: 36.753" style={styles.input} /></div>
            <div style={styles.inputGroup}><label style={styles.label}>ADRESSE</label><input type="text" name="adresse" value={siteForm.adresse} onChange={(e) => setSiteForm({ ...siteForm, adresse: e.target.value })} placeholder="Adresse complète" style={styles.input} /></div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>STATUT</label>
              <select name="statut" value={siteForm.statut} onChange={(e) => setSiteForm({ ...siteForm, statut: e.target.value })} style={styles.input}>
                <option value="UP">Actif</option>
                <option value="DOWN">Inactif</option>
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>TECHNOLOGIE</label>
              <select name="technologie" value={siteForm.technologie || '5G'} onChange={(e) => setSiteForm({ ...siteForm, technologie: e.target.value })} style={styles.input}>
                <option value="4G">4G</option>
                <option value="5G">5G</option>
              </select>
            </div>
          </div>
          <div style={styles.formActions}>
            <button type="button" onClick={() => setShowSiteForm(false)} style={styles.btnCancel}>Annuler</button>
            <button type="submit" disabled={submitting} style={styles.btnSubmit}>
              <IconCheck /> {submitting ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // ─── TICKET DETAIL MODAL ───
  // Shows full ticket info including client details, status, comments, and status transition buttons
  const ticketDetailModal = () => {
    if (!selectedTicket) return null;
    const t = selectedTicket;
    const prio = COLORS.priorities[t.priorite?.toUpperCase()] || COLORS.priorities.NORMALE;
    const statutKey = getStatutKey(t.statut);
    const stat = COLORS.status[statutKey] || COLORS.status.FERME;
    const forward = STATUS_FLOW[t.statut] || [];
    return (
      <div className="fade-in" style={styles.overlay} onClick={() => setSelectedTicket(null)}>
        <div className="scale-in" style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <h2 style={styles.modalTitle}>Ticket {t.numero_ticket}</h2>
            <button style={styles.modalClose} onClick={() => setSelectedTicket(null)}><IconX /></button>
          </div>
          <div style={styles.modalBody}>
            <div style={styles.modalGrid}>
              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>Client</h3>
                <div style={styles.modalField}><span style={styles.modalLabel}>Nom complet</span><span style={styles.modalValue}>{t.nom_client || '-'}</span></div>
                <div style={styles.modalField}><span style={styles.modalLabel}>Téléphone</span><span style={styles.modalValue}>{t.telephone_client || '-'}</span></div>
                <div style={styles.modalField}><span style={styles.modalLabel}>Email</span><span style={styles.modalValue}>{t.email_client || '-'}</span></div>
                <div style={styles.modalField}><span style={styles.modalLabel}>Type</span><span style={styles.modalValue}>{t.type_client || '-'}</span></div>
              </div>
              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>Ticket</h3>
                <div style={styles.modalField}>
                  <span style={styles.modalLabel}>Statut</span>
                  <span style={styles.modalValue}>
                    <span style={{ ...styles.badgeBase, backgroundColor: stat.bg, color: stat.text }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: stat.dot, marginRight: 6, display: 'inline-block' }} />
                      {statutKey}
                    </span>
                  </span>
                </div>
                <div style={styles.modalField}>
                  <span style={styles.modalLabel}>Priorité</span>
                  <span style={styles.modalValue}>
                    <span style={{ ...styles.badgeBase, backgroundColor: prio.bg, color: prio.text }}>{t.priorite?.toUpperCase()}</span>
                  </span>
                </div>
                <div style={styles.modalField}><span style={styles.modalLabel}>Site concerné</span><span style={styles.modalValue}>{siteDisplay(t)}</span></div>
                <div style={styles.modalField}>
                  <span style={styles.modalLabel}>Créé par</span>
                  {t.cree_par ? (
                    <span style={styles.userChip}
                      onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHoveredUser({ user: t.cree_par, rect: r }); }}
                      onMouseLeave={() => setHoveredUser(null)}>
                      {t.cree_par_display || t.cree_par.code_user}
                    </span>
                  ) : <span style={styles.modalValue}>{t.cree_par_display || '-'}</span>}
                </div>
                <div style={styles.modalField}>
                  <span style={styles.modalLabel}>Assigné à</span>
                  {t.assigne_a ? (
                    <span style={styles.userChip}
                      onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHoveredUser({ user: t.assigne_a, rect: r }); }}
                      onMouseLeave={() => setHoveredUser(null)}>
                      {t.assigne_a_display}
                    </span>
                  ) : <span style={styles.modalValue}>{t.assigne_a_display || '-'}</span>}
                </div>
                <div style={styles.modalField}><span style={styles.modalLabel}>Date création</span><span style={styles.modalValue}>{formatDateTimeFr(t.created_at)}</span></div>
                {t.resolu_le && <div style={styles.modalField}><span style={styles.modalLabel}>Résolu le</span><span style={styles.modalValue}>{formatDateTimeFr(t.resolu_le)}</span></div>}
              </div>
            </div>
            <div style={styles.modalSection}>
              <h3 style={styles.modalSectionTitle}>Mots-clés saisis</h3>
              <p style={styles.modalText}>{t.mots_cles_ia || 'Aucun mot-clé saisi.'}</p>
            </div>
            {t.description && (
              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>Description</h3>
                <p style={styles.modalText}>{t.description}</p>
              </div>
            )}
            {t.commentaires && t.commentaires.length > 0 && (
              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>Commentaires ({t.commentaires.length})</h3>
                {t.commentaires.map((c) => (
                  <div key={c.id} style={styles.comment}>
                    <strong>{c.auteur?.nom_user || 'Inconnu'}</strong>
                    <span style={{ color: COLORS.textMuted, fontSize: 11, marginLeft: 12 }}>{formatDateTimeFr(c.created_at)}</span>
                    <p style={{ margin: '4px 0 0', fontSize: 13 }}>{c.contenu}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={styles.modalFooter}>
            <div style={styles.statusActions}>
              {/* Status transition buttons for the ticket */}
              {ALL_STATUSES.map((s) => {
                const sk = getStatutKey(s);
                const sc = COLORS.status[sk] || COLORS.status.OUVERT;
                const isCurrent = t.statut === s;
                const canGo = forward.includes(s);
                return (
                  <button key={s} disabled={!canGo || updatingId === t.id}
                    onClick={() => handleTicketStatus(t.id, s, t.statut)}
                    style={{
                      ...styles.statusBtn,
                      backgroundColor: isCurrent ? sc.bg : (canGo ? 'var(--bg-card)' : 'var(--bg-card)'),
                      color: isCurrent ? '#FFFFFF' : (canGo ? sc.text : '#D0D0D0'),
                      borderColor: isCurrent ? sc.bg : (canGo ? sc.text : '#E5E5E5'),
                      cursor: canGo && updatingId !== t.id ? 'pointer' : 'not-allowed',
                      fontWeight: isCurrent ? 700 : (canGo ? 600 : 500),
                    }}>
                    {s.toUpperCase()}
                  </button>
                );
              })}
              <button onClick={() => handleArchiveTicket(t)}
                style={{ ...styles.statusBtn, backgroundColor: '#FEE2E2', color: '#DC2626', borderColor: '#FECACA', cursor: 'pointer', fontWeight: 600 }}>
                <IconArchive style={{ width: 12, height: 12, marginRight: 4 }} /> Archiver
              </button>
            </div>
            <button style={styles.btnCancel} onClick={() => setSelectedTicket(null)}>Fermer</button>
          </div>
        </div>
        {/* Floating user tooltip - shows on hover over user chips */}
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
    );
  };

  // ─── SITE DETAIL MODAL ───
  // Full site info with status toggle and archive actions
  const siteDetailModal = () => {
    if (!selectedSite) return null;
    const s = selectedSite;
    return (
      <div className="fade-in" style={styles.overlay} onClick={() => setSelectedSite(null)}>
        <div className="scale-in" style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <h2 style={styles.modalTitle}>Site {s.codeSite}</h2>
            <button style={styles.modalClose} onClick={() => setSelectedSite(null)}><IconX /></button>
          </div>
          <div style={styles.modalBody}>
            <div style={styles.modalGrid}>
              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>Site</h3>
                <div style={styles.modalField}><span style={styles.modalLabel}>Code</span><span style={styles.modalValue}>{s.codeSite}</span></div>
                <div style={styles.modalField}><span style={styles.modalLabel}>Nom</span><span style={styles.modalValue}>{s.nom}</span></div>
                <div style={styles.modalField}><span style={styles.modalLabel}>Wilaya</span><span style={styles.modalValue}>{s.wilaya}</span></div>
                <div style={styles.modalField}><span style={styles.modalLabel}>Commune</span><span style={styles.modalValue}>{s.commune}</span></div>
                <div style={styles.modalField}><span style={styles.modalLabel}>Adresse</span><span style={styles.modalValue}>{s.adresse || '-'}</span></div>
                <div style={styles.modalField}><span style={styles.modalLabel}>Technologie</span><span style={styles.modalValue}><span style={{ ...styles.badgeBase, backgroundColor: s.technologie === '4G' ? '#DCFCE7' : '#E0E7FF', color: s.technologie === '4G' ? '#15803D' : '#4338CA' }}>{s.technologie || '5G'}</span></span></div>
              </div>
              <div style={styles.modalSection}>
                <h3 style={styles.modalSectionTitle}>État</h3>
                <div style={styles.modalField}>
                  <span style={styles.modalLabel}>Statut</span>
                  <span style={styles.modalValue}>
                    <span style={{ ...styles.badgeBase, backgroundColor: ST_BG[s.statut] || 'var(--bg-card)', color: ST[s.statut] || 'var(--text-muted3)' }}>
                      {SITE_LABELS[s.statut]}
                    </span>
                  </span>
                </div>
                <div style={styles.modalField}><span style={styles.modalLabel}>Longitude</span><span style={styles.modalValue}>{s.coordX || '-'}</span></div>
                <div style={styles.modalField}><span style={styles.modalLabel}>Latitude</span><span style={styles.modalValue}>{s.coordY || '-'}</span></div>
                <div style={styles.modalField}><span style={styles.modalLabel}>Dernière MAJ</span><span style={styles.modalValue}>{formatDateTimeFr(s.derniere_maj)}</span></div>
                <div style={styles.modalField}><span style={styles.modalLabel}>Créé le</span><span style={styles.modalValue}>{formatDateTimeFr(s.created_at)}</span></div>
              </div>
            </div>
          </div>
          <div style={styles.modalFooter}>
            <div style={styles.statusActions}>
              {/* UP/DOWN toggle buttons */}
              {['UP', 'DOWN'].map((st) => {
                const isActive = s.statut === st;
                const isTarget = s.statut !== st;
                return (
                  <button key={st} disabled={!isTarget || togglingSiteId === s.id}
                    onClick={() => handleToggleSite(s.id, s.statut)}
                    style={{
                      ...styles.statusBtn,
                      backgroundColor: isActive ? (st === 'UP' ? '#059669' : '#DC2626') : 'var(--bg-card)',
                      color: isActive ? '#FFFFFF' : (isTarget ? (st === 'UP' ? '#059669' : '#DC2626') : '#D0D0D0'),
                      borderColor: isActive ? (st === 'UP' ? '#059669' : '#DC2626') : (isTarget ? (st === 'UP' ? '#059669' : '#DC2626') : '#E5E5E5'),
                      cursor: isTarget && togglingSiteId !== s.id ? 'pointer' : 'not-allowed',
                      fontWeight: isActive ? 700 : (isTarget ? 600 : 500),
                    }}>
                    {SITE_LABELS[st]}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button disabled={togglingSiteId === s.id} onClick={() => handleArchiveSite(s.id)}
                style={styles.btnDanger}>
                <IconArchive style={{ width: 14, height: 14, marginRight: 6 }} /> Archiver
              </button>
              <button style={styles.btnCancel} onClick={() => setSelectedSite(null)}>Fermer</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── Toast notification component ───
  // Fixed bottom-right stack of auto-dismissing notifications
  const NotificationToast = () => (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 99999,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {notifications.map((n) => (
        <div key={n.id} className="fade-in" style={{
          background: n.type === 'success' ? '#059669' : n.type === 'error' ? '#DC2626' : '#2563EB',
          color: '#FFF', padding: '12px 20px', borderRadius: 8,
          fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: 8, minWidth: 280,
        }}>
          {n.type === 'success' ? <IconCheck style={{ width: 16, height: 16 }} /> :
           n.type === 'error' ? <IconX style={{ width: 16, height: 16 }} /> :
           <IconInfo style={{ width: 16, height: 16 }} />}
          {n.message}
        </div>
      ))}
    </div>
  );

  // Map of view keys to their header titles
  const VIEW_TITLE = {
    dashboard: 'Dashboard', map: 'Cartographie', tickets: 'Réclamations',
    sites: 'Sites Réseau', users: 'Utilisateurs', reports: 'Rapports (SV)',
    performance: 'Performance Équipe',
  };

  // ─── MAIN RENDER ───
  return (
    <div style={styles.appLayout}>
      {detail && <DetailModal type={detail.type} data={detail.data} stats={stats} reporting={reporting} onClose={() => { setDetail(null); refreshAll(); }} />}
      {sidebar()}
      <main style={styles.mainContent}>
        <header style={styles.topHeader}>
          <h1 style={styles.pageTitle}>{VIEW_TITLE[currentView]}</h1>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Period toggle (only visible on dashboard view) */}
            {currentView === 'dashboard' && (
              <div style={styles.toggle}>
                {[{ l: '7j', v: 7 }, { l: '30j', v: 30 }, { l: '90j', v: 90 }].map((p) => (
                  <button key={p.v} onClick={() => setPeriod(p.v)} style={{ ...styles.togBtn, ...(period === p.v ? styles.togOn : {}) }}>{p.l}</button>
                ))}
              </div>
            )}
            <button onClick={refreshAll} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-toolbar)', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-muted3)' }} title="Actualiser"><IconRefresh style={{ width: 14, height: 14 }} /></button>
            <span style={styles.date}>{now()}</span>
          </div>
        </header>
        <div style={styles.pageContent}>
          {/* Render the active view based on currentView state */}
          {currentView === 'dashboard' && dashboardView()}
          {currentView === 'map' && mapView()}
          {currentView === 'tickets' && ticketsView()}
          {currentView === 'sites' && sitesView()}
          {currentView === 'users' && usersView()}
          {currentView === 'reports' && reportsView()}
          {currentView === 'performance' && performanceView()}
        </div>
      </main>
      {/* ─── Modals (rendered conditionally) ─── */}
      {showUserForm && userFormModal()}
      {showEditUserForm && editUserModal()}
      {showTicketForm && ticketFormModal()}
      {showSiteForm && siteFormModal()}
      {selectedTicket && ticketDetailModal()}
      {selectedSite && siteDetailModal()}
      {selectedRapport && rapportReadModal()}
      <NotificationToast />
    </div>
  );
}

// ─── Inline styles object ───
// All component styles are defined here using CSS-in-JS with theme variables
const styles = {
  appLayout: { display: 'flex', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif", width: '100%' },
  sidebar: { width: 193, backgroundColor: COLORS.sidebarBg, color: 'var(--text-sidebar)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' },
  brand: { height: 82, display: 'flex', alignItems: 'center', gap: 13, padding: '0 17px', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  logo: { width: 34, height: 'auto', objectFit: 'contain' },
  brandName: { color: '#FFFFFF', fontWeight: 700, fontSize: 16 },
  brandRole: { marginTop: 6, fontSize: 10, color: 'var(--text-sidebar)' },
  menu: { display: 'flex', flexDirection: 'column', gap: 5, padding: '26px 12px 0' },
  sectionLabel: { margin: '0 5px 10px', fontSize: 6, fontWeight: 700, color: 'var(--text-muted3)', letterSpacing: '1px' },
  navItem: { display: 'flex', alignItems: 'center', gap: 9, background: 'transparent', border: 'none', color: 'var(--text-sidebar)', padding: '0 10px', borderRadius: 6, cursor: 'pointer', textAlign: 'left', fontSize: 13, width: '100%', height: 34, textDecoration: 'none', outline: 'none' },
  navItemActive: { background: 'linear-gradient(90deg, #9a0c2d, #710820)', color: '#FFFFFF', fontWeight: 600 },
  mainContent: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
  topHeader: { position: 'sticky', top: 0, height: 51, display: 'flex', alignItems: 'center', padding: '0 27px', background: COLORS.cardBg, borderBottom: `1px solid ${COLORS.border}`, boxShadow: 'var(--shadow-sm)', zIndex: 10 },
  pageTitle: { margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' },
  pageContent: { padding: '24px 21px 40px', flex: 1, overflowY: 'auto' },
  statsRow: { display: 'flex', gap: 16, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: COLORS.cardBg, borderRadius: 8, padding: '16px 20px', border: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', gap: 4 },
  statNumber: { fontSize: 24, fontWeight: 700, color: COLORS.textDark },
  statLabel: { fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.3px' },
  tableCard: { backgroundColor: COLORS.cardBg, borderRadius: 7, border: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', width: '100%', boxShadow: 'var(--shadow-card)' },
  toolbar: { minHeight: 44, padding: '0 18px', display: 'flex', alignItems: 'center' },
  toolbarLeft: { display: 'flex', alignItems: 'center', gap: 11 },
  tableTitle: { margin: 0, fontSize: 11, fontWeight: 700, color: COLORS.textDark, display: 'flex', alignItems: 'center', gap: 8 },
  toolbarActions: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 9 },
  btnFilter: { display: 'flex', alignItems: 'center', backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.border}`, padding: '0 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: COLORS.textDark, height: 28, fontFamily: 'inherit' },
  searchWrapper: { position: 'relative', display: 'flex', alignItems: 'center', width: 188, height: 28 },
  searchIcon: { position: 'absolute', left: 10, color: COLORS.textMuted },
  searchInput: { width: '100%', height: '100%', padding: '0 10px 0 31px', borderRadius: 6, border: `1px solid ${COLORS.border}`, fontSize: 9, outline: 'none', color: COLORS.textDark, fontFamily: 'inherit', backgroundColor: 'var(--bg-input)' },
  filterArea: { display: 'flex', gap: 10, padding: '12px 18px', borderBottom: `1px solid ${COLORS.border}`, flexWrap: 'wrap', backgroundColor: 'var(--bg-filter)' },
  filterSelect: { minWidth: 140, height: 31, padding: '0 10px', color: COLORS.textDark, border: `1px solid ${COLORS.border}`, borderRadius: 5, outline: 'none', fontFamily: 'inherit', fontSize: 12, backgroundColor: 'var(--bg-input)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left', minWidth: 1000 },
  thRow: { backgroundColor: 'var(--bg-th)' },
  th: { height: 30, padding: '0 14px', fontWeight: 500, color: COLORS.textMuted, fontSize: 7, textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: `1px solid ${COLORS.border}` },
  tr: { borderBottom: `1px solid ${COLORS.border}`, transition: 'background 0.1s' },
  td: { height: 44, padding: '0 14px', color: COLORS.textDark, verticalAlign: 'middle', whiteSpace: 'nowrap' },
  emptyCell: { textAlign: 'center', padding: 30, color: COLORS.textMuted },
  badgeBase: { padding: '4px 10px', borderRadius: 4, fontWeight: 700, fontSize: 10, display: 'inline-flex', alignItems: 'center' },
  statusActions: { display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', flexWrap: 'wrap' },
  statusBtn: { display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 9, border: '1px solid', fontSize: 9, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' },
  toggle: { display: 'flex', gap: 2, background: 'var(--bg-toolbar)', borderRadius: 6, padding: 2 },
  togBtn: { padding: '4px 10px', fontSize: 10, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', color: 'var(--text-muted3)', background: 'transparent', fontFamily: 'inherit' },
  togOn: { background: 'var(--bg-card)', color: 'var(--text-secondary)', boxShadow: 'var(--shadow-sm)' },
  date: { fontSize: 10, color: 'var(--text-muted2)', fontWeight: 500, padding: '4px 10px', background: 'var(--bg-toolbar)', borderRadius: 4 },
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 },
  kpiCard: { padding: '16px 20px', background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 8, boxShadow: 'var(--shadow-sm)' },
  kpiLabel: { display: 'block', marginBottom: 6, fontSize: 9, color: 'var(--text-muted)' },
  kpiValue: { fontSize: 26 },
  panelHeader: { minHeight: 40, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${COLORS.border}` },
  panelTitle: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, fontWeight: 600 },
  textBtn: { display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 9, fontFamily: 'inherit' },
  chartsRow: { display: 'flex', gap: 16, marginBottom: 24, minHeight: 200 },
  chartBox: { background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' },
  ch: { padding: '10px 16px 4px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'baseline', gap: 8 },
  cht: { fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 0.3 },
  cb: { flex: 1, padding: '6px 6px 4px', minHeight: 260 },
  empty: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted2)', fontSize: 11 },
  formBody: { padding: '30px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '12px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 11, fontWeight: 700, color: COLORS.textDark },
  input: { padding: '10px 14px', borderRadius: 6, border: `1px solid ${COLORS.border}`, fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%' },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 30 },
  btnSubmit: { display: 'flex', alignItems: 'center', backgroundColor: COLORS.djezzyRed, color: '#FFFFFF', border: 'none', padding: '10px 24px', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  btnCancel: { display: 'flex', alignItems: 'center', backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.border}`, padding: '10px 24px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: COLORS.textDark, fontFamily: 'inherit' },
  btnDanger: { display: 'flex', alignItems: 'center', backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', padding: '10px 24px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  btnNew: { display: 'flex', alignItems: 'center', backgroundColor: COLORS.djezzyRed, color: '#FFFFFF', border: 'none', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: COLORS.cardBg, borderRadius: 12, width: 700, maxWidth: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-modal)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${COLORS.border}` },
  modalTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: COLORS.textDark },
  modalClose: { background: 'none', border: 'none', cursor: 'pointer', color: COLORS.textMuted, padding: 4 },
  modalBody: { padding: 24, overflowY: 'auto', flex: 1 },
  modalGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  modalSection: { marginBottom: 20 },
  modalSectionTitle: { fontSize: 12, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', margin: '0 0 12px 0', letterSpacing: '0.5px' },
  modalField: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${COLORS.border}` },
  modalLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: 500 },
  modalValue: { fontSize: 13, color: COLORS.textDark, fontWeight: 600 },
  modalText: { fontSize: 13, color: COLORS.textDark, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' },
  comment: { padding: 12, backgroundColor: 'var(--bg-input)', borderRadius: 8, marginBottom: 8 },
  modalFooter: { padding: '16px 24px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  userChip: { fontSize: 13, color: COLORS.djezzyRed, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: 'rgba(230,0,35,0.3)', position: 'relative' },
  userTooltip: { position: 'fixed', zIndex: 1200, backgroundColor: 'var(--text-primary)', color: 'var(--bg-card)', padding: '10px 14px', borderRadius: 8, fontSize: 12, boxShadow: 'var(--shadow-modal)', pointerEvents: 'none', whiteSpace: 'nowrap' },
  userTooltipArrow: { position: 'absolute', top: '-5px', left: '16px', width: 10, height: 10, backgroundColor: 'var(--text-primary)', transform: 'rotate(45deg)', borderRadius: 2 },
  userTooltipName: { fontWeight: 700, fontSize: 13, marginBottom: 4 },
  userTooltipDetail: { color: 'var(--text-muted2)', fontSize: 11, lineHeight: 1.6 },
};
