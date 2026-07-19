/*
 * SupervisorDashboard.jsx
 *
 * Main dashboard component for the supervisor role in Djezzy Hub.
 * Displays KPIs, ticket evolution charts, priority distribution,
 * site availability by commune, a 5G site map, and an AI-powered
 * report generation / management feature.
 *
 * Views:
 *   - dashboard   : default overview with charts and stats
 *   - cartographie: interactive 5G site coverage map
 *   - rapport-ia  : create, edit, save, and download AI-generated reports
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { spawnParticles } from '../hooks/useAnimations';
import { useNotification } from '../context/NotificationContext';
import {
  LineChart, Line, BarChart, Bar, Cell,
  PieChart, Pie,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  Tooltip,
} from 'recharts';
import DOMPurify from 'dompurify';
import html2pdf from 'html2pdf.js';
import {
  getDashboardStats, getDashboardReporting,
  genererRapportIA, getRapportsIA, sauvegarderRapportIA,
  updateRapportIA, deleteRapportIA, getArchivedRapports, restoreRapportIA,
} from '../api/dashboard';
import { getSites, getTickets, getTokenRole } from '../api/tickets';
import DetailModal from '../components/DetailModal';
import MapComponent from '../components/Map';
import logoDjezzy from '../assets/Djezzy_Logo.png';

/* ── Design tokens & color palette used across charts ── */
const C = {
  sidebarBg: 'var(--bg-sidebar)', mainBg: 'var(--bg-main)', cardBg: 'var(--bg-card)',
  textDark: 'var(--text-primary)', textMuted: 'var(--text-muted)', border: 'var(--border-color)',
};

/* ── Reusable SVG icon props and inline icon components ── */
const iconProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IconD = (p) => <svg {...iconProps} {...p}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>;
const IconU = (p) => <svg {...iconProps} {...p}><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>;
const IconL = (p) => <svg {...iconProps} {...p}><path d="M15 16l4-4-4-4" /><path d="M19 12H8" /><path d="M12 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" /></svg>;
const IconI = (p) => <svg {...iconProps} {...p}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>;
const IconMap = (p) => <svg {...iconProps} {...p}><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
const IconFile = (p) => <svg {...iconProps} {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>;
const IconTrash = (p) => <svg {...iconProps} {...p}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;
const IconEdit = (p) => <svg {...iconProps} {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const IconSend = (p) => <svg {...iconProps} {...p}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>;
const IconDownload = (p) => <svg {...iconProps} {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
const IconSave = (p) => <svg {...iconProps} {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>;
const IconCalendar = (p) => <svg {...iconProps} {...p}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
const IconX = (p) => <svg {...iconProps} {...p}><path d="M18 6L6 18M6 6l12 12" /></svg>;
const IconSite = (p) => <svg {...iconProps} {...p}><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.3" /></svg>;
const IconArchive = (p) => <svg {...iconProps} {...p}><path d="M21 4H3M8 2v2M16 2v2M4 7l1 12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2l1-12M10 11v6M14 11v6" /></svg>;

/* Custom tooltip component used by all Recharts charts */
const Tip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  const extra = payload?.[0]?.payload;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '8px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{label}</p>
      {extra?.codeSite && <p style={{ margin: '2px 0', color: 'var(--text-muted2)', fontSize: 11 }}>Code: {extra.codeSite}</p>}
      {payload.map((e, i) => (
        <p key={i} style={{ margin: '2px 0', color: e.color || '#555' }}>
          {e.name}: {typeof e.value === 'number' ? e.value.toLocaleString() : e.value}
        </p>
      ))}
    </div>
  );
};

/* Returns today's date formatted as DD/MM/YYYY */
const now = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

/*
 * InfoPopup – small hoverable info icon that shows a tooltip.
 * Used next to chart titles to explain what the chart displays.
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
      <IconI style={{ width: 14, height: 14, color: 'var(--text-muted2)' }} />
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


export default function SupervisorDashboard() {
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  // Role guard
  const tokenRole = getTokenRole();
  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAuthChecked(true), 100); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (!authChecked) return;
    if (!tokenRole) { navigate('/login', { replace: true }); return; }
    if (tokenRole !== 'SUPERVISEUR') {
      const dashMap = { ADMIN: '/admin-dashboard', INGENIEUR_RESEAUX: '/engineer-dashboard', AGENT_CALL_CENTER: '/call-center-dashboard' };
      navigate(dashMap[tokenRole] || '/login', { replace: true });
    }
  }, [authChecked, tokenRole, navigate]);

  /* ── Core view / navigation state ── */
  const [currentView, setCurrentView] = useState('dashboard');   // 'dashboard' | 'cartographie' | 'rapport-ia'
  const [period, setPeriod] = useState(30);                       // number of days for data range
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ── Dashboard data ── */
  const [stats, setStats] = useState(null);          // main KPI and chart data
  const [reporting, setReporting] = useState(null);   // commune-level reporting table
  const [detail, setDetail] = useState(null);         // drives the DetailModal when a chart element is clicked
  const [sites, setSites] = useState([]);             // list of network sites (for map + table)

  /* ── AI Report state ── */
  const [prompt, setPrompt] = useState('');               // user prompt for report generation
  const [dateDebut, setDateDebut] = useState('');         // start date filter for report scope
  const [dateFin, setDateFin] = useState('');             // end date filter
  const [datesFromPrompt, setDatesFromPrompt] = useState(false); // flag: dates were auto-extracted from prompt

  // Auto-extract dates from prompt text (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
  const extractDatesFromPrompt = useCallback((text) => {
    const dates = [];
    // Match DD/MM/YYYY or DD-MM-YYYY
    const dmy = text.matchAll(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g);
    for (const m of dmy) {
      const [, d, mo, y] = m;
      dates.push(`${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`);
    }
    // Match YYYY-MM-DD
    const ymd = text.matchAll(/(\d{4})-(\d{1,2})-(\d{1,2})/g);
    for (const m of ymd) {
      const [, y, mo, d] = m;
      dates.push(`${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`);
    }
    // Match "DD mois YYYY" (written French dates)
    const moisMap = { janvier:'01', fevrier:'02', mars:'03', avril:'04', mai:'05', juin:'06', juillet:'07', aout:'08', aout:'08', septembre:'09', octobre:'10', novembre:'11', decembre:'12' };
    const fr = text.matchAll(/(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|aout|septembre|octobre|novembre|decembre)\s+(\d{4})/gi);
    for (const m of fr) {
      const [, d, mo, y] = m;
      const moNum = moisMap[mo.toLowerCase()];
      if (moNum) dates.push(`${y}-${moNum}-${d.padStart(2, '0')}`);
    }
    return dates;
  }, []);
  const [generatedContent, setGeneratedContent] = useState(null);  // HTML content returned by the AI
  const [generating, setGenerating] = useState(false);    // loading flag during generation
  const [savedReports, setSavedReports] = useState([]);   // list of previously saved reports
  const [selectedReportId, setSelectedReportId] = useState(null);  // ID of the currently loaded report
  const [saving, setSaving] = useState(false);
  const [savedName, setSavedName] = useState('');         // editable title of the current report
  const [editMode, setEditMode] = useState(false);        // whether the report is being edited
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [rapportView, setRapportView] = useState('create'); // sub-view: 'create' | 'list'
  const [viewRapport, setViewRapport] = useState(null); // rapport to view in popup
  const [rapportSearch, setRapportSearch] = useState('');
  const resultRef = useRef(null);  // ref used to auto-scroll to the generated report

  /* ── Performance view state ── */
  const [perfRole, setPerfRole] = useState('ingenieurs');
  const [perfUser, setPerfUser] = useState(null);

  /* ── Archives state ── */
  const [archivedRapports, setArchivedRapports] = useState([]);
  const [archivedLoading, setArchivedLoading] = useState(false);

  const fetchArchivedRapports = useCallback(async () => {
    setArchivedLoading(true);
    try { const d = await getArchivedRapports(); setArchivedRapports(Array.isArray(d) ? d : []); }
    catch { setArchivedRapports([]); }
    finally { setArchivedLoading(false); }
  }, []);

  useEffect(() => { if (currentView === 'archives') fetchArchivedRapports(); }, [currentView, fetchArchivedRapports]);

  /* ── Priority modal state ── */
  const [prioModal, setPrioModal] = useState(null); // null or { priorite: string, label: string, color: string }
  const [allTickets, setAllTickets] = useState([]);
  const [prioLoading, setPrioLoading] = useState(false);
  const [prioFilter, setPrioFilter] = useState('all'); // 'all' | 'ouvert' | 'resolu' | 'ferme'

  /* ── Data fetching ── */

  // fetchData – full load with loading & error states
  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [a, b] = await Promise.all([getDashboardStats(period), getDashboardReporting(period)]);
      setStats(a); setReporting(b);
    } catch (err) { setError(err.message || 'Erreur.'); setStats(null); setReporting(null); }
    finally { setLoading(false); }
  }, [period]);

  // Initial fetch whenever the selected period changes
  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Auto-refresh every 5 seconds (transparent) ───
  useEffect(() => {
    const interval = setInterval(() => {
      const refresh = async () => {
        try {
          const [a, b] = await Promise.all([getDashboardStats(period), getDashboardReporting(period)]);
          setStats(a); setReporting(b);
        } catch {}
      };
      refresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [period]);

  // Clear the detail modal whenever the period changes
  useEffect(() => { setDetail(null); }, [period]);

  // When switching to the rapport-ia view, load the saved reports list
  useEffect(() => { if (currentView === 'rapport-ia') { getRapportsIA().then(setSavedReports).catch(() => {}); } }, [currentView]);

  // When priority modal opens, fetch all reclamations once
  useEffect(() => {
    if (!prioModal) return;
    if (allTickets.length > 0) return; // already loaded
    setPrioLoading(true);
    getTickets().then((data) => {
      setAllTickets(Array.isArray(data) ? data : []);
    }).catch(() => setAllTickets([])).finally(() => setPrioLoading(false));
  }, [prioModal, allTickets.length]);

  // Derived: filter tickets by selected priority
  const prioTickets = prioModal ? allTickets.filter((t) => t.priorite === prioModal.priorite) : [];

  /* ── AI Report handlers ── */

  // handleGenerate – sends prompt + date range to the backend AI service
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    // Auto-extract dates from prompt if date fields are empty
    let dd = dateDebut, df = dateFin;
    if (!dd && !df) {
      const found = extractDatesFromPrompt(prompt);
      if (found.length >= 2) {
        dd = found[0];
        df = found[1];
        setDateDebut(dd);
        setDateFin(df);
        setDatesFromPrompt(true);
      } else if (found.length === 1) {
        dd = found[0];
        df = found[0];
        setDateDebut(dd);
        setDateFin(df);
        setDatesFromPrompt(true);
      }
    }
    setGenerating(true);
    setGeneratedContent(null);
    setSelectedReportId(null);
    try {
      const result = await genererRapportIA(prompt.trim(), dd || null, df || null);
      setGeneratedContent(result.contenu);
      setSavedName(prompt.trim().slice(0, 80));
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setGenerating(false);
    }
  }, [prompt, dateDebut, dateFin]);

  // handleSave – persists the generated report to the backend
  const handleSave = useCallback(async () => {
    if (!generatedContent) return;
    const titre = window.prompt('Donnez un titre au rapport :', savedName || prompt.slice(0, 80));
    if (!titre || !titre.trim()) return;
    setSaving(true);
    try {
      const report = await sauvegarderRapportIA(titre.trim(), prompt, generatedContent, dateDebut || null, dateFin || null);
      setSavedName(titre.trim());
      setSavedReports((prev) => [report, ...prev]);
      setSelectedReportId(report.id);
      addNotification('Rapport sauvegardé !');
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }, [generatedContent, savedName, prompt, dateDebut, dateFin]);

  // handleLoadReport – loads a previously saved report into the editor
  const handleLoadReport = useCallback(async (id) => {
    try {
      const report = savedReports.find(r => r.id === id);
      if (report) {
        setGeneratedContent(report.contenu);
        setPrompt(report.prompt);
        setSavedName(report.titre);
        setSelectedReportId(report.id);
        setDateDebut(report.date_debut || '');
        setDateFin(report.date_fin || '');
        setEditMode(false);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
      }
    } catch (err) {
      addNotification(err.message, 'error');
    }
  }, [savedReports]);

  // handleDeleteReport – removes a report from the backend and the local list
  const handleDeleteReport = useCallback(async (id) => {
    if (!window.confirm('Supprimer ce rapport ?')) return;
    try {
      await deleteRapportIA(id);
      setSavedReports((prev) => prev.filter(r => r.id !== id));
      addNotification('Rapport supprimé');
      if (selectedReportId === id) {
        setSelectedReportId(null);
        setGeneratedContent(null);
      }
    } catch (err) {
      addNotification(err.message, 'error');
    }
  }, [selectedReportId]);

  // handleUpdateReport – saves edits to an existing report
  const handleUpdateReport = useCallback(async () => {
    if (!selectedReportId || !editTitle.trim()) return;
    try {
      const updated = await updateRapportIA(selectedReportId, { titre: editTitle.trim(), contenu: editContent });
      // Update the matching entry in the local list
      setSavedReports((prev) => prev.map(r => r.id === selectedReportId ? { ...r, ...updated, titre: editTitle.trim(), contenu: editContent } : r));
      setSavedName(editTitle.trim());
      setGeneratedContent(editContent);
      setEditMode(false);
      addNotification('Rapport mis à jour');
    } catch (err) {
      addNotification(err.message, 'error');
    }
  }, [selectedReportId, editTitle, editContent]);

  // handleDownloadPDF – exports the report content as a PDF using html2pdf.js
  const handleDownloadPDF = useCallback(async () => {
    const element = document.getElementById('rapport-content');
    if (!element) return;
    try {
      const clone = element.cloneNode(true);
      const style = document.createElement('style');
      style.textContent = `
        * { page-break-inside: avoid; }
        table { page-break-inside: avoid; }
        tr { page-break-inside: avoid; }
        h1, h2, h3, h4 { page-break-after: avoid; }
        img { page-break-inside: avoid; max-width: 100%; }
      `;
      clone.prepend(style);
      clone.style.width = '100%';
      clone.style.maxWidth = '750px';
      clone.style.margin = '0 auto';
      document.body.appendChild(clone);
      const opt = {
        margin: [15, 12, 15, 12],
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };
      const pdfBlob = await html2pdf().set(opt).from(clone).outputPdf('blob');
      document.body.removeChild(clone);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${savedName || 'rapport'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      addNotification('Erreur lors de la génération du PDF.', 'error');
    }
  }, [savedName]);

  // handleTitleChange – updates the report title and auto-saves if a report is selected
  const handleTitleChange = useCallback((newTitle) => {
    setSavedName(newTitle);
    if (selectedReportId && newTitle.trim()) {
      updateRapportIA(selectedReportId, { titre: newTitle.trim() }).catch(() => {});
    }
  }, [selectedReportId]);

  // handleViewReportPDF – loads a report from the list and downloads it as PDF directly
  const handleViewReportPDF = useCallback(async (report) => {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = DOMPurify.sanitize(report.contenu);
      const style = document.createElement('style');
      style.textContent = `
        * { page-break-inside: avoid; }
        table { page-break-inside: avoid; }
        tr { page-break-inside: avoid; }
        h1, h2, h3, h4 { page-break-after: avoid; }
        img { page-break-inside: avoid; max-width: 100%; }
      `;
      tempDiv.prepend(style);
      tempDiv.style.padding = '0';
      tempDiv.style.fontSize = '13px';
      tempDiv.style.lineHeight = '1.7';
      tempDiv.style.fontFamily = "'Inter', system-ui, sans-serif";
      tempDiv.style.color = '#1E293B';
      tempDiv.style.background = '#fff';
      tempDiv.style.width = '100%';
      tempDiv.style.maxWidth = '750px';
      tempDiv.style.margin = '0 auto';
      document.body.appendChild(tempDiv);
      const opt = {
        margin: [15, 12, 15, 12],
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };
      const pdfBlob = await html2pdf().set(opt).from(tempDiv).outputPdf('blob');
      document.body.removeChild(tempDiv);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.titre || 'rapport'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      addNotification('Erreur lors de la génération du PDF.', 'error');
    }
  }, []);

  /* ── Sites data: only needed for the map and dashboard views ── */
  useEffect(() => {
    if (currentView === 'cartographie' || currentView === 'dashboard') {
      getSites().then(setSites).catch(() => setSites([]));
    }
  }, [currentView]);

  // logout – clears all auth tokens and redirects to the login page
  const logout = () => {
    ['token', 'access_token', 'refresh_token'].forEach((k) => localStorage.removeItem(k));
    navigate('/login');
  };

  /* ══════════════════════════════════════════
     DERIVED DATA – computed from raw stats
     ══════════════════════════════════════════ */

  // evo – ticket evolution data with dates formatted for display
  const evo = (stats?.graphiques?.evolution_tickets ?? []).map((d) => {
    const dd = new Date(d.jour);
    return { ...d, _raw: d.jour, jour: isNaN(dd.getTime()) ? d.jour : dd.toLocaleDateString('fr', { day: '2-digit', month: 'short' }) };
  });

  // filteredReports – search-filtered list of saved reports
  const filteredReports = savedReports.filter((r) => {
    if (!rapportSearch.trim()) return true;
    const q = rapportSearch.toLowerCase();
    return (r.titre || '').toLowerCase().includes(q)
      || (r.prompt || '').toLowerCase().includes(q)
      || (r.cree_par?.nom_user || '').toLowerCase().includes(q);
  });

  // Performance data for engineers and call center agents
  const employes = (stats?.stats_employes ?? []).map((e) => {
    const m = (e.delai_moyen || '').match(/(\d+)h\s*(\d+)m/);
    return { ...e, label: `${e.nom} (${e.code})`, delai_h: m ? parseInt(m[1]) + parseInt(m[2]) / 60 : 0 };
  });
  const agentsCC = (stats?.stats_agents_cc ?? []).map((a) => ({ ...a, label: `${a.nom} (${a.code})` }));
  const perfUsers = perfRole === 'ingenieurs' ? employes : agentsCC;
  const selectedPerfUser = perfUsers.find((u) => u.code === perfUser) || null;

  /* ── Sub-views for loading / error states ── */

  const LoadingView = () => (
    <div style={S.app}>
      <aside style={S.side}><div style={S.brand}><img src={logoDjezzy} alt="" style={S.logo} /><div><div style={S.bn}>Djezzy Hub</div><div style={S.br}>Superviseur</div></div></div></aside>
      <div style={{ ...S.main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}><div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#E8401A', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.7s linear infinite' }} /><p style={{ marginTop: 16, color: 'var(--text-muted3)', fontSize: 13 }}>Chargement…</p></div>
      </div>
    </div>
  );

  const ErrorView = () => (
    <div style={S.app}>
      <aside style={S.side}><div style={S.brand}><img src={logoDjezzy} alt="" style={S.logo} /><div><div style={S.bn}>Djezzy Hub</div><div style={S.br}>Superviseur</div></div></div></aside>
      <div style={{ ...S.main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <h3 style={{ color: 'var(--text-primary)', fontSize: 16, margin: '0 0 8px' }}>Erreur</h3>
          <p style={{ color: 'var(--text-muted3)', fontSize: 13, margin: '0 0 20px' }}>{error}</p>
          <button onClick={fetchData} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, border: '1px solid var(--border-color)', borderRadius: 6, cursor: 'pointer', background: 'var(--bg-card)', color: 'var(--text-primary)', fontFamily: 'inherit' }}>Réessayer</button>
      </div>
    </div>
    </div>
  );

  if (loading) return <LoadingView />;
  if (error) return <ErrorView />;

  return (
    <div style={S.app}>
      {/* Detail modal – shown when the user clicks on a chart element */}
      {detail && <DetailModal type={detail.type} data={detail.data} stats={stats} reporting={reporting} onClose={() => setDetail(null)} />}

      {/* ── RAPPORT VIEW POPUP ── */}
      {viewRapport && (
        <div className="fade-in" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}
          onClick={() => setViewRapport(null)}>
          <div className="scale-in" style={{ background: C.cardBg, borderRadius: 10, width: 780, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(232,64,26,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconFile style={{ width: 16, height: 16, color: '#E8401A' }} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{viewRapport.titre}</h2>
                  <div style={{ fontSize: 10, color: 'var(--text-muted2)', marginTop: 2 }}>
                    {viewRapport.cree_par?.nom_user || '—'} · {new Date(viewRapport.created_at).toLocaleDateString('fr', { day: '2-digit', month: 'long', year: 'numeric' })}
                    {viewRapport.date_debut && viewRapport.date_fin ? ` · ${new Date(viewRapport.date_debut).toLocaleDateString('fr')} → ${new Date(viewRapport.date_fin).toLocaleDateString('fr')}` : ''}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                <button onClick={() => handleViewReportPDF(viewRapport)}
                  style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: '#059669', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, fontFamily: 'inherit' }}
                  title="Télécharger PDF">
                  <IconDownload style={{ width: 12, height: 12 }} /> PDF
                </button>
                <button onClick={() => setViewRapport(null)}
                  style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`, background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted3)' }}
                  title="Fermer">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            </div>
            <div style={{ padding: '20px 28px', overflowY: 'auto', flex: 1, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.8 }}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(viewRapport.contenu) }} />
          </div>
        </div>
      )}

      {/* ── Priority detail modal ── */}
      {prioModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }} onClick={() => setPrioModal(null)}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, width: '90vw', maxWidth: 900, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: prioModal.color, flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Réclamations par priorité</span>
              </div>
              <button onClick={() => setPrioModal(null)} style={{ background: 'var(--bg-hover)', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted3)', fontWeight: 700 }}>✕</button>
            </div>
            {/* Priority filter tabs */}
            <div style={{ padding: '8px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 4 }}>
              {[{ key: 'critique', label: 'Critique', color: '#DC2626' }, { key: 'haute', label: 'Haute', color: '#F59E0B' }, { key: 'normale', label: 'Normale', color: '#2563EB' }, { key: 'basse', label: 'Basse', color: '#10B981' }].map((p) => {
                const count = stats?.graphiques?.repartition_priorite_donut?.[p.key] ?? 0;
                return (
                  <button key={p.key} onClick={() => setPrioModal((prev) => ({ ...prev, priorite: p.key, label: p.label, color: p.color }))}
                    style={{ padding: '5px 14px', fontSize: 11, fontWeight: 600, border: `2px solid ${prioModal.priorite === p.key ? p.color : 'transparent'}`, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', background: prioModal.priorite === p.key ? `${p.color}15` : 'var(--bg-hover)', color: prioModal.priorite === p.key ? p.color : 'var(--text-muted3)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                    {p.label}
                    <span style={{ fontSize: 10, fontWeight: 700, background: prioModal.priorite === p.key ? p.color : 'var(--text-muted2)', color: '#fff', padding: '0 5px', borderRadius: 8, lineHeight: '16px' }}>{count}</span>
                  </button>
                );
              })}
            </div>
            {/* Body: donut left + list right */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* Left: donut chart */}
              <div style={{ width: 280, flexShrink: 0, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px', gap: 16 }}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={[
                      { name: 'Critique', value: stats?.graphiques?.repartition_priorite_donut?.critique ?? 0, color: '#DC2626' },
                      { name: 'Haute', value: stats?.graphiques?.repartition_priorite_donut?.haute ?? 0, color: '#F59E0B' },
                      { name: 'Normale', value: stats?.graphiques?.repartition_priorite_donut?.normale ?? 0, color: '#2563EB' },
                      { name: 'Basse', value: stats?.graphiques?.repartition_priorite_donut?.basse ?? 0, color: '#10B981' },
                    ].filter((d) => d.value > 0)} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                      {[{ color: '#DC2626' }, { color: '#F59E0B' }, { color: '#2563EB' }, { color: '#10B981' }].map((_, i) => <Cell key={i} fill={[stats?.graphiques?.repartition_priorite_donut?.critique, stats?.graphiques?.repartition_priorite_donut?.haute, stats?.graphiques?.repartition_priorite_donut?.normale, stats?.graphiques?.repartition_priorite_donut?.basse][i] > 0 ? ['#DC2626', '#F59E0B', '#2563EB', '#10B981'][i] : 'transparent'} />)}
                    </Pie>
                    <Tooltip content={() => null} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Priority legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                  {[{ name: 'Critique', color: '#DC2626', key: 'critique' }, { name: 'Haute', color: '#F59E0B', key: 'haute' }, { name: 'Normale', color: '#2563EB', key: 'normale' }, { name: 'Basse', color: '#10B981', key: 'basse' }].map((p) => {
                    const count = stats?.graphiques?.repartition_priorite_donut?.[p.key] ?? 0;
                    const total = (stats?.graphiques?.repartition_priorite_donut?.critique ?? 0) + (stats?.graphiques?.repartition_priorite_donut?.haute ?? 0) + (stats?.graphiques?.repartition_priorite_donut?.normale ?? 0) + (stats?.graphiques?.repartition_priorite_donut?.basse ?? 0);
                    return (
                      <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 6, background: prioModal.key === p.key ? `${p.color}15` : 'transparent' }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: 'var(--text-muted3)', flex: 1 }}>{p.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{count}</span>
                        <span style={{ fontSize: 9, color: 'var(--text-muted2)' }}>{total > 0 ? Math.round((count / total) * 100) : 0}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Right: reclamations list */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Status filter bar */}
                <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 4 }}>
                  {[
                    { key: 'all', label: 'Tous' },
                    { key: 'ouvert', label: 'Ouverts' },
                    { key: 'resolu', label: 'Résolus' },
                    { key: 'ferme', label: 'Fermés' },
                  ].map((f) => (
                    <button key={f.key} onClick={() => setPrioFilter(f.key)}
                      style={{ padding: '4px 12px', fontSize: 10, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', background: prioFilter === f.key ? prioModal.color : 'var(--bg-hover)', color: prioFilter === f.key ? '#fff' : 'var(--text-muted3)', transition: 'all 0.15s' }}>
                      {f.label}
                    </button>
                  ))}
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted2)', alignSelf: 'center' }}>
                    {prioFilter !== 'all' && prioTickets.filter((t) => prioFilter === 'all' || t.statut === prioFilter).length} résultat{prioFilter !== 'all' && prioTickets.filter((t) => prioFilter === 'all' || t.statut === prioFilter).length !== 1 ? 's' : ''}
                  </span>
                </div>
                {/* Ticket list */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
                  {prioLoading ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted2)', fontSize: 12 }}>Chargement...</div>
                  ) : (() => {
                    const filtered = prioTickets.filter((t) => prioFilter === 'all' || t.statut === prioFilter);
                    if (filtered.length === 0) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted2)', fontSize: 12 }}>Aucune réclamation</div>;
                    return filtered.map((t) => (
                      <div key={t.id} style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}`, borderRadius: 6, marginBottom: 4, transition: 'background 0.1s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{t.numero_ticket}</span>
                          <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, fontWeight: 600, color: '#fff', background: { critique: '#DC2626', haute: '#F59E0B', normale: '#2563EB', basse: '#10B981' }[t.priorite] || prioModal.color }}>{t.priorite}</span>
                          <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, fontWeight: 600, background: t.statut === 'ouvert' ? '#F59E0B18' : t.statut === 'resolu' ? '#10B98118' : '#6B728018', color: t.statut === 'ouvert' ? '#F59E0B' : t.statut === 'resolu' ? '#10B981' : '#6B7280' }}>
                            {t.statut}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted3)', marginBottom: 2 }}>{t.type_reclamation || '—'} — {t.site_display || 'Non assigné'}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted2)' }}>
                          {t.cree_par?.first_name} {t.cree_par?.last_name} • {t.created_at ? new Date(t.created_at).toLocaleDateString('fr') : '—'}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ SIDEBAR ═══════ */}
      <aside style={S.side}>
        <div style={S.brand}><img src={logoDjezzy} alt="" style={S.logo} /><div><div style={S.bn}>Djezzy Hub</div><div style={S.br}>Superviseur</div></div></div>

        {/* Main navigation menu */}
        <div style={S.menu}>
          <span style={S.sl}>MENU</span>
          <button className="side-btn" style={{ ...S.mi, ...(currentView === 'dashboard' ? S.mia : {}) }} onClick={(e) => { spawnParticles(e.clientX, e.clientY, 4); setCurrentView('dashboard'); }}><IconD style={{ marginRight: 10 }} /> Dashboard</button>
          <button className="side-btn" style={{ ...S.mi, ...(currentView === 'cartographie' ? S.mia : {}) }} onClick={(e) => { spawnParticles(e.clientX, e.clientY, 4); setCurrentView('cartographie'); }}><IconMap style={{ marginRight: 10 }} /> Cartographie</button>
          <button className="side-btn" style={{ ...S.mi, ...(currentView === 'rapport-ia' ? S.mia : {}) }} onClick={(e) => { spawnParticles(e.clientX, e.clientY, 4); setCurrentView('rapport-ia'); }}><IconFile style={{ marginRight: 10 }} /> Rapport IA</button>
          <button className="side-btn" style={{ ...S.mi, ...(currentView === 'performance' ? S.mia : {}) }} onClick={(e) => { spawnParticles(e.clientX, e.clientY, 4); setCurrentView('performance'); }}><IconU style={{ marginRight: 10 }} /> Performance</button>
          <button className="side-btn" style={{ ...S.mi, ...(currentView === 'archives' ? S.mia : {}) }} onClick={(e) => { spawnParticles(e.clientX, e.clientY, 4); setCurrentView('archives'); }}><IconArchive style={{ marginRight: 10 }} /> Archives</button>
        </div>
      </aside>

      {/* ═══════ MAIN CONTENT ═══════ */}
      <div style={S.main}>
        {/* Top header bar with title, period toggle, refresh, and date */}
        <header style={S.head}>
          <h1 style={S.title}>{currentView === 'cartographie' ? 'Cartographie' : currentView === 'rapport-ia' ? 'Rapport IA' : currentView === 'performance' ? 'Performance Équipe' : currentView === 'archives' ? 'Archives' : "Vue d'ensemble"}</h1>
          <div style={S.right}>
            {/* Period toggle buttons: 7 / 30 / 60 / 90 / All */}
            <div style={S.toggle}>
              {[{ l: '7j', v: 7 }, { l: '30j', v: 30 }, { l: '60j', v: 60 }, { l: '90j', v: 90 }, { l: 'Tout', v: 3650 }].map((p) => (
                <button key={p.v} onClick={() => setPeriod(p.v)} style={{ ...S.togBtn, ...(period === p.v ? S.togOn : {}) }}>{p.l}</button>
              ))}
            </div>
            <span style={S.date}>{now()}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8, paddingLeft: 12, borderLeft: '1px solid var(--border-color)' }}>
              <button onClick={() => navigate('/profile')} style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FEE2E2', border: 'none', cursor: 'pointer', color: '#E8401A' }} title="Profil"><IconU style={{ width: 15, height: 15 }} /></button>
              <button onClick={logout} style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FEE2E2', border: 'none', cursor: 'pointer', color: '#E8401A' }} title="Déconnexion"><IconL style={{ width: 15, height: 15 }} /></button>
            </div>
          </div>
        </header>

        {/* ═══════ CARTOGRAPHIE VIEW ═══════ */}
        {currentView === 'cartographie' ? (
          <div style={{ flex: 1, padding: '16px 24px' }}>
            <div style={{ ...S.chart, height: '100%', minHeight: 500 }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconMap style={{ width: 16, height: 16 }} />
                <span style={S.cht}>Cartographie des sites 5G</span>
              </div>
              <div style={{ flex: 1, height: 'calc(100vh - 160px)' }}>
                <MapComponent sites={sites} showCoverage />
              </div>
            </div>
          </div>

        /* ═══════ RAPPORT IA VIEW ═══════ */
        ) : currentView === 'rapport-ia' ? (
          <div ref={resultRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
            {/* Sub-navigation: Create a new report vs. view saved reports */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg-toolbar)', borderRadius: 8, padding: 3, width: 'fit-content' }}>
              <button onClick={() => setRapportView('create')}
                style={{ padding: '6px 16px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', background: rapportView === 'create' ? 'var(--bg-card)' : 'transparent', color: rapportView === 'create' ? 'var(--text-primary)' : 'var(--text-muted3)', boxShadow: rapportView === 'create' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                <IconFile style={{ width: 12, height: 12, marginRight: 6, verticalAlign: 'middle' }} />
                Création de rapport
              </button>
              <button onClick={() => { setRapportView('list'); getRapportsIA().then(setSavedReports).catch(() => {}); }}
                style={{ padding: '6px 16px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', background: rapportView === 'list' ? 'var(--bg-card)' : 'transparent', color: rapportView === 'list' ? 'var(--text-primary)' : 'var(--text-muted3)', boxShadow: rapportView === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                Liste de rapports ({savedReports.length})
              </button>
            </div>

            {/* ── LIST VIEW: table of all saved reports ── */}
            {rapportView === 'list' ? (
              <div style={S.chartBordered}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IconFile style={{ width: 14, height: 14, color: '#7C3AED' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>Rapports sauvegardés</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted2)' }}>({savedReports.length})</span>
                  </div>
                  {/* Search bar */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input type="text" placeholder="Rechercher un rapport..." value={rapportSearch} onChange={(e) => setRapportSearch(e.target.value)}
                      style={{ padding: '5px 10px 5px 28px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border-color)', fontFamily: 'inherit', outline: 'none', color: 'var(--text-primary)', background: 'var(--bg-input)', width: 220 }} />
                    <svg style={{ position: 'absolute', left: 8, pointerEvents: 'none', color: 'var(--text-muted2)' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    {rapportSearch && (
                      <button onClick={() => setRapportSearch('')}
                        style={{ position: 'absolute', right: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted2)', display: 'flex' }}>
                        <IconX style={{ width: 10, height: 10 }} />
                      </button>
                    )}
                  </div>
                </div>
                {savedReports.length === 0 ? (
                  <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted2)', fontSize: 12 }}>
                    <svg style={{ margin: '0 auto 12px', opacity: 0.3 }} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    <div style={{ marginBottom: 8, fontWeight: 600 }}>Aucun rapport sauvegardé</div>
                    <button onClick={() => setRapportView('create')} style={{ background: '#E8401A', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 11, padding: '6px 16px', borderRadius: 6 }}>Créer le premier rapport</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 4px' }}>
                    {filteredReports.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted2)', fontSize: 12 }}>Aucun résultat pour "{rapportSearch}"</div>
                    ) : filteredReports.map((r) => (
                      <div key={r.id} onClick={() => setViewRapport(r)}
                        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#E8401A44'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(232,64,26,0.06)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#E8401A22,#E8401A0A)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <IconFile style={{ width: 16, height: 16, color: '#E8401A' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.titre}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.prompt}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 90 }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted3)', fontWeight: 500 }}>
                            {r.cree_par?.nom_user || '—'}
                          </div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted2)', marginTop: 2 }}>
                            {new Date(r.created_at).toLocaleDateString('fr', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleViewReportPDF(r); }}
                            style={{ background: '#05966918', border: '1px solid #05966933', borderRadius: 4, cursor: 'pointer', padding: '4px 8px', color: '#059669', fontSize: 10, fontWeight: 600, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }} title="Télécharger PDF">
                            <IconDownload style={{ width: 12, height: 12 }} />
                          </button>
                          <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDeleteReport(r.id); }}
                            style={{ background: '#DC262618', border: '1px solid #DC262633', borderRadius: 4, cursor: 'pointer', padding: '4px 8px', color: '#DC2626', fontSize: 10, fontWeight: 600, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }} title="Supprimer">
                            <IconTrash style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            /* ── CREATE VIEW: prompt input + generated report + sidebar list ── */
            ) : (
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Report generation form */}
                  <div style={S.chartBordered}>
                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#E8401A', textTransform: 'uppercase', letterSpacing: 0.3 }}>Nouveau rapport</span>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        {/* Date range inputs */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 140 }}>
                          <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted3)' }}>Du</label>
                          <input type="date" value={dateDebut} onChange={(e) => { setDateDebut(e.target.value); setDatesFromPrompt(false); }} style={S.inp} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 140 }}>
                          <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted3)' }}>Au</label>
                          <input type="date" value={dateFin} onChange={(e) => { setDateFin(e.target.value); setDatesFromPrompt(false); }} style={S.inp} />
                        </div>
                        {datesFromPrompt && (
                          <span style={{ fontSize: 10, color: '#2563EB', fontWeight: 600, whiteSpace: 'nowrap', paddingBottom: 2 }}>
                            Extracted from prompt
                          </span>
                        )}
                      </div>
                        {/* Pre-made prompt buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted3)' }}>Choisir un type de rapport :</span>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {/* Vue Globale - Button special */}
                          <button onClick={() => setPrompt('Vue globale : fais un bilan strategique complet du reseau avec diagnostic, alertes, zones critiques et plan d\'action prioritaire')}
                            style={{ fontSize: 11, padding: '6px 14px', borderRadius: 14, border: prompt.includes('Vue globale') ? '2px solid #7C3AED' : '2px solid #7C3AED', background: prompt.includes('Vue globale') ? 'rgba(124,58,237,0.15)' : 'transparent', color: prompt.includes('Vue globale') ? '#7C3AED' : '#7C3AED', cursor: 'pointer', fontWeight: 700, transition: 'all 0.15s', fontFamily: 'inherit', letterSpacing: '0.3px' }}>
                            Vue Globale
                          </button>
                          {[
                            { label: 'Synthese 90j avec KPI', prompt: 'Analyse les KPI principaux des 90 derniers jours. Quels sont les chiffres cles? Y a-t-il des tendances preoccupantes? Quel est le verdict global?' },
                            { label: 'Sites les plus impactes', prompt: 'Quels sites BTS sont le plus impactes et pourquoi? Analyse les causes probables (pannes, charge, localisation) et propose des actions correctives specifiques.' },
                            { label: 'Analyse par commune', prompt: 'Comment les reclamations se repartissent-elles par commune? Identifie les zones a risque et explique les facteurs geographiques qui influencent les problemes.' },
                            { label: 'Tendances et recommandations', prompt: 'Quelles tendances observes-tu dans les reclamations? Les problemes s\'aggravent-ils ou s\'ameliorant-ils? Propose des actions concrètes basees sur les donnees.' },
                            { label: 'Evolution mensuelle', prompt: 'Compare le mois en cours au mois precedent. Quels changements significatifs observes-tu? Quelles sont les causes probables de ces variations?' },
                            { label: 'Bilan par wilaya', prompt: 'Quelles wilayas concentrent le plus de reclamations? Pourquoi ces zones sont-elles plus affectees? Quelles actions prioritaires pour chaque zone critique?' },
                            { label: 'Performance des agents', prompt: 'Analyse la performance des agents de call center. Qui performe bien? Qui a besoin d\'accompagnement? Le delai de resolution est-il acceptable?' },
                            { label: 'Analyse des priorites', prompt: 'Comment les tickets se repartissent-ils par priorite? Les tickets critiques sont-ils traits assez vite? Y a-t-il des tickets bloques?' },
                            { label: 'Top 10 des problemes', prompt: 'Quels sont les 10 types de problemes les plus frequents? Quelles sont les causes racines et quelles solutions proposes-tu pour chacun?' },
                            { label: 'Comparaison mensuelle', prompt: 'Compare detaillement le mois en cours au mois precedent. Quels ecarts significatifs? Quelles sont les explications et quelles actions en decoulent?' },
                            { label: 'Taux de resolution', prompt: 'Analyse en profondeur le taux de resolution. Le delai moyen est-il acceptable? Y a-t-il des goulets d\'echangage? Quels sont les points d\'amelioration?' },
                            { label: 'Sites UP/DOWN', prompt: 'Quel est l\'etat reel du reseau? Les sites DOWN sont-ils localises geographiquement? Y a-t-il un pattern (technologie, zone, heure)?' },
                          ].map((s) => (
                            <button key={s.label} onClick={() => setPrompt(s.prompt)}
                              style={{ fontSize: 11, padding: '6px 14px', borderRadius: 14, border: prompt === s.prompt ? '2px solid #E8401A' : '1px solid var(--border-color)', background: prompt === s.prompt ? 'rgba(232,64,26,0.1)' : 'var(--bg-hover)', color: prompt === s.prompt ? '#E8401A' : 'var(--text-muted3)', cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s', fontFamily: 'inherit' }}>
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button onClick={handleGenerate} disabled={generating || !prompt.trim()}
                        style={{ ...S.btn, opacity: generating || !prompt.trim() ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                        {generating ? (
                          <><span style={S.spinSm} /> Génération en cours...</>
                        ) : (
                          <><IconSend style={{ width: 14, height: 14 }} /> Générer le rapport</>
                        )}
                      </button>
                    </div>
                  </div>

                    {/* Generated report display – only visible after generation */}
                  {generatedContent && (
                    <div style={S.chartBordered}>
                      {/* Toolbar: back button, editable title, action buttons */}
                      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => { if (generatedContent && !window.confirm('Retourner sans sauvegarder ? Le contenu généré sera supprimé.')) return; setGeneratedContent(null); setSelectedReportId(null); setSavedName(''); }}
                          style={{ background: 'var(--bg-toolbar)', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 10, fontWeight: 600, fontFamily: 'inherit', color: 'var(--text-muted3)', display: 'flex', alignItems: 'center', gap: 4 }}
                          title="Retour">← Retour</button>
                        <IconFile style={{ width: 13, height: 13, color: '#E8401A', flexShrink: 0 }} />
                        {/* Editable title – saves on blur */}
                        <input value={savedName} onChange={(e) => setSavedName(e.target.value)}
                          onBlur={(e) => handleTitleChange(e.target.value)}
                          style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', outline: 'none', flex: 1, minWidth: 60, color: 'var(--text-primary)' }}
                          placeholder="Titre du rapport..." />
                        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                          <button onClick={handleDownloadPDF} disabled={!generatedContent}
                            style={{ ...S.btnSm, background: '#059669', color: '#fff' }} title="Télécharger PDF">
                            <IconDownload style={{ width: 12, height: 12 }} /> PDF
                          </button>
                          {/* Show save or edit buttons depending on editMode */}
                          {editMode ? (
                            <>
                              <button onClick={handleUpdateReport} style={{ ...S.btnSm, background: '#2563EB', color: '#fff' }} title="Enregistrer">
                                <IconSave style={{ width: 12, height: 12 }} /> Sauver
                              </button>
                              <button onClick={() => setEditMode(false)} style={{ ...S.btnSm, background: 'var(--text-muted3)', color: '#fff' }} title="Annuler"><IconX style={{ width: 12, height: 12 }} /></button>
                            </>
                          ) : (
                            <>
                              {/* Accepter = save the generated report */}
                              <button onClick={handleSave} disabled={saving || !generatedContent}
                                style={{ ...S.btnSm, background: saving ? 'var(--text-muted2)' : '#7C3AED', color: '#fff' }}>
                                {saving ? '...' : <><IconSave style={{ width: 12, height: 12 }} /> Accepter</>}
                              </button>
                              {/* Rejeter = discard without saving */}
                              <button onClick={() => { if (window.confirm('Rejeter ce rapport ? Le contenu généré sera supprimé.')) { setGeneratedContent(null); setSelectedReportId(null); setSavedName(''); } }}
                                style={{ ...S.btnSm, background: '#DC2626', color: '#fff' }}>
                                <IconX style={{ width: 12, height: 12 }} /> Rejeter
                              </button>
                              {selectedReportId && (
                                <button onClick={() => { setEditMode(true); setEditTitle(savedName); setEditContent(generatedContent); }}
                                  style={S.btnSm} title="Modifier"><IconEdit style={{ width: 12, height: 12 }} /></button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      {/* Report HTML content – sanitized to prevent XSS */}
                      <div id="rapport-content" style={{ padding: '20px', overflowX: 'auto', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, background: 'var(--bg-card)' }}
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(generatedContent) }} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        /* ═══════ PERFORMANCE VIEW ═══════ */
        ) : currentView === 'performance' ? (
        <div style={S.scroll}>
          <div style={{ padding: '16px 21px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted3)', letterSpacing: 0.5, textTransform: 'uppercase' }}>PERFORMANCES ÉQUIPE</span>
              <div style={{ display: 'flex', gap: 4, background: 'var(--bg-toolbar)', borderRadius: 6, padding: 2, marginLeft: 8 }}>
                <button onClick={() => { setPerfRole('ingenieurs'); setPerfUser(null); }}
                  style={{ padding: '4px 12px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', background: perfRole === 'ingenieurs' ? 'var(--bg-card)' : 'transparent', color: perfRole === 'ingenieurs' ? 'var(--text-primary)' : 'var(--text-muted3)', boxShadow: perfRole === 'ingenieurs' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>Ingénieurs</button>
                <button onClick={() => { setPerfRole('agents_cc'); setPerfUser(null); }}
                  style={{ padding: '4px 12px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', background: perfRole === 'agents_cc' ? 'var(--bg-card)' : 'transparent', color: perfRole === 'agents_cc' ? 'var(--text-primary)' : 'var(--text-muted3)', boxShadow: perfRole === 'agents_cc' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>Call Center</button>
              </div>
              <select value={perfUser || ''} onChange={(e) => setPerfUser(e.target.value || null)}
                style={{ marginLeft: 'auto', padding: '5px 12px', fontSize: 11, borderRadius: 4, border: '1px solid var(--border-color)', fontFamily: 'inherit', maxWidth: 240, cursor: 'pointer', backgroundColor: 'var(--bg-input)' }}>
                <option value="">Choisir un utilisateur...</option>
                {perfUsers.map((u) => <option key={u.code} value={u.code}>{u.nom} ({u.code})</option>)}
              </select>
            </div>

            {!selectedPerfUser ? (
              <div className="fade-in chart-card" style={{ ...S.chart, padding: 50, textAlign: 'center', color: 'var(--text-muted2)', fontSize: 13 }}>
                Sélectionnez un utilisateur pour voir ses statistiques de performance
              </div>
            ) : (
              <div className="fade-in">
                {/* KPI cards for selected user */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                  {perfRole === 'ingenieurs' ? (
                    <>
                      <div style={{ flex: 1, minWidth: 120, padding: '14px 18px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border-color)', textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedPerfUser.total_assignes}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted2)', marginTop: 2 }}>Assignés</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 120, padding: '14px 18px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border-color)', textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#10B981' }}>{selectedPerfUser.resolus}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted2)', marginTop: 2 }}>Résolus</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 120, padding: '14px 18px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border-color)', textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: selectedPerfUser.taux_resolution >= 80 ? '#10B981' : selectedPerfUser.taux_resolution >= 50 ? '#F59E0B' : '#EF4444' }}>{selectedPerfUser.taux_resolution}%</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted2)', marginTop: 2 }}>Taux résolution</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 120, padding: '14px 18px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border-color)', textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedPerfUser.delai_h ? `${selectedPerfUser.delai_h.toFixed(1)}h` : selectedPerfUser.delai_moyen}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted2)', marginTop: 2 }}>Délai moyen</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ flex: 1, minWidth: 120, padding: '14px 18px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border-color)', textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#E8401A' }}>{selectedPerfUser.tickets_crees}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted2)', marginTop: 2 }}>Créés</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 120, padding: '14px 18px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border-color)', textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#F59E0B' }}>{selectedPerfUser.ouverts}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted2)', marginTop: 2 }}>Ouverts</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 120, padding: '14px 18px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border-color)', textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#10B981' }}>{selectedPerfUser.resolus}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted2)', marginTop: 2 }}>Résolus</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 120, padding: '14px 18px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border-color)', textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-muted3)' }}>{selectedPerfUser.fermes}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted2)', marginTop: 2 }}>Fermés</div>
                      </div>
                    </>
                  )}
                </div>
                {/* Performance bar chart for selected user */}
                <div className="chart-card" style={{ ...S.chart, marginBottom: 24 }}>
                  <div style={S.ch}><span style={S.cht}>Performances — {selectedPerfUser.nom}</span></div>
                  <div style={{ width: '100%', height: 260, padding: '6px 6px 4px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      {perfRole === 'ingenieurs' ? (
                        <BarChart data={[selectedPerfUser]} margin={{ top: 5, right: 10, left: -5, bottom: 5 }} barSize={50}>
                          <CartesianGrid stroke="#f5f5f5" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e8e8e8' }} />
                          <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} width={25} />
                          <Tooltip content={<Tip />} />
                          <Bar dataKey="total_assignes" radius={[4, 4, 0, 0]} fill="#2563EB" name="Assignés" />
                          <Bar dataKey="resolus" radius={[4, 4, 0, 0]} fill="#10B981" name="Résolus" />
                        </BarChart>
                      ) : (
                        <BarChart data={[selectedPerfUser]} margin={{ top: 5, right: 10, left: -5, bottom: 5 }} barSize={50}>
                          <CartesianGrid stroke="#f5f5f5" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e8e8e8' }} />
                          <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} width={25} />
                          <Tooltip content={<Tip />} />
                          <Bar dataKey="tickets_crees" radius={[4, 4, 0, 0]} fill="#E8401A" name="Créés" />
                          <Bar dataKey="ouverts" radius={[4, 4, 0, 0]} fill="#F59E0B" name="Ouverts" />
                          <Bar dataKey="resolus" radius={[4, 4, 0, 0]} fill="#10B981" name="Résolus" />
                          <Bar dataKey="fermes" radius={[4, 4, 0, 0]} fill="var(--text-muted3)" name="Fermés" />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        /* ═══════ ARCHIVES VIEW ═══════ */
        ) : currentView === 'archives' ? (
        <div style={S.scroll}>
            <div style={{ padding: '16px 21px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#64748B22,#64748B0A)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconArchive style={{ width: 18, height: 18, color: '#64748B' }} />
                </span>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Archives Rapports</h2>
                  <span style={{ fontSize: 10, color: 'var(--text-muted2)' }}>Rapports archivés — retention 3 mois</span>
                </div>
              </div>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>
                {archivedLoading ? (
                  <div style={{ padding: 50, textAlign: 'center', color: 'var(--text-muted2)', fontSize: 12 }}>Chargement...</div>
                ) : archivedRapports.length === 0 ? (
                  <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted2)', fontSize: 12 }}>
                    <IconArchive style={{ width: 32, height: 32, color: 'var(--text-muted2)', opacity: 0.3, margin: '0 auto 12px' }} />
                    <div style={{ fontWeight: 600 }}>Aucun rapport archivé</div>
                  </div>
                ) : (
                  <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {archivedRapports.map((r) => (
                      <div key={r.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', transition: 'all 0.15s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#64748B44'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#64748B22,#64748B0A)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <IconFile style={{ width: 16, height: 16, color: '#64748B' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.titre}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted2)', marginTop: 2 }}>
                            {r.cree_par?.nom_user || '—'}
                            {r.archived_at ? ` · Archivé le ${new Date(r.archived_at).toLocaleDateString('fr', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                          </div>
                        </div>
                        <button onClick={async () => { try { await restoreRapportIA(r.id); fetchArchivedRapports(); addNotification('Rapport restauré'); } catch { addNotification('Erreur lors de la restauration.', 'error'); } }}
                          style={{ background: '#05966918', border: '1px solid #05966933', borderRadius: 4, cursor: 'pointer', padding: '4px 10px', color: '#059669', fontSize: 10, fontWeight: 600, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          Restaurer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        /* ═══════ DEFAULT DASHBOARD VIEW ═══════ */
        ) : (
        <div style={S.scroll}>

          {/* ─── KPI ROW: core stats at a glance ─── */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Sites UP', value: stats?.reseau_global?.sites_up ?? '—', color: '#15803D' },
              { label: 'Sites DOWN', value: stats?.reseau_global?.sites_down ?? '—', color: '#DC2626' },
              { label: 'Disponibilité', value: stats?.reseau_global?.disponibilite_globale ?? '—', color: '#2563EB' },
            ].map((kpi, i) => (
              <div key={i} className="fade-in" style={{ animationDelay: `${i * 0.04}s`, flex: '1 1 0', minWidth: 140, background: 'var(--bg-card)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 4, borderLeft: `4px solid ${kpi.color}` }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted3)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.3 }}>{kpi.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* ─── ROW 1: Ticket evolution (full-width line chart) ─── */}
          <div style={S.chartsRow}>
            <div className="fade-in chart-card" style={{ animationDelay: '0s', ...S.chart, width: '100%' }}>
              <div style={S.ch}>
                <span style={S.cht}>Évolution des tickets</span>
                <span style={S.chs}>cliquez sur un point</span>
                <InfoPopup text="Nombre total de tickets créés par jour sur la période. Cliquez pour voir le détail." />
              </div>
              <div style={S.cb}>
                {evo.length === 0 ? <div style={S.empty}>Aucune donnée</div>
                : <div style={{ overflowX: 'auto', height: '100%' }}>
                    <LineChart data={evo} width={Math.max(evo.length * 35, 400)} height={280}
                      margin={{ top: 8, right: 20, left: 0, bottom: 8 }}
                      onClick={(e) => e?.activePayload && setDetail({ type: 'evolution', data: e.activePayload[0].payload })}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                      <XAxis dataKey="jour" tick={{ fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#e8e8e8' }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} width={25} />
                      <Tooltip content={<Tip />} />
                      <Line type="monotone" dataKey="total" stroke="#E8401A" strokeWidth={2.5} dot={{ r: 2, fill: '#E8401A' }} activeDot={{ r: 6 }} name="Tickets" />
                    </LineChart>
                  </div>}
              </div>
            </div>
          </div>

          {/* ─── ROW 2: Priority donut + sites impactés ─── */}
          <div style={S.chartsRow}>
            <div className="fade-in chart-card" style={{ animationDelay: '0.08s', ...S.chart, flex: 1 }}>
              <div style={S.ch}>
                <span style={S.cht}>Répartition par priorité</span>
                <InfoPopup text="Distribution des tickets par niveau de priorité." />
              </div>
              <div style={{ ...S.cb, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                {(() => {
                  const prio = stats?.graphiques?.repartition_priorite_donut;
                  const hasData = prio && (prio.critique + prio.haute + prio.normale + prio.basse) > 0;
                  if (!hasData) return <div style={S.empty}>Aucune donnée</div>;
                  const pieData = [
                    { name: 'Critique', value: prio.critique, color: '#DC2626', key: 'critique' },
                    { name: 'Haute', value: prio.haute, color: '#F59E0B', key: 'haute' },
                    { name: 'Normale', value: prio.normale, color: '#2563EB', key: 'normale' },
                    { name: 'Basse', value: prio.basse, color: '#10B981', key: 'basse' },
                  ].filter((d) => d.value > 0);
                  const total = pieData.reduce((s, d) => s + d.value, 0);
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, width: '100%', height: '100%' }}>
                      <ResponsiveContainer width="60%" height={220}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" nameKey="name" stroke="none" style={{ cursor: 'pointer' }}
                            onClick={(data, idx) => setPrioModal({ priorite: data.key, label: data.name, color: data.color })}>
                            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '8px 14px', fontSize: 12 }}>
                              <p style={{ margin: 0, fontWeight: 700, color: d.color }}>{d.name}</p>
                              <p style={{ margin: '2px 0', color: 'var(--text-muted3)' }}>{d.value} tickets ({total > 0 ? Math.round((d.value / total) * 100) : 0}%)</p>
                            </div>;
                          }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                        {pieData.map((d) => (
                          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: 'var(--text-muted3)' }}>{d.name}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginLeft: 'auto' }}>{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="fade-in chart-card" style={{ animationDelay: '0.12s', ...S.chart, flex: 1 }}>
              <div style={S.ch}>
                <span style={S.cht}>Top sites impactés</span>
                <InfoPopup text="Sites avec le plus de tickets sur la période." />
              </div>
              <div style={S.cb}>
                {(stats?.graphiques?.top_sites_impactes ?? []).length === 0 ? <div style={S.empty}>Aucune donnée</div>
                : <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(stats?.graphiques?.top_sites_impactes ?? []).slice(0, 8)} margin={{ top: 5, right: 10, left: -5, bottom: 5 }} layout="vertical" barSize={14}>
                      <CartesianGrid stroke="#f5f5f5" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis dataKey="nom" type="category" tick={{ fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#e8e8e8' }} width={120} />
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '8px 14px', fontSize: 12 }}>
                          <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>{d.nom}</p>
                          <p style={{ margin: '2px 0', color: 'var(--text-muted3)', fontSize: 10 }}>Code: {d.codeSite}</p>
                          <p style={{ margin: '2px 0', color: '#E8401A' }}>{d.num_reclamations} tickets</p>
                        </div>;
                      }} />
                      <Bar dataKey="num_reclamations" radius={[0, 4, 4, 0]} fill="#E8401A" name="Tickets" />
                    </BarChart>
                  </ResponsiveContainer>}
              </div>
            </div>
          </div>

          {/* ─── ROW 3: Disponibilité par commune (full width, all communes) ─── */}
          <div style={S.chartsRow}>
            <div className="fade-in chart-card" style={{ animationDelay: '0.16s', ...S.chart, width: '100%' }}>
              <div style={S.ch}>
                <span style={S.cht}>Disponibilité par commune</span>
                <InfoPopup text="Taux de disponibilité moyen des sites par commune (pires en premier). Toutes les communes." />
              </div>
              <div style={{ ...S.cb, overflowX: 'auto', minHeight: 320 }}>
                {(reporting?.tableau_communes ?? []).length === 0 ? <div style={S.empty}>Aucune donnée</div>
                : <div style={{ minWidth: Math.max(800, (reporting?.tableau_communes ?? []).length * 30), height: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reporting?.tableau_communes ?? []} margin={{ top: 5, right: 10, left: -5, bottom: 20 }} barSize={16}>
                        <CartesianGrid stroke="#f5f5f5" vertical={false} />
                        <XAxis dataKey="commune" tick={{ fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#e8e8e8' }} interval={0} />
                        <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} domain={[0, 100]} width={30} />
                        <Tooltip content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          const v = d.taux_dispo_num;
                          return <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '8px 14px', fontSize: 12 }}>
                            <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>{d.commune}</p>
                            <p style={{ margin: '2px 0', color: 'var(--text-muted3)' }}>Disponibilité: <span style={{ color: v >= 95 ? '#15803D' : v >= 80 ? '#F59E0B' : '#DC2626', fontWeight: 700 }}>{d.taux_disponibilite}</span></p>
                            <p style={{ margin: '2px 0', color: 'var(--text-muted3)' }}>Sites: {d.total_sites} • Down: {d.sites_down}</p>
                          </div>;
                        }} />
                        <Bar dataKey="taux_dispo_num" radius={[4, 4, 0, 0]} name="Disponibilité %">
                          {(reporting?.tableau_communes ?? []).map((entry, idx) => (
                            <Cell key={idx} fill={entry.taux_dispo_num >= 95 ? '#15803D' : entry.taux_dispo_num >= 80 ? '#F59E0B' : '#DC2626'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>}
              </div>
            </div>
          </div>

          <div style={{ height: 30 }} />
        </div>
      )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   INLINE STYLES – all style definitions in one place
   ═══════════════════════════════════════════════════ */
const S = {
  app: { display: 'flex', height: '100vh', fontFamily: "'Inter', system-ui, sans-serif", width: '100%' },
  side: { width: 193, background: C.sidebarBg, color: 'var(--text-sidebar)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' },
  brand: { height: 82, display: 'flex', alignItems: 'center', gap: 13, padding: '0 17px', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  logo: { width: 34, height: 'auto', objectFit: 'contain' },
  bn: { color: '#fff', fontWeight: 700, fontSize: 16 },
  br: { marginTop: 6, fontSize: 10, color: 'var(--text-sidebar)' },
  menu: { display: 'flex', flexDirection: 'column', gap: 5, padding: '26px 12px 0' },
  sl: { margin: '0 5px 10px', fontSize: 6, fontWeight: 700, color: 'var(--text-muted3)', letterSpacing: 1 },
  mi: { display: 'flex', alignItems: 'center', background: 'transparent', border: 'none', color: 'var(--text-sidebar)', padding: '0 10px', borderRadius: 6, cursor: 'pointer', textAlign: 'left', fontSize: 13, width: '100%', height: 34, textDecoration: 'none', outline: 'none' },
  mia: { background: 'linear-gradient(90deg, #9a0c2d, #710820)', color: '#fff', fontWeight: 600 },
  main: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: C.mainBg },
  head: { height: 50, display: 'flex', alignItems: 'center', padding: '0 24px', borderBottom: `1px solid ${C.border}`, background: C.cardBg, flexShrink: 0 },
  title: { margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' },
  right: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 },
  toggle: { display: 'flex', gap: 2, background: 'var(--bg-toolbar)', borderRadius: 6, padding: 2 },
  togBtn: { padding: '4px 10px', fontSize: 10, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', color: 'var(--text-muted3)', background: 'transparent', fontFamily: 'inherit' },
  togOn: { background: 'var(--bg-card)', color: 'var(--text-secondary)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  date: { fontSize: 10, color: 'var(--text-muted2)', fontWeight: 500, padding: '4px 10px', background: 'var(--bg-toolbar)', borderRadius: 4 },
  scroll: { flex: 1, overflowY: 'auto', padding: '8px 24px 0' },
  spin: { width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#E8401A', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' },
  sb: { marginBottom: 8, marginTop: 2 },
  st: { fontSize: 10, fontWeight: 700, color: 'var(--text-muted3)', letterSpacing: 0.5 },
  chartsRow: { display: 'flex', gap: 16, marginBottom: 24, minHeight: 200 },
  chart: { background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  ch: { padding: '10px 16px 4px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'baseline', gap: 8 },
  cht: { fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 0.3 },
  chs: { fontSize: 9, color: C.textMuted },
  cb: { flex: 1, padding: '6px 6px 4px', minHeight: 260, cursor: 'pointer' },
  empty: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted2)', fontSize: 11 },
  statCard: { background: 'var(--bg-hover)', borderRadius: 8, padding: '10px 16px', minWidth: 100, textAlign: 'center', border: `1px solid ${C.border}`, flex: 1 },
  statVal: { fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 },
  statLbl: { fontSize: 9, color: 'var(--text-muted2)', marginTop: 2 },
  inp: { padding: '8px 10px', fontSize: 12, borderRadius: 6, border: `1px solid ${C.border}`, fontFamily: 'inherit', outline: 'none', color: 'var(--text-primary)', background: 'var(--bg-card)', transition: 'border-color 0.15s' },
  btn: { padding: '10px 20px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', background: '#E8401A', color: '#fff', transition: 'all 0.15s' },
  btnSm: { padding: '4px 10px', fontSize: 10, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', background: 'var(--bg-toolbar)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s' },
  btnSmGlow: { padding: '5px 12px', fontSize: 10, fontWeight: 600, border: 'none', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.15)', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' },
  chartBordered: { background: 'var(--bg-card)', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  spinSm: { width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' },
};
