import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  Tooltip,
} from 'recharts';
import { getDashboardStats, getDashboardReporting } from '../api/dashboard';
import { getSites } from '../api/tickets';
import DetailModal from '../components/DetailModal';
import MapComponent from '../components/Map';
import logoDjezzy from '../assets/Djezzy_Logo.png';

const C = {
  sidebarBg: '#11101f', mainBg: '#f5f6fa', cardBg: '#FFFFFF',
  textDark: '#1c212b', textMuted: '#818898', border: '#d8dde5',
};
const PALETTE = ['#E8401A', '#2563EB', '#10B981', '#F59E0B', '#8B5CF6'];

const iconProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IconD = (p) => <svg {...iconProps} {...p}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>;
const IconU = (p) => <svg {...iconProps} {...p}><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>;
const IconL = (p) => <svg {...iconProps} {...p}><path d="M15 16l4-4-4-4" /><path d="M19 12H8" /><path d="M12 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" /></svg>;
const IconI = (p) => <svg {...iconProps} {...p}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>;
const IconRefresh = (p) => <svg {...iconProps} {...p}><path d="M3 12a9 9 0 0 1 15.5-6.3M21 12a9 9 0 0 1-15.5 6.3" /><path d="M3 4v5h5M21 20v-5h-5" /></svg>;
const IconMap = (p) => <svg {...iconProps} {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>;
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

const TipValue = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #d8dde5', borderRadius: 6, padding: '6px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}>
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
      <IconI style={{ width: 14, height: 14, color: '#94A3B8' }} />
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
        color: { critique: '#DC2626', haute: '#F59E0B', normale: '#2563EB', basse: '#10B981' }[k] || '#94A3B8',
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
        <div style={{ textAlign: 'center' }}><div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#E8401A', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.7s linear infinite' }} /><p style={{ marginTop: 16, color: '#64748B', fontSize: 13 }}>Chargement…</p></div>
      </div>
    </div>
  );

  const ErrorView = () => (
    <div style={S.app}>
      <aside style={S.side}><div style={S.brand}><img src={logoDjezzy} alt="" style={S.logo} /><div><div style={S.bn}>Djezzy</div><div style={S.br}>Superviseur</div></div></div></aside>
      <div style={{ ...S.main, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <h3 style={{ color: '#1c212b', fontSize: 16, margin: '0 0 8px' }}>Erreur</h3>
          <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 20px' }}>{error}</p>
          <button onClick={fetchData} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, border: '1px solid #d8dde5', borderRadius: 6, cursor: 'pointer', background: '#fff', color: '#1c212b', fontFamily: 'inherit' }}>Réessayer</button>
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
        </div>
        <div style={{ ...S.menu, marginTop: 40 }}>
          <span style={S.sl}>COMPTE</span>
          <button className="side-btn" style={S.mi} onClick={() => navigate('/profile')}><IconU style={{ marginRight: 10 }} /> Profil</button>
          <button className="side-btn" style={S.mi} onClick={logout}><IconL style={{ marginRight: 10 }} /> Déconnexion</button>
        </div>
      </aside>

      <div style={S.main}>
        <header style={S.head}>
          <h1 style={S.title}>{currentView === 'cartographie' ? 'Cartographie' : "Vue d'ensemble"}</h1>
          <div style={S.right}>
            <div style={S.toggle}>
              {[{ l: '7j', v: 7 }, { l: '30j', v: 30 }, { l: '90j', v: 90 }].map((p) => (
                <button key={p.v} onClick={() => setPeriod(p.v)} style={{ ...S.togBtn, ...(period === p.v ? S.togOn : {}) }}>{p.l}</button>
              ))}
            </div>
            <button onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f4f9', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', color: '#64748B' }} title="Actualiser"><IconRefresh style={{ width: 14, height: 14 }} /></button>
            <span style={S.date}>{now()}</span>
          </div>
        </header>

        {currentView === 'cartographie' ? (
          <div style={{ flex: 1, padding: '16px 24px' }}>
            <div style={{ ...S.chart, height: '100%', minHeight: 500 }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconMap style={{ width: 16, height: 16 }} />
                <span style={S.cht}>Cartographie des sites 5G</span>
              </div>
              <div style={{ flex: 1, height: 'calc(100vh - 160px)' }}>
                <MapComponent sites={sites} showCoverage />
              </div>
            </div>
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
                    <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: '#475569', cursor: 'pointer', transition: 'opacity 0.15s' }}
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
                <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={S.cht}>Performances</span>
                  <div style={{ display: 'flex', gap: 4, background: '#f1f4f9', borderRadius: 6, padding: 2, marginLeft: 8 }}>
                    <button onClick={() => { setPerfRole('ingenieurs'); setPerfUser(null); }}
                      style={{ padding: '3px 10px', fontSize: 9, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', background: perfRole === 'ingenieurs' ? '#fff' : 'transparent', color: perfRole === 'ingenieurs' ? '#1c212b' : '#64748B', boxShadow: perfRole === 'ingenieurs' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>Ingénieurs</button>
                    <button onClick={() => { setPerfRole('agents_cc'); setPerfUser(null); }}
                      style={{ padding: '3px 10px', fontSize: 9, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', background: perfRole === 'agents_cc' ? '#fff' : 'transparent', color: perfRole === 'agents_cc' ? '#1c212b' : '#64748B', boxShadow: perfRole === 'agents_cc' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>Call Center</button>
                  </div>
                  <select value={perfUser || ''} onChange={(e) => setPerfUser(e.target.value || null)}
                    style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 11, borderRadius: 4, border: '1px solid #d8dde5', fontFamily: 'inherit', maxWidth: 200, cursor: 'pointer', transition: 'border-color 0.15s' }}>
                    <option value="">Choisir un utilisateur...</option>
                    {perfUsers.map((u) => (
                      <option key={u.code} value={u.code}>{u.nom} ({u.code})</option>
                    ))}
                  </select>
                </div>

                {!selectedPerfUser ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>
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
                            <Bar dataKey="fermes" radius={[4, 4, 0, 0]} fill="#64748B" name="Fermés" />
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
  side: { width: 180, background: C.sidebarBg, color: '#94A3B8', display: 'flex', flexDirection: 'column', flexShrink: 0 },
  brand: { height: 80, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  logo: { width: 32, height: 'auto', objectFit: 'contain' },
  bn: { color: '#fff', fontWeight: 700, fontSize: 15 },
  br: { marginTop: 5, fontSize: 9, color: '#9492a0' },
  menu: { display: 'flex', flexDirection: 'column', gap: 4, padding: '24px 12px 0' },
  sl: { margin: '0 5px 8px', fontSize: 6, fontWeight: 700, color: '#4e4b5c', letterSpacing: 1 },
  mi: { display: 'flex', alignItems: 'center', background: 'transparent', border: 'none', color: '#92909e', padding: '0 10px', borderRadius: 6, cursor: 'pointer', textAlign: 'left', fontSize: 13, width: '100%', height: 34, textDecoration: 'none', outline: 'none' },
  mia: { background: 'linear-gradient(90deg, #9a0c2d, #710820)', color: '#fff', fontWeight: 600 },
  main: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: C.mainBg },
  head: { height: 50, display: 'flex', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid #dadde3', background: C.cardBg, flexShrink: 0 },
  title: { margin: 0, fontSize: 14, fontWeight: 700, color: '#171a21' },
  right: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 },
  toggle: { display: 'flex', gap: 2, background: '#f1f4f9', borderRadius: 6, padding: 2 },
  togBtn: { padding: '4px 10px', fontSize: 10, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', color: '#64748B', background: 'transparent', fontFamily: 'inherit' },
  togOn: { background: '#fff', color: '#171a21', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  date: { fontSize: 10, color: '#94A3B8', fontWeight: 500, padding: '4px 10px', background: '#f1f4f9', borderRadius: 4 },
  scroll: { flex: 1, overflowY: 'auto', padding: '8px 24px 0' },
  spin: { width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#E8401A', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' },
  sb: { marginBottom: 8, marginTop: 2 },
  st: { fontSize: 10, fontWeight: 700, color: '#64748B', letterSpacing: 0.5 },
  chartsRow: { display: 'flex', gap: 16, marginBottom: 24, minHeight: 200 },
  chart: { background: C.cardBg, border: '1px solid #d8dde5', borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  ch: { padding: '10px 16px 4px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'baseline', gap: 8 },
  cht: { fontSize: 11, fontWeight: 700, color: '#1c212b', textTransform: 'uppercase', letterSpacing: 0.3 },
  chs: { fontSize: 9, color: C.textMuted },
  cb: { flex: 1, padding: '6px 6px 4px', minHeight: 260, cursor: 'pointer' },
  empty: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', fontSize: 11 },
  statCard: { background: '#f8fafc', borderRadius: 8, padding: '10px 16px', minWidth: 100, textAlign: 'center', border: '1px solid #e2e8f0', flex: 1 },
  statVal: { fontSize: 22, fontWeight: 700, color: '#1c212b', lineHeight: 1.2 },
  statLbl: { fontSize: 9, color: '#94A3B8', marginTop: 2 },
};
