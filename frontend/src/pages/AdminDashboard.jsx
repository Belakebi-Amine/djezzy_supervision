import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { getDashboardStats, getDashboardReporting } from '../api/dashboard';
import { getSites, getUsers, createUser, getTickets, createTicket, updateTicket, createSite, updateSiteStatus, archiverSite, archiveUser, getTokenRole } from '../api/tickets';
import MapComponent from '../components/Map';
import DetailModal from '../components/DetailModal';
import logoDjezzy from '../assets/Djezzy_Logo.png';

const COLORS = {
  sidebarBg: '#11101f', mainBg: '#f5f6fa', cardBg: '#FFFFFF',
  textDark: '#1c212b', textMuted: '#818898', border: '#d8dde5', djezzyRed: '#e60023',
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
    OUVERT: { bg: '#BAE6FD', text: '#0369A1', dot: '#0284C7' },
    RESOLU: { bg: '#A7F3D0', text: '#047857', dot: '#15803D' },
    FERME: { bg: '#FECACA', text: '#B91C1C', dot: '#DC2626' },
  },
};
const PALETTE = ['#E8401A', '#2563EB', '#10B981', '#F59E0B', '#8B5CF6'];
const LABEL_MAP = { critique: 'Critique', haute: 'Haute', normale: 'Normale', basse: 'Basse' };
const ROLE_LABELS = {
  ADMIN: 'ADMINISTRATEUR', INGENIEUR_RESEAUX: 'ING RÉSEAU',
  AGENT_CALL_CENTER: 'AGENT CC', SUPERVISEUR: 'SUPERVISEUR',
};
const ROLE_STYLES = {
  ADMIN: { color: '#de2a3b', background: '#ffdfe2' },
  INGENIEUR_RESEAUX: { color: '#8b5e2f', background: '#efdac6' },
  AGENT_CALL_CENTER: { color: '#355ead', background: '#dce6ff' },
  SUPERVISEUR: { color: '#7440a5', background: '#eadcff' },
};
const ALL_STATUSES = ['ferme', 'ouvert', 'resolu'];
const STATUS_FLOW = { ferme: ['ouvert'], ouvert: ['resolu'], resolu: [] };
const SITE_LABELS = { UP: 'Actif', DOWN: 'Inactif' };
const ST = { UP: '#059669', DOWN: '#DC2626' };
const ST_BG = { UP: '#DCFCE7', DOWN: '#FEE2E2' };

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
const now = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

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
const IconChevronLeft = (p) => <svg {...iconProps} {...p}><path d="M15 18l-6-6 6-6" /></svg>;
const IconCheck = (p) => <svg {...iconProps} {...p}><path d="M4 12l5 5 11-11" /></svg>;
const IconInfo = (p) => <svg {...iconProps} {...p}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>;
const IconUser = (p) => <svg {...iconProps} {...p}><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>;
const IconArchive = (p) => <svg {...iconProps} {...p}><path d="M21 4H3M8 2v2M16 2v2M4 7l1 12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2l1-12M10 11v6M14 11v6" /></svg>;

const getStatutKey = (statut) => statut?.replace('_', ' ').toUpperCase();

const dispoColor = (v) => {
  if (v >= 100) return '#059669';
  if (v >= 75) return '#65A30D';
  if (v >= 50) return '#F59E0B';
  if (v >= 25) return '#EA580C';
  return '#DC2626';
};

const Tip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #d8dde5', borderRadius: 6, padding: '8px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#1c212b' }}>{label}</p>
      {payload.map((e, i) => (
        <p key={i} style={{ margin: '2px 0', color: e.color || '#555' }}>
          {e.name}: {typeof e.value === 'number' ? e.value.toLocaleString() : e.value}
        </p>
      ))}
    </div>
  );
};

function InfoPopup({ text }) {
  const [state, setState] = useState({ open: false, style: {} });
  return (
    <span style={{ position: 'relative', display: 'inline-flex', marginLeft: 6, cursor: 'pointer' }}
      onMouseEnter={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setState({ open: true, style: { top: r.bottom + 6, left: Math.max(4, r.left + r.width / 2 - 130) } });
      }}
      onMouseLeave={() => setState({ open: false, style: {} })}>
      <IconInfo style={{ width: 14, height: 14, color: '#94A3B8' }} />
      {state.open && (
        <div style={{
          position: 'fixed', top: state.style.top, left: state.style.left,
          background: '#1E293B', color: '#F1F5F9', padding: '8px 12px', borderRadius: 6,
          fontSize: 10, lineHeight: 1.5, zIndex: 99999, maxWidth: 260,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)', pointerEvents: 'none',
        }}>
          {text}
          <div style={{ position: 'absolute', top: '-5px', left: '50%', marginLeft: -5,
            border: '5px solid transparent', borderBottomColor: '#1E293B' }} />
        </div>
      )}
    </span>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const tokenRole = getTokenRole();
  const isAdmin = tokenRole === 'ADMIN';
  useEffect(() => {
    if (!isAdmin) navigate('/engineer-dashboard', { replace: true });
  }, [isAdmin, navigate]);

  const [currentView, setCurrentView] = useState('dashboard');
  const [period, setPeriod] = useState(30);
  const [stats, setStats] = useState(null);
  const [reporting, setReporting] = useState(null);
  const [sites, setSites] = useState([]);
  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [detail, setDetail] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [togglingSiteId, setTogglingSiteId] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [hoveredUser, setHoveredUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const addNotification = useCallback((message, type = 'success') => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 3500);
  }, []);
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

  useEffect(() => {
    fetchStats(); fetchSites(); fetchUsers(); fetchTickets();
  }, [fetchStats, fetchSites, fetchUsers, fetchTickets]);

  const refreshAll = () => { fetchStats(); fetchSites(); fetchTickets(); };

  // Derived
  const roleCounts = {};
  users.forEach((u) => { const r = ROLE_LABELS[u.role_user] || u.role_user || 'INCONNU'; roleCounts[r] = (roleCounts[r] || 0) + 1; });
  const siteUp = sites.filter((s) => s.statut === 'UP').length;
  const siteDown = sites.filter((s) => s.statut === 'DOWN').length;
  const ticketsOuvert = tickets.filter((t) => t.statut === 'ouvert').length;
  const ticketsResolu = tickets.filter((t) => t.statut === 'resolu').length;
  const ticketsFerme = tickets.filter((t) => t.statut === 'ferme').length;

  const filteredUsers = users.filter((u) => {
    const t = searchTerm.toLowerCase();
    return (u.nom_user || '').toLowerCase().includes(t) || (u.email || '').toLowerCase().includes(t) || (u.code_user || '').toLowerCase().includes(t);
  });

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

  // Chart data
  const evo = (stats?.graphiques?.evolution_tickets ?? []).map((d) => {
    const dd = new Date(d.jour);
    return { ...d, _raw: d.jour, jour: isNaN(dd.getTime()) ? d.jour : dd.toLocaleDateString('fr', { day: '2-digit', month: 'short' }) };
  });
  const reso = stats?.graphiques?.resolutions_par_jour ?? [];
  const evoResoMap = {};
  reso.forEach((r) => { const k = r.jour.slice(0, 10); evoResoMap[k] = (evoResoMap[k] || 0) + r.resolus; });
  const creesVsResolus = evo.map((d) => ({ ...d, crees: d.total, resolus: evoResoMap[d._raw.slice(0, 10)] || 0 }));
  const donut = stats?.graphiques?.repartition_priorite_donut
    ? Object.entries(stats.graphiques.repartition_priorite_donut).map(([k, v]) => ({
        name: LABEL_MAP[k] || k, value: v,
        color: { critique: '#DC2626', haute: '#F59E0B', normale: '#2563EB', basse: '#10B981' }[k] || '#94A3B8', raw: k,
      })) : [];
  const topSites = stats?.graphiques?.top_sites_impactes ?? [];
  const communes = reporting?.tableau_communes ?? [];

  // Handlers
  const handleLogout = () => {
    ['token', 'access_token', 'refresh_token'].forEach((k) => localStorage.removeItem(k));
    navigate('/login');
  };

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

  const handleArchiveUser = useCallback(async (user) => {
    if (!window.confirm(`Désactiver l'utilisateur ${user.code_user} ?`)) return;
    setUpdatingId(user.id);
    try {
        await archiveUser(user.code_user);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      addNotification(`Utilisateur ${user.code_user} désactivé`, 'success');
    } catch { addNotification("Erreur lors de la désactivation.", 'error'); }
    finally { setUpdatingId(null); }
  }, [addNotification]);

  const getRoleBadge = (role) => {
    const s = ROLE_STYLES[role] || ROLE_STYLES.AGENT_CALL_CENTER;
    return <span style={{ ...styles.badgeBase, ...s }}>{ROLE_LABELS[role] || role || 'INCONNU'}</span>;
  };

  const siteDisplay = (t) => {
    if (typeof t.site === 'object') return t.site?.nom || t.site?.codeSite || '-';
    const found = sites.find((s) => s.id === t.site);
    return found?.nom || found?.codeSite || '-';
  };

  // Sidebar
  const sidebar = () => (
    <aside style={styles.sidebar}>
      <div style={styles.brand}>
        <img src={logoDjezzy} alt="" style={styles.logo} />
        <div><div style={styles.brandName}>Djezzy</div><div style={styles.brandRole}>Administrateur</div></div>
      </div>
      <div style={styles.menu}>
        <span style={styles.sectionLabel}>PRINCIPAL</span>
        {[
          { key: 'dashboard', label: 'Dashboard', icon: IconDashboard },
          { key: 'map', label: 'Cartographie', icon: IconMap },
          { key: 'tickets', label: 'Réclamations', icon: IconTicket },
          { key: 'sites', label: 'Sites Réseau', icon: IconSite },
          { key: 'users', label: 'Utilisateurs', icon: IconUsers },
          { key: 'reports', label: 'Rapports', icon: IconReport },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setCurrentView(key)}
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

  // ─── DASHBOARD ───
  const dashboardView = () => (
    <>
      <div style={styles.kpiRow}>
        {[
          { label: 'Total Sites', value: sites.length, color: COLORS.textDark },
          { label: 'Sites UP', value: siteUp, color: '#10B981' },
          { label: 'Sites DOWN', value: siteDown, color: '#EF4444' },
          { label: 'Utilisateurs', value: users.length, color: COLORS.djezzyRed },
        ].map((k) => (
          <div key={k.label} style={styles.kpiCard}>
            <span style={styles.kpiLabel}>{k.label}</span>
            <strong style={{ ...styles.kpiValue, color: k.color }}>{k.value}</strong>
          </div>
        ))}
      </div>
      <div style={styles.kpiRow}>
        {[
          { label: 'Ouvert', value: ticketsOuvert, color: '#1D4ED8' },
          { label: 'Résolu', value: ticketsResolu, color: '#047857' },
          { label: 'Fermé', value: ticketsFerme, color: '#B91C1C' },
        ].map((k) => (
          <div key={k.label} style={styles.kpiCard}>
            <span style={styles.kpiLabel}>{k.label}</span>
            <strong style={{ ...styles.kpiValue, color: k.color }}>{k.value}</strong>
          </div>
        ))}
      </div>
      <div style={{ ...styles.tableCard, marginBottom: 16 }}>
        <div style={styles.panelHeader}>
          <span style={styles.panelTitle}><IconMap /> Cartographie</span>
          <button onClick={() => setCurrentView('map')} style={{ ...styles.textBtn, color: COLORS.djezzyRed }}>Ouvrir la carte <IconChevronLeft /></button>
        </div>
        <div style={{ height: 220 }}><MapComponent sites={sites} /></div>
      </div>
      <div style={{ marginBottom: 8, marginTop: 8 }}><span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', letterSpacing: 0.5 }}>ANALYTIQUE</span></div>
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
                  <Line type="monotone" dataKey="total" stroke="#E8401A" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 6 }} name="Tickets" />
                </LineChart>
              </ResponsiveContainer>}
          </div>
        </div>
        <div className="fade-in chart-card" style={{ ...styles.chartBox, flex: 1 }}>
          <div style={styles.ch}><span style={styles.cht}>Par priorité</span><InfoPopup text="Répartition des tickets par priorité." /></div>
          <div style={{ ...styles.cb, minHeight: 180 }}>
            {donut.length === 0 ? <div style={styles.empty}>Aucune donnée</div>
            : <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donut} cx="50%" cy="50%" innerRadius={32} outerRadius={60} paddingAngle={4} dataKey="value"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => e?.name && setDetail({ type: 'priorite', data: e })}>
                    {donut.map((e) => <Cell key={e.name} fill={e.color} style={{ cursor: 'pointer' }} />)}
                  </Pie>
                  <RechartsTooltip content={<Tip />} />
                </PieChart>
              </ResponsiveContainer>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '2px 0 8px', flexWrap: 'wrap' }}>
            {donut.map((e) => (
              <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: '#475569', cursor: 'pointer' }}
                onClick={() => setDetail({ type: 'priorite', data: e })}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: e.color }} />{e.name}: <strong>{e.value}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="fade-in chart-card" style={{ ...styles.chartBox, flex: 1.2 }}>
          <div style={styles.ch}><span style={styles.cht}>Créés vs Résolus</span><InfoPopup text="Évolution quotidienne des tickets créés et résolus." /></div>
          <div style={styles.cb}>
            {creesVsResolus.length === 0 ? <div style={styles.empty}>Aucune donnée</div>
            : <ResponsiveContainer width="100%" height="100%">
                <LineChart data={creesVsResolus} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="jour" tick={{ fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#e8e8e8' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} width={25} />
                  <RechartsTooltip content={<Tip />} />
                  <Line type="monotone" dataKey="crees" stroke="#2563EB" strokeWidth={2} dot={{ r: 1.5 }} activeDot={{ r: 5 }} name="Créés" />
                  <Line type="monotone" dataKey="resolus" stroke="#10B981" strokeWidth={2} dot={{ r: 1.5 }} activeDot={{ r: 5 }} name="Résolus" />
                </LineChart>
              </ResponsiveContainer>}
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 8 }}><span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', letterSpacing: 0.5 }}>RÉSEAU</span></div>
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
    </>
  );

  // ─── TICKETS ───
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
              const forward = STATUS_FLOW[ticket.statut] || [];
              return (
                <tr key={ticket.id} style={styles.tr}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
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
                              backgroundColor: isCurrent ? sc.bg : (canGo ? '#FFFFFF' : '#FFFFFF'),
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

  // ─── SITES ───
  const sitesView = () => (
    <>
      <div style={styles.statsRow}>
        <div className="fade-in stat-card" style={{ ...styles.statCard, borderLeftColor: '#3B82F6', animationDelay: '0s' }}>
          <span style={{ ...styles.statNumber, color: '#171a21' }}>{filteredSites.length}</span>
          <span style={styles.statLabel}>Total sites</span>
        </div>
        <div className="fade-in stat-card" style={{ ...styles.statCard, borderLeftColor: '#15803D', animationDelay: '0.05s' }}>
          <span style={{ ...styles.statNumber, color: '#15803D' }}>{filteredSites.filter((s) => s.statut === 'UP').length}</span>
          <span style={styles.statLabel}>Actif</span>
        </div>
        <div className="fade-in stat-card" style={{ ...styles.statCard, borderLeftColor: '#DC2626', animationDelay: '0.1s' }}>
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
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
                        backgroundColor: ST[site.statut] || '#64748B',
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
                      {['UP', 'DOWN'].map((s) => {
                        const isActive = site.statut === s;
                        const isTarget = site.statut !== s;
                        return (
                          <button key={s} disabled={!isTarget || togglingSiteId === site.id}
                            onClick={(e) => { e.stopPropagation(); handleToggleSite(site.id, site.statut); }}
                            style={{
                              ...styles.statusBtn,
                              backgroundColor: isActive ? (s === 'UP' ? '#059669' : '#DC2626') : '#FFFFFF',
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

  // ─── USERS ───
  const usersView = () => (
    <div style={styles.tableCard}>
      <div style={{ ...styles.toolbar, borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={styles.toolbarLeft}><h2 style={styles.tableTitle}><IconUsers /> Utilisateurs</h2></div>
        <div style={styles.toolbarActions}>
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
              <th style={{ ...styles.th, textAlign: 'center' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr><td colSpan="7" style={styles.emptyCell}>Aucun utilisateur trouvé.</td></tr>
            ) : filteredUsers.map((u) => (
              <tr key={u.code_user} style={styles.tr}>
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
                  {u.is_active !== false && (
                    <button onClick={() => handleArchiveUser(u)}
                      style={{ ...styles.statusBtn, backgroundColor: '#FEE2E2', color: '#DC2626', borderColor: '#FECACA', cursor: 'pointer' }}>
                      <IconArchive style={{ width: 10, height: 10 }} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── MAP ───
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

  // ─── REPORTS ───
  const reportsView = () => (
    <div style={{ ...styles.tableCard, minHeight: 450, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#8b8e98' }}>
      <IconReport style={{ width: 42, height: 42, marginBottom: 15 }} />
      <h3 style={{ marginBottom: 8, color: '#343640' }}>Rapports</h3>
      <p>L'interface des rapports sera affichée ici.</p>
      <button onClick={refreshAll} style={{ ...styles.textBtn, marginTop: 12, color: COLORS.djezzyRed }}><IconRefresh /> Actualiser les données</button>
    </div>
  );

  // ─── USER FORM MODAL ───
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

  // ─── TICKET FORM MODAL ───
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
                      backgroundColor: isCurrent ? sc.bg : (canGo ? '#FFFFFF' : '#FFFFFF'),
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
                    <span style={{ ...styles.badgeBase, backgroundColor: ST_BG[s.statut] || '#F1F5F9', color: ST[s.statut] || '#64748B' }}>
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
              {['UP', 'DOWN'].map((st) => {
                const isActive = s.statut === st;
                const isTarget = s.statut !== st;
                return (
                  <button key={st} disabled={!isTarget || togglingSiteId === s.id}
                    onClick={() => handleToggleSite(s.id, s.statut)}
                    style={{
                      ...styles.statusBtn,
                      backgroundColor: isActive ? (st === 'UP' ? '#059669' : '#DC2626') : '#FFFFFF',
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

  const VIEW_TITLE = {
    dashboard: 'Dashboard', map: 'Cartographie', tickets: 'Réclamations',
    sites: 'Sites Réseau', users: 'Utilisateurs', reports: 'Rapports',
  };

  return (
    <div style={styles.appLayout}>
      {detail && <DetailModal type={detail.type} data={detail.data} stats={stats} reporting={reporting} onClose={() => { setDetail(null); refreshAll(); }} />}
      {sidebar()}
      <main style={styles.mainContent}>
        <header style={styles.topHeader}>
          <h1 style={styles.pageTitle}>{VIEW_TITLE[currentView]}</h1>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {currentView === 'dashboard' && (
              <div style={styles.toggle}>
                {[{ l: '7j', v: 7 }, { l: '30j', v: 30 }, { l: '90j', v: 90 }].map((p) => (
                  <button key={p.v} onClick={() => setPeriod(p.v)} style={{ ...styles.togBtn, ...(period === p.v ? styles.togOn : {}) }}>{p.l}</button>
                ))}
              </div>
            )}
            <button onClick={refreshAll} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f4f9', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', color: '#64748B' }} title="Actualiser"><IconRefresh style={{ width: 14, height: 14 }} /></button>
            <span style={styles.date}>{now()}</span>
          </div>
        </header>
        <div style={styles.pageContent}>
          {currentView === 'dashboard' && dashboardView()}
          {currentView === 'map' && mapView()}
          {currentView === 'tickets' && ticketsView()}
          {currentView === 'sites' && sitesView()}
          {currentView === 'users' && usersView()}
          {currentView === 'reports' && reportsView()}
        </div>
      </main>
      {showUserForm && userFormModal()}
      {showTicketForm && ticketFormModal()}
      {showSiteForm && siteFormModal()}
      {selectedTicket && ticketDetailModal()}
      {selectedSite && siteDetailModal()}
      <NotificationToast />
    </div>
  );
}

const styles = {
  appLayout: { display: 'flex', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif", width: '100%' },
  sidebar: { width: 193, backgroundColor: COLORS.sidebarBg, color: '#94A3B8', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  brand: { height: 82, display: 'flex', alignItems: 'center', gap: 13, padding: '0 17px', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  logo: { width: 34, height: 'auto', objectFit: 'contain' },
  brandName: { color: '#FFFFFF', fontWeight: 700, fontSize: 16 },
  brandRole: { marginTop: 6, fontSize: 10, color: '#9492a0' },
  menu: { display: 'flex', flexDirection: 'column', gap: 5, padding: '26px 12px 0' },
  sectionLabel: { margin: '0 5px 10px', fontSize: 6, fontWeight: 700, color: '#4e4b5c', letterSpacing: '1px' },
  navItem: { display: 'flex', alignItems: 'center', gap: 9, background: 'transparent', border: 'none', color: '#92909e', padding: '0 10px', borderRadius: 6, cursor: 'pointer', textAlign: 'left', fontSize: 13, width: '100%', height: 34, textDecoration: 'none', outline: 'none' },
  navItemActive: { background: 'linear-gradient(90deg, #9a0c2d, #710820)', color: '#FFFFFF', fontWeight: 600 },
  mainContent: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
  topHeader: { position: 'sticky', top: 0, height: 51, display: 'flex', alignItems: 'center', padding: '0 27px', background: COLORS.cardBg, borderBottom: '1px solid #dadde3', boxShadow: '0 1px 2px rgba(20,25,35,0.08)', zIndex: 10 },
  pageTitle: { margin: 0, fontSize: 14, fontWeight: 700, color: '#171a21' },
  pageContent: { padding: '24px 21px 40px', flex: 1, overflowY: 'auto' },
  statsRow: { display: 'flex', gap: 16, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: COLORS.cardBg, borderRadius: 8, padding: '16px 20px', border: '1px solid #d6dae1', borderLeftWidth: 4, display: 'flex', flexDirection: 'column', gap: 4 },
  statNumber: { fontSize: 24, fontWeight: 700, color: COLORS.textDark },
  statLabel: { fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.3px' },
  tableCard: { backgroundColor: COLORS.cardBg, borderRadius: 7, border: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', width: '100%', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' },
  toolbar: { minHeight: 44, padding: '0 18px', display: 'flex', alignItems: 'center' },
  toolbarLeft: { display: 'flex', alignItems: 'center', gap: 11 },
  tableTitle: { margin: 0, fontSize: 11, fontWeight: 700, color: COLORS.textDark, display: 'flex', alignItems: 'center', gap: 8 },
  toolbarActions: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 9 },
  btnFilter: { display: 'flex', alignItems: 'center', backgroundColor: COLORS.cardBg, border: `1px solid ${COLORS.border}`, padding: '0 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: COLORS.textDark, height: 28, fontFamily: 'inherit' },
  searchWrapper: { position: 'relative', display: 'flex', alignItems: 'center', width: 188, height: 28 },
  searchIcon: { position: 'absolute', left: 10, color: COLORS.textMuted },
  searchInput: { width: '100%', height: '100%', padding: '0 10px 0 31px', borderRadius: 6, border: `1px solid ${COLORS.border}`, fontSize: 9, outline: 'none', color: COLORS.textDark, fontFamily: 'inherit' },
  filterArea: { display: 'flex', gap: 10, padding: '12px 18px', borderBottom: `1px solid ${COLORS.border}`, flexWrap: 'wrap' },
  filterSelect: { minWidth: 140, height: 31, padding: '0 10px', color: COLORS.textDark, border: `1px solid ${COLORS.border}`, borderRadius: 5, outline: 'none', fontFamily: 'inherit', fontSize: 12 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left', minWidth: 1000 },
  thRow: { backgroundColor: '#f3f6f9' },
  th: { height: 30, padding: '0 14px', fontWeight: 500, color: COLORS.textMuted, fontSize: 7, textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: `1px solid ${COLORS.border}` },
  tr: { borderBottom: `1px solid ${COLORS.border}`, transition: 'background 0.1s' },
  td: { height: 44, padding: '0 14px', color: COLORS.textDark, verticalAlign: 'middle', whiteSpace: 'nowrap' },
  emptyCell: { textAlign: 'center', padding: 30, color: COLORS.textMuted },
  badgeBase: { padding: '4px 10px', borderRadius: 4, fontWeight: 700, fontSize: 10, display: 'inline-flex', alignItems: 'center' },
  statusActions: { display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', flexWrap: 'wrap' },
  statusBtn: { display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 9, border: '1px solid', fontSize: 9, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' },
  toggle: { display: 'flex', gap: 2, background: '#f1f4f9', borderRadius: 6, padding: 2 },
  togBtn: { padding: '4px 10px', fontSize: 10, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', color: '#64748B', background: 'transparent', fontFamily: 'inherit' },
  togOn: { background: '#fff', color: '#171a21', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  date: { fontSize: 10, color: '#94A3B8', fontWeight: 500, padding: '4px 10px', background: '#f1f4f9', borderRadius: 4 },
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 },
  kpiCard: { padding: '16px 20px', background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  kpiLabel: { display: 'block', marginBottom: 6, fontSize: 9, color: '#555861' },
  kpiValue: { fontSize: 26 },
  panelHeader: { minHeight: 40, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #eceef2' },
  panelTitle: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, fontWeight: 600 },
  textBtn: { display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 9, fontFamily: 'inherit' },
  chartsRow: { display: 'flex', gap: 16, marginBottom: 24, minHeight: 200 },
  chartBox: { background: COLORS.cardBg, border: '1px solid #d8dde5', borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  ch: { padding: '10px 16px 4px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'baseline', gap: 8 },
  cht: { fontSize: 11, fontWeight: 700, color: '#1c212b', textTransform: 'uppercase', letterSpacing: 0.3 },
  cb: { flex: 1, padding: '6px 6px 4px', minHeight: 260 },
  empty: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', fontSize: 11 },
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
  modal: { backgroundColor: COLORS.cardBg, borderRadius: 12, width: 700, maxWidth: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
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
  comment: { padding: 12, backgroundColor: '#F8FAFC', borderRadius: 8, marginBottom: 8 },
  modalFooter: { padding: '16px 24px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  userChip: { fontSize: 13, color: COLORS.djezzyRed, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: 'rgba(230,0,35,0.3)', position: 'relative' },
  userTooltip: { position: 'fixed', zIndex: 1200, backgroundColor: '#1E293B', color: '#F1F5F9', padding: '10px 14px', borderRadius: 8, fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', pointerEvents: 'none', whiteSpace: 'nowrap' },
  userTooltipArrow: { position: 'absolute', top: '-5px', left: '16px', width: 10, height: 10, backgroundColor: '#1E293B', transform: 'rotate(45deg)', borderRadius: 2 },
  userTooltipName: { fontWeight: 700, fontSize: 13, marginBottom: 4 },
  userTooltipDetail: { color: '#94A3B8', fontSize: 11, lineHeight: 1.6 },
};
