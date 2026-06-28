import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  Tooltip,
} from 'recharts';
import DOMPurify from 'dompurify';
import html2pdf from 'html2pdf.js';
import {
  getDashboardStats, getDashboardReporting,
  genererRapportIA, getRapportsIA, sauvegarderRapportIA,
  updateRapportIA, deleteRapportIA,
} from '../api/dashboard';
import { getSites } from '../api/tickets';
import DetailModal from '../components/DetailModal';
import MapComponent from '../components/Map';
import logoDjezzy from '../assets/Djezzy_Logo.png';

const C = {
  sidebarBg: 'var(--bg-sidebar)', mainBg: 'var(--bg-main)', cardBg: 'var(--bg-card)',
  textDark: 'var(--text-primary)', textMuted: 'var(--text-muted)', border: 'var(--border-color)',
};
const PALETTE = ['#E8401A', '#2563EB', '#10B981', '#F59E0B', '#8B5CF6'];

const iconProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IconD = (p) => <svg {...iconProps} {...p}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>;
const IconU = (p) => <svg {...iconProps} {...p}><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>;
const IconL = (p) => <svg {...iconProps} {...p}><path d="M15 16l4-4-4-4" /><path d="M19 12H8" /><path d="M12 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" /></svg>;
const IconI = (p) => <svg {...iconProps} {...p}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>;
const IconRefresh = (p) => <svg {...iconProps} {...p}><path d="M3 12a9 9 0 0 1 15.5-6.3M21 12a9 9 0 0 1-15.5 6.3" /><path d="M3 4v5h5M21 20v-5h-5" /></svg>;
const IconMap = (p) => <svg {...iconProps} {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>;
const IconFile = (p) => <svg {...iconProps} {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>;
const IconTrash = (p) => <svg {...iconProps} {...p}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;
const IconEdit = (p) => <svg {...iconProps} {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const IconSend = (p) => <svg {...iconProps} {...p}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>;
const IconDownload = (p) => <svg {...iconProps} {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
const IconSave = (p) => <svg {...iconProps} {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>;
const IconCalendar = (p) => <svg {...iconProps} {...p}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
const IconX = (p) => <svg {...iconProps} {...p}><path d="M18 6L6 18M6 6l12 12" /></svg>;
const LABEL_MAP = { critique: 'Critique', haute: 'Haute', normale: 'Normale', basse: 'Basse' };

const dispoColor = (v) => {
  if (v >= 100) return '#059669';
  if (v >= 75) return '#65A30D';
  if (v >= 50) return '#F59E0B';
  if (v >= 25) return '#EA580C';
  if (v > 0) return '#DC2626';
  return '#DC2626';
};

const Tip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '8px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{label}</p>
      {payload.map((e, i) => (
        <p key={i} style={{ margin: '2px 0', color: e.color || '#555' }}>
          {e.name}: {typeof e.value === 'number' ? e.value.toLocaleString() : e.value}
        </p>
      ))}
    </div>
  );
};

const TipValue = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '6px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}>
      <strong>{payload[0].value}</strong> r&eacute;clamation(s)
    </div>
  );
};

const now = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
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
  const [currentView, setCurrentView] = useState('dashboard');
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [reporting, setReporting] = useState(null);
  const [detail, setDetail] = useState(null);
  const [perfRole, setPerfRole] = useState('ingenieurs');
  const [perfUser, setPerfUser] = useState(null);
  const [sites, setSites] = useState([]);

  // Rapport IA state
  const [prompt, setPrompt] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [generatedContent, setGeneratedContent] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [savedReports, setSavedReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedName, setSavedName] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [rapportView, setRapportView] = useState('create');
  const resultRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([getDashboardStats(period), getDashboardReporting(period)]);
      setStats(a); setReporting(b);
    } catch (err) { setError(err.message || 'Erreur.'); }
  }, [period]);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [a, b] = await Promise.all([getDashboardStats(period), getDashboardReporting(period)]);
      setStats(a); setReporting(b);
    } catch (err) { setError(err.message || 'Erreur.'); setStats(null); setReporting(null); }
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setDetail(null); }, [period]);
  useEffect(() => { if (currentView === 'rapport-ia') { getRapportsIA().then(setSavedReports).catch(() => {}); } }, [currentView]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setGeneratedContent(null);
    setSelectedReportId(null);
    try {
      const result = await genererRapportIA(prompt.trim(), dateDebut || null, dateFin || null);
      setGeneratedContent(result.contenu);
      setSavedName(prompt.trim().slice(0, 80));
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    } catch (err) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  }, [prompt, dateDebut, dateFin]);

  const handleSave = useCallback(async () => {
    if (!generatedContent || !savedName.trim()) return;
    setSaving(true);
    try {
      const report = await sauvegarderRapportIA(savedName.trim(), prompt, generatedContent, dateDebut || null, dateFin || null);
      setSavedReports((prev) => [report, ...prev]);
      setSelectedReportId(report.id);
      alert('Rapport sauvegardé !');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }, [generatedContent, savedName, prompt, dateDebut, dateFin]);

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
      alert(err.message);
    }
  }, [savedReports]);

  const handleDeleteReport = useCallback(async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Supprimer ce rapport ?')) return;
    try {
      await deleteRapportIA(id);
      setSavedReports((prev) => prev.filter(r => r.id !== id));
      if (selectedReportId === id) {
        setSelectedReportId(null);
        setGeneratedContent(null);
      }
    } catch (err) {
      alert(err.message);
    }
  }, [selectedReportId]);

  const handleUpdateReport = useCallback(async () => {
    if (!selectedReportId || !editTitle.trim()) return;
    try {
      const updated = await updateRapportIA(selectedReportId, { titre: editTitle.trim(), contenu: editContent });
      setSavedReports((prev) => prev.map(r => r.id === selectedReportId ? { ...r, ...updated, titre: editTitle.trim(), contenu: editContent } : r));
      setSavedName(editTitle.trim());
      setGeneratedContent(editContent);
      setEditMode(false);
    } catch (err) {
      alert(err.message);
    }
  }, [selectedReportId, editTitle, editContent]);

  const handleDownloadPDF = useCallback(() => {
    const element = document.getElementById('rapport-content');
    if (!element) return;
    const opt = {
      margin: 10,
      filename: `${savedName || 'rapport'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };
    html2pdf().set(opt).from(element).save();
  }, [savedName]);

  const handleTitleChange = useCallback((newTitle) => {
    setSavedName(newTitle);
    if (selectedReportId && newTitle.trim()) {
      updateRapportIA(selectedReportId, { titre: newTitle.trim() }).catch(() => {});
    }
  }, [selectedReportId]);

  useEffect(() => {
    if (currentView === 'cartographie') {
      getSites().then(setSites).catch(() => setSites([]));
    }
  }, [currentView]);

  const logout = () => {
    ['token', 'access_token', 'refresh_token'].forEach((k) => localStorage.removeItem(k));
    navigate('/login');
  };

  // ── derived data ──
  const evo = (stats?.graphiques?.evolution_tickets ?? []).map((d) => {
    const dd = new Date(d.jour);
    return { ...d, _raw: d.jour, jour: isNaN(dd.getTime()) ? d.jour : dd.toLocaleDateString('fr', { day: '2-digit', month: 'short' }) };
  });
  const reso = stats?.graphiques?.resolutions_par_jour ?? [];
  const evoResoMap = {};
  reso.forEach((r) => { const k = r.jour.slice(0, 10); evoResoMap[k] = (evoResoMap[k] || 0) + r.resolus; });
  const creesVsResolus = evo.map((d) => ({
    ...d,
    crees: d.total,
    resolus: evoResoMap[d._raw.slice(0, 10)] || 0,
  }));

  const donut = stats?.graphiques?.repartition_priorite_donut
    ? Object.entries(stats.graphiques.repartition_priorite_donut).map(([k, v]) => ({
        name: LABEL_MAP[k] || k,
        value: v,
        color: { critique: '#DC2626', haute: '#F59E0B', normale: '#2563EB', basse: '#10B981' }[k] || 'var(--text-muted2)',
        raw: k,
      })) : [];

  const topSites = stats?.graphiques?.top_sites_impactes ?? [];
  const communes = reporting?.tableau_communes ?? [];

  const employes = (stats?.stats_employes ?? []).map((e) => {
    const m = (e.delai_moyen || '').match(/(\d+)h\s*(\d+)m/);
    return { ...e, label: `${e.nom} (${e.code})`, delai_h: m ? parseInt(m[1]) + parseInt(m[2]) / 60 : 0 };
  });
  const agentsCC = (stats?.stats_agents_cc ?? []).map((a) => ({ ...a, label: `${a.nom} (${a.code})` }));

  const perfUsers = perfRole === 'ingenieurs' ? employes : agentsCC;
  const selectedPerfUser = perfUsers.find((u) => u.code === perfUser) || null;

  const LoadingView = () => (
    <div style={S.app}>
      <aside style={S.side}><div style={S.brand}><img src={logoDjezzy} alt="" style={S.logo} /><div><div style={S.bn}>Djezzy</div><div style={S.br}>Superviseur</div></div></div></aside>
      <div style={{ ...S.main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}><div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#E8401A', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.7s linear infinite' }} /><p style={{ marginTop: 16, color: 'var(--text-muted3)', fontSize: 13 }}>Chargement…</p></div>
      </div>
    </div>
  );

  const ErrorView = () => (
    <div style={S.app}>
      <aside style={S.side}><div style={S.brand}><img src={logoDjezzy} alt="" style={S.logo} /><div><div style={S.bn}>Djezzy</div><div style={S.br}>Superviseur</div></div></div></aside>
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
      {detail && <DetailModal type={detail.type} data={detail.data} stats={stats} reporting={reporting} onClose={() => { setDetail(null); refresh(); }} />}
      <aside style={S.side}>
        <div style={S.brand}><img src={logoDjezzy} alt="" style={S.logo} /><div><div style={S.bn}>Djezzy</div><div style={S.br}>Superviseur</div></div></div>
        <div style={S.menu}>
          <span style={S.sl}>MENU</span>
          <button className="side-btn" style={{ ...S.mi, ...(currentView === 'dashboard' ? S.mia : {}) }} onClick={() => setCurrentView('dashboard')}><IconD style={{ marginRight: 10 }} /> Dashboard</button>
          <button className="side-btn" style={{ ...S.mi, ...(currentView === 'cartographie' ? S.mia : {}) }} onClick={() => setCurrentView('cartographie')}><IconMap style={{ marginRight: 10 }} /> Cartographie</button>
          <button className="side-btn" style={{ ...S.mi, ...(currentView === 'rapport-ia' ? S.mia : {}) }} onClick={() => setCurrentView('rapport-ia')}><IconFile style={{ marginRight: 10 }} /> Rapport IA</button>
        </div>
        <div style={{ ...S.menu, marginTop: 40 }}>
          <span style={S.sl}>COMPTE</span>
          <button className="side-btn" style={S.mi} onClick={() => navigate('/profile')}><IconU style={{ marginRight: 10 }} /> Profil</button>
          <button className="side-btn" style={S.mi} onClick={logout}><IconL style={{ marginRight: 10 }} /> Déconnexion</button>
        </div>
      </aside>

      <div style={S.main}>
        <header style={S.head}>
          <h1 style={S.title}>{currentView === 'cartographie' ? 'Cartographie' : currentView === 'rapport-ia' ? 'Rapport IA' : "Vue d'ensemble"}</h1>
          <div style={S.right}>
            <div style={S.toggle}>
              {[{ l: '7j', v: 7 }, { l: '30j', v: 30 }, { l: '90j', v: 90 }].map((p) => (
                <button key={p.v} onClick={() => setPeriod(p.v)} style={{ ...S.togBtn, ...(period === p.v ? S.togOn : {}) }}>{p.l}</button>
              ))}
            </div>
            <button onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-toolbar)', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-muted3)' }} title="Actualiser"><IconRefresh style={{ width: 14, height: 14 }} /></button>
            <span style={S.date}>{now()}</span>
          </div>
        </header>

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
        ) : currentView === 'rapport-ia' ? (
          <div ref={resultRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
            {/* Sous-navigation : Créer / Mes rapports */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg-toolbar)', borderRadius: 8, padding: 3, width: 'fit-content' }}>
              <button onClick={() => setRapportView('create')}
                style={{ padding: '6px 16px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', background: rapportView === 'create' ? 'var(--bg-card)' : 'transparent', color: rapportView === 'create' ? 'var(--text-primary)' : 'var(--text-muted3)', boxShadow: rapportView === 'create' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                <IconFile style={{ width: 12, height: 12, marginRight: 6, verticalAlign: 'middle' }} />
                Créer
              </button>
              <button onClick={() => { setRapportView('list'); getRapportsIA().then(setSavedReports).catch(() => {}); }}
                style={{ padding: '6px 16px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', background: rapportView === 'list' ? 'var(--bg-card)' : 'transparent', color: rapportView === 'list' ? 'var(--text-primary)' : 'var(--text-muted3)', boxShadow: rapportView === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                Mes rapports ({savedReports.length})
              </button>
            </div>

            {rapportView === 'list' ? (
              /* ── TABLEAU DES RAPPORTS ── */
              <div style={S.chartBordered}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IconFile style={{ width: 14, height: 14, color: '#7C3AED' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>Mes rapports sauvegardés</span>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted2)' }}>({savedReports.length})</span>
                </div>
                {savedReports.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted2)', fontSize: 12 }}>
                    Aucun rapport sauvegardé. <button onClick={() => setRapportView('create')} style={{ background: 'none', border: 'none', color: '#E8401A', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, textDecoration: 'underline', fontSize: 12 }}>Créer le premier rapport</button>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)', background: 'var(--bg-hover)' }}>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted3)', fontSize: 10, textTransform: 'uppercase' }}>Titre</th>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted3)', fontSize: 10, textTransform: 'uppercase' }}>Prompt</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted3)', fontSize: 10, textTransform: 'uppercase' }}>Période</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted3)', fontSize: 10, textTransform: 'uppercase' }}>Date</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted3)', fontSize: 10, textTransform: 'uppercase' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {savedReports.map((r) => (
                          <tr key={r.id} onClick={() => { handleLoadReport(r.id); setRapportView('create'); }}
                            style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.1s' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.titre}</td>
                            <td style={{ padding: '10px 14px', color: 'var(--text-muted3)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.prompt}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-muted3)', fontSize: 11 }}>
                              {r.date_debut && r.date_fin
                                ? `${new Date(r.date_debut).toLocaleDateString('fr')} → ${new Date(r.date_fin).toLocaleDateString('fr')}`
                                : '30 jours'}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-muted3)', fontSize: 11 }}>
                              {new Date(r.created_at).toLocaleDateString('fr', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteReport(r.id, e); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#DC2626', fontSize: 11 }} title="Supprimer">
                                <IconTrash style={{ width: 13, height: 13 }} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              /* ── Vue CRÉER ── */
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={S.chartBordered}>
                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#E8401A', textTransform: 'uppercase', letterSpacing: 0.3 }}>Nouveau rapport</span>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 140 }}>
                          <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted3)' }}>Du</label>
                          <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} style={S.inp} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 140 }}>
                          <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted3)' }}>Au</label>
                          <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} style={S.inp} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 100, justifyContent: 'flex-end' }}>
                          <button onClick={() => {
                            const today = new Date();
                            const past = new Date();
                            past.setDate(today.getDate() - 30);
                            setDateDebut(past.toISOString().split('T')[0]);
                            setDateFin(today.toISOString().split('T')[0]);
                          }} style={{ ...S.inp, cursor: 'pointer', background: 'var(--bg-hover)', fontWeight: 600, fontSize: 10, border: '1px solid var(--border-color)', textAlign: 'center', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                            <IconCalendar style={{ width: 12, height: 12 }} /> 30 jours
                          </button>
                        </div>
                      </div>
                      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Décrivez le rapport que vous souhaitez... Ex: « Rapport synthétique des 3 derniers mois avec indicateurs clés »"
                        style={{ ...S.inp, minHeight: 80, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
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

                  {generatedContent && (
                    <div style={S.chartBordered}>
                      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => { setGeneratedContent(null); setSelectedReportId(null); }}
                          style={{ background: 'var(--bg-toolbar)', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 10, fontWeight: 600, fontFamily: 'inherit', color: 'var(--text-muted3)', display: 'flex', alignItems: 'center', gap: 4 }}
                          title="Retour">← Retour</button>
                        <IconFile style={{ width: 13, height: 13, color: '#E8401A', flexShrink: 0 }} />
                        <input value={savedName} onChange={(e) => setSavedName(e.target.value)}
                          onBlur={(e) => handleTitleChange(e.target.value)}
                          style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', outline: 'none', flex: 1, minWidth: 60, color: 'var(--text-primary)' }}
                          placeholder="Titre du rapport..." />
                        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                          <button onClick={handleDownloadPDF} disabled={!generatedContent}
                            style={{ ...S.btnSm, background: '#059669', color: '#fff' }} title="Télécharger PDF">
                            <IconDownload style={{ width: 12, height: 12 }} /> PDF
                          </button>
                          {editMode ? (
                            <>
                              <button onClick={handleUpdateReport} style={{ ...S.btnSm, background: '#2563EB', color: '#fff' }} title="Enregistrer">
                                <IconSave style={{ width: 12, height: 12 }} /> Sauver
                              </button>
                              <button onClick={() => setEditMode(false)} style={{ ...S.btnSm, background: 'var(--text-muted3)', color: '#fff' }} title="Annuler"><IconX style={{ width: 12, height: 12 }} /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={handleSave} disabled={saving || !generatedContent}
                                style={{ ...S.btnSm, background: saving ? 'var(--text-muted2)' : '#7C3AED', color: '#fff' }}>
                                {saving ? '...' : <><IconSave style={{ width: 12, height: 12 }} /> Sauvegarder</>}
                              </button>
                              {selectedReportId && (
                                <button onClick={() => { setEditMode(true); setEditTitle(savedName); setEditContent(generatedContent); }}
                                  style={S.btnSm} title="Modifier"><IconEdit style={{ width: 12, height: 12 }} /></button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div id="rapport-content" style={{ padding: '20px', overflowX: 'auto', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, background: 'var(--bg-card)' }}
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(generatedContent) }} />
                    </div>
                  )}
                </div>

                <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={S.chartBordered}>
                    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <IconFile style={{ width: 12, height: 12, color: '#7C3AED' }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                        Rapports ({savedReports.length})
                      </span>
                    </div>
                    <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto', background: 'var(--bg-hover)' }}>
                      {savedReports.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted2)', fontSize: 11 }}>Aucun rapport</div>
                      ) : (
                        savedReports.slice(0, 20).map((r) => (
                          <div key={r.id} onClick={() => handleLoadReport(r.id)}
                            style={{
                              padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)',
                              background: selectedReportId === r.id ? '#f8f4ff' : 'transparent',
                              borderLeft: selectedReportId === r.id ? '3px solid #7C3AED' : '3px solid transparent',
                              transition: 'all 0.15s',
                            }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', flex: 1, wordBreak: 'break-word' }}>{r.titre}</div>
                              <button onClick={(e) => handleDeleteReport(r.id, e)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted2)', flexShrink: 0 }}
                                title="Supprimer">
                                <IconTrash style={{ width: 12, height: 12 }} />
                              </button>
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted2)', marginTop: 3 }}>
                              {new Date(r.created_at).toLocaleDateString('fr', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                        ))
                      )}
                      {savedReports.length > 20 && (
                        <div style={{ padding: '10px 14px', textAlign: 'center', fontSize: 10, color: '#7C3AED', cursor: 'pointer', fontWeight: 600 }}
                          onClick={() => setRapportView('list')}>
                          Voir tout ({savedReports.length}) →
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
        <div style={S.scroll}>
          {/* ─── ROW 1 : Évolution (pleine largeur) ─── */}
          <div style={S.sb}><span style={S.st}>TENDANCE</span></div>
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

          {/* ─── ROW 2 : Donut + Priorité bar + Créés vs Résolus ─── */}
          <div style={S.sb}><span style={S.st}>ANALYTIQUE</span></div>
          <div style={S.chartsRow}>
            <div className="fade-in chart-card" style={{ animationDelay: '0.05s', ...S.chart, flex: 1 }}>
              <div style={S.ch}>
                <span style={S.cht}>Par priorité</span>
                <span style={S.chs}>cliquez sur un secteur</span>
                <InfoPopup text="Répartition des tickets par priorité. Cliquez sur une part pour filtrer la liste des tickets récents." />
              </div>
              <div style={{ ...S.cb, minHeight: 180 }}>
                {donut.length === 0 ? <div style={S.empty}>Aucune donnée</div>
                : <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donut} cx="50%" cy="50%" innerRadius={32} outerRadius={60} paddingAngle={4} dataKey="value"
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => e?.name && setDetail({ type: 'priorite', data: e })}>
                        {donut.map((e) => <Cell key={e.name} fill={e.color} style={{ cursor: 'pointer' }} />)}
                      </Pie>
                      <Tooltip content={<Tip />} />
                    </PieChart>
                  </ResponsiveContainer>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '2px 0 8px', flexWrap: 'wrap' }}>
                  {donut.map((e) => (
                    <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: 'var(--text-secondary)', cursor: 'pointer', transition: 'opacity 0.15s' }}
                      onClick={() => setDetail({ type: 'priorite', data: e })}>
                      <span style={{ width: 7, height: 7, borderRadius: 2, background: e.color, flexShrink: 0 }} />
                      {e.name}: <strong>{e.value}</strong>
                    </div>
                  ))}
              </div>
            </div>

            <div className="fade-in chart-card" style={{ animationDelay: '0.1s', ...S.chart, flex: 1 }}>
              <div style={S.ch}>
                <span style={S.cht}>Priorité</span>
                <span style={S.chs}>nombre</span>
                <InfoPopup text="Nombre de tickets par niveau de priorité." />
              </div>
              <div style={{ ...S.cb, minHeight: 180 }}>
                {donut.length === 0 ? <div style={S.empty}>Aucune donnée</div>
                : <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={donut} margin={{ top: 5, right: 10, left: -5, bottom: 5 }} barSize={32}>
                      <CartesianGrid stroke="#f5f5f5" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#e8e8e8' }} />
                      <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} width={20} />
                      <Tooltip content={<TipValue />} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Réclamations"
                        onClick={(e) => e?.name && setDetail({ type: 'priorite', data: donut.find((d) => d.name === e.name) })}>
                        {donut.map((e) => <Cell key={e.name} fill={e.color} style={{ cursor: 'pointer' }} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>}
              </div>
            </div>

            <div className="fade-in chart-card" style={{ animationDelay: '0.15s', ...S.chart, flex: 1.2 }}>
              <div style={S.ch}>
                <span style={S.cht}>Créés vs Résolus</span>
                <span style={S.chs}>par jour</span>
                <InfoPopup text="Évolution quotidienne des tickets créés et résolus. Permet de visualiser l'équilibre charge / capacité." />
              </div>
              <div style={S.cb}>
                {creesVsResolus.length === 0 ? <div style={S.empty}>Aucune donnée</div>
                : <div style={{ overflowX: 'auto', height: '100%' }}>
                    <LineChart data={creesVsResolus} width={Math.max(creesVsResolus.length * 35, 300)} height={220}
                      margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                      <XAxis dataKey="jour" tick={{ fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#e8e8e8' }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} width={25} />
                      <Tooltip content={<Tip />} />
                      <Line type="monotone" dataKey="crees" stroke="#2563EB" strokeWidth={2} dot={{ r: 1.5 }} activeDot={{ r: 5 }} name="Créés" />
                      <Line type="monotone" dataKey="resolus" stroke="#10B981" strokeWidth={2} dot={{ r: 1.5 }} activeDot={{ r: 5 }} name="Résolus" />
                    </LineChart>
                  </div>}
              </div>
            </div>
          </div>

          {/* ─── ROW 3 : Top Sites + Commune ─── */}
          <div style={S.sb}><span style={S.st}>RÉSEAU</span></div>
          <div style={S.chartsRow}>
            <div className="fade-in chart-card" style={{ animationDelay: '0.2s', ...S.chart, flex: 1 }}>
              <div style={S.ch}>
                <span style={S.cht}>Sites les plus impactés</span>
                <span style={S.chs}>nombre de réclamations</span>
                <InfoPopup text="Top sites avec le plus de réclamations sur la période. Cliquez pour voir les détails." />
              </div>
              <div style={S.cb}>
                {topSites.length === 0 ? <div style={S.empty}>Aucune donnée</div>
                : <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topSites} margin={{ top: 5, right: 10, left: -5, bottom: 5 }} barSize={28}
                      onClick={(e) => e?.activePayload && setDetail({ type: 'top_site', data: e.activePayload[0].payload })}>
                      <CartesianGrid stroke="#f5f5f5" vertical={false} horizontal={false} />
                      <XAxis dataKey="codeSite" tick={{ fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#e8e8e8' }} />
                      <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} width={25} />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="num_reclamations" radius={[4, 4, 0, 0]} name="Réclamations" style={{ cursor: 'pointer' }}>
                        {topSites.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} style={{ cursor: 'pointer' }} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>}
              </div>
            </div>

            <div className="fade-in chart-card" style={{ animationDelay: '0.25s', ...S.chart, flex: 1.2 }}>
              <div style={S.ch}>
                <span style={S.cht}>Disponibilité par commune</span>
                <span style={S.chs}>survolez pour voir le nom</span>
                <InfoPopup text="Taux de disponibilité des sites par commune. Survolez les barres pour voir le nom. Vert ≥95%, Orange ≥80%, Rouge <80%." />
              </div>
              <div style={{ ...S.cb, overflowY: 'auto', minHeight: 280 }}>
                {communes.length === 0 ? <div style={S.empty}>Aucune donnée</div>
                : <div style={{ height: Math.max(communes.length * 26, 200), width: '100%' }}>
                    <ResponsiveContainer width="100%" height={Math.max(communes.length * 28, 200)}>
                      <BarChart data={communes} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }} barSize={18}
                        onClick={(e) => e?.activePayload && setDetail({ type: 'commune', data: e.activePayload[0].payload })}>
                        <CartesianGrid stroke="#f5f5f5" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 9 }} domain={[0, 100]} tickLine={false} axisLine={{ stroke: '#e8e8e8' }} tickFormatter={(v) => `${v}%`} width={30} />
                        <YAxis type="category" dataKey="commune" tick={false} tickLine={false} axisLine={false} width={4} />
                        <Tooltip content={<Tip />} />
                        <Bar dataKey="taux_dispo_num" radius={[0, 4, 4, 0]} name="Disponibilité" style={{ cursor: 'pointer' }}
                          shape={(props) => {
                            const { x, y, width, height, value } = props;
                            const w = Math.max(width, value === 0 ? 6 : 0);
                            return (
                              <g>
                                <rect x={x} y={y} width={w} height={height} fill={dispoColor(value)} rx={2} />
                                {value === 0 && (
                                  <circle cx={x + w + 5} cy={y + height / 2} r={3.5} fill="#DC2626" />
                                )}
                              </g>
                            );
                          }}
                        >
                          {communes.map((e) => <Cell key={e.commune} fill={dispoColor(e.taux_dispo_num)} style={{ cursor: 'pointer' }} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>}
              </div>
            </div>
          </div>

          {/* ─── ROW 4 : PERFORMANCES ─── */}
          {perfUsers.length > 0 && (
            <>
              <div style={S.sb}><span style={S.st}>PERFORMANCES</span></div>
              <div className="fade-in chart-card" style={{ animationDelay: '0.3s', ...S.chart, marginBottom: 24 }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={S.cht}>Performances</span>
                  <div style={{ display: 'flex', gap: 4, background: 'var(--bg-toolbar)', borderRadius: 6, padding: 2, marginLeft: 8 }}>
                    <button onClick={() => { setPerfRole('ingenieurs'); setPerfUser(null); }}
                      style={{ padding: '3px 10px', fontSize: 9, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', background: perfRole === 'ingenieurs' ? 'var(--bg-card)' : 'transparent', color: perfRole === 'ingenieurs' ? 'var(--text-primary)' : 'var(--text-muted3)', boxShadow: perfRole === 'ingenieurs' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>Ingénieurs</button>
                    <button onClick={() => { setPerfRole('agents_cc'); setPerfUser(null); }}
                      style={{ padding: '3px 10px', fontSize: 9, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', background: perfRole === 'agents_cc' ? 'var(--bg-card)' : 'transparent', color: perfRole === 'agents_cc' ? 'var(--text-primary)' : 'var(--text-muted3)', boxShadow: perfRole === 'agents_cc' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>Call Center</button>
                  </div>
                  <select value={perfUser || ''} onChange={(e) => setPerfUser(e.target.value || null)}
                    style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 11, borderRadius: 4, border: '1px solid var(--border-color)', fontFamily: 'inherit', maxWidth: 200, cursor: 'pointer', transition: 'border-color 0.15s' }}>
                    <option value="">Choisir un utilisateur...</option>
                    {perfUsers.map((u) => (
                      <option key={u.code} value={u.code}>{u.nom} ({u.code})</option>
                    ))}
                  </select>
                </div>

                {!selectedPerfUser ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted2)', fontSize: 12 }}>
                    S&eacute;lectionnez un utilisateur pour voir ses statistiques
                  </div>
                ) : (
                  <div className="fade-in" style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                      {perfRole === 'ingenieurs' ? (
                        <>
                          <div className="stat-card" style={S.statCard}>
                            <div style={S.statVal}>{selectedPerfUser.total_assignes}</div>
                            <div style={S.statLbl}>Assignés</div>
                          </div>
                          <div className="stat-card" style={S.statCard}>
                            <div style={S.statVal}>{selectedPerfUser.resolus}</div>
                            <div style={S.statLbl}>Résolus</div>
                          </div>
                          <div className="stat-card" style={S.statCard}>
                            <div style={{ ...S.statVal, color: selectedPerfUser.taux_resolution >= 80 ? '#10B981' : selectedPerfUser.taux_resolution >= 50 ? '#F59E0B' : '#EF4444' }}>{selectedPerfUser.taux_resolution}%</div>
                            <div style={S.statLbl}>Taux résolution</div>
                          </div>
                          <div className="stat-card" style={S.statCard}>
                            <div style={S.statVal}>{selectedPerfUser.delai_h ? `${selectedPerfUser.delai_h.toFixed(1)}h` : selectedPerfUser.delai_moyen}</div>
                            <div style={S.statLbl}>Délai moyen</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="stat-card" style={S.statCard}>
                            <div style={S.statVal}>{selectedPerfUser.tickets_crees}</div>
                            <div style={S.statLbl}>Créés</div>
                          </div>
                          <div className="stat-card" style={S.statCard}>
                            <div style={S.statVal}>{selectedPerfUser.ouverts}</div>
                            <div style={S.statLbl}>Ouverts</div>
                          </div>
                          <div className="stat-card" style={S.statCard}>
                            <div style={S.statVal}>{selectedPerfUser.resolus}</div>
                            <div style={S.statLbl}>Résolus</div>
                          </div>
                          <div className="stat-card" style={S.statCard}>
                            <div style={S.statVal}>{selectedPerfUser.fermes}</div>
                            <div style={S.statLbl}>Fermés</div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="fade-in" style={{ width: '100%', height: 220 }}>
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
                )}
              </div>
            </>
          )}

          <div style={{ height: 30 }} />
        </div>
      )}
      </div>
    </div>
  );
}

const S = {
  app: { display: 'flex', height: '100vh', fontFamily: "'Inter', system-ui, sans-serif", width: '100%' },
  side: { width: 180, background: C.sidebarBg, color: 'var(--text-sidebar)', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  brand: { height: 80, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  logo: { width: 32, height: 'auto', objectFit: 'contain' },
  bn: { color: '#fff', fontWeight: 700, fontSize: 15 },
  br: { marginTop: 5, fontSize: 9, color: 'var(--text-sidebar)' },
  menu: { display: 'flex', flexDirection: 'column', gap: 4, padding: '24px 12px 0' },
  sl: { margin: '0 5px 8px', fontSize: 6, fontWeight: 700, color: 'var(--text-muted3)', letterSpacing: 1 },
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
  chartBordered: { background: 'var(--bg-card)', borderRadius: 8, borderTop: '3px solid #E8401A', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  spinSm: { width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' },
};
