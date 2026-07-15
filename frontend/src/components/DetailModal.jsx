import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
} from 'recharts';
import { getReclamationsList, updateSite } from '../api/dashboard';

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 30,
  },
  modal: {
    background: '#fff', borderRadius: 12, width: '100%', maxWidth: 1200,
    maxHeight: '95vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 25px 80px rgba(0,0,0,0.3)', overflow: 'hidden',
  },
  head: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 24px', borderBottom: '1px solid #e2e8f0',
  },
  title: { fontSize: 17, fontWeight: 700, color: '#1c212b', margin: 0 },
  close: {
    width: 32, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer',
    background: '#f1f4f9', color: '#64748B', fontSize: 20, lineHeight: '32px',
    textAlign: 'center', fontFamily: 'inherit',
  },
  chartZone: { padding: '16px 24px 8px', borderBottom: '1px solid #f0f0f0' },
  chartBox: { width: '100%', height: 400 },
  stats: {
    display: 'flex', gap: 14, padding: '10px 24px', flexWrap: 'wrap',
    borderBottom: '1px solid #f0f0f0', background: '#fafbfc',
  },
  sb: (c) => ({
    background: '#fff', borderRadius: 8, padding: '7px 14px',
    borderLeft: `3px solid ${c}`, flex: '0 0 auto', minWidth: 100,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  }),
  sl: { fontSize: 9, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' },
  sv: (c) => ({ fontSize: 18, fontWeight: 700, color: c, marginTop: 2 }),
  body: { flex: 1, overflowY: 'auto', padding: '12px 24px 20px' },
  secT: { fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 10px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 11.5 },
  th: {
    textAlign: 'left', padding: '7px 10px', fontWeight: 600, color: '#64748B',
    borderBottom: '2px solid #e2e8f0', fontSize: 10, textTransform: 'uppercase',
    letterSpacing: 0.3, position: 'sticky', top: 0, background: '#fff', zIndex: 1,
  },
  td: { padding: '7px 10px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  sel: {
    padding: '3px 8px', fontSize: 11, borderRadius: 4, border: '1px solid #d8dde5',
    background: '#fff', cursor: 'pointer', fontFamily: 'inherit',
  },
  badge: (c) => ({
    display: 'inline-block', padding: '2px 10px', borderRadius: 10,
    fontSize: 10, fontWeight: 600, color: c, background: `${c}18`,
  }),
  edit: { padding: '8px 14px', background: '#f8fafc' },
  btn: (p) => ({
    padding: '5px 12px', fontSize: 10, fontWeight: 600, border: 'none',
    borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
    background: p ? '#2563EB' : '#f1f4f9', color: p ? '#fff' : '#475569',
  }),
  inp: {
    padding: '4px 8px', fontSize: 11, borderRadius: 4, border: '1px solid #d8dde5',
    fontFamily: 'inherit', width: 200, maxWidth: '40vw', boxSizing: 'border-box',
  },
};

const PC = { critique: '#DC2626', haute: '#F59E0B', normale: '#2563EB', basse: '#10B981' };
const SC = { ouvert: '#0284C7', resolu: '#10B981', ferme: '#DC2626' };
const SITE_C = { UP: '#10B981', DOWN: '#DC2626' };
const PAL = ['#E8401A', '#2563EB', '#10B981', '#F59E0B', '#8B5CF6'];

const Badge = ({ text, map }) => {
  const c = map?.[text?.toLowerCase()] || '#64748B';
  return <span style={S.badge(c)}>{text}</span>;
};

const Tip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #d8dde5', borderRadius: 6, padding: '8px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 11 }}>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#1c212b' }}>{label}</p>
      {payload.map((e, i) => <p key={i} style={{ margin: '2px 0', color: e.color || '#555' }}>{e.name}: {typeof e.value === 'number' ? e.value.toLocaleString() : e.value}</p>)}
    </div>
  );
};

const StatBox = ({ label, value, color }) => (
  <div style={S.sb(color)}>
    <div style={S.sl}>{label}</div>
    <div style={S.sv(color)}>{value ?? '—'}</div>
  </div>
);

function TicketRow({ ticket }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <tr style={{ cursor: 'pointer' }} onClick={() => setShow(!show)}>
        <td style={S.td}>{ticket.numero_ticket}</td>
        <td style={S.td}>{ticket.nom_client}</td>
        <td style={S.td}><Badge text={ticket.statut} map={SC} /></td>
        <td style={S.td}><Badge text={ticket.priorite} map={PC} /></td>
        <td style={S.td}>{ticket.site_display || ticket.site?.nom || '—'}</td>
        <td style={S.td}>{ticket.assigne_a_display || '—'}</td>
        <td style={S.td}>{new Date(ticket.created_at).toLocaleDateString('fr', { day: '2-digit', month: 'short' })}</td>
      </tr>
      {show && (
        <tr>
          <td colSpan={7} style={{ ...S.edit, padding: '10px 14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 11, color: '#475569' }}>
              <div><strong>Email:</strong> {ticket.email_client || '—'}</div>
              <div><strong>Tél:</strong> {ticket.telephone_client || '—'}</div>
              <div><strong>Type:</strong> {ticket.type_client || '—'}</div>
              <div><strong>Site:</strong> {ticket.site_display || ticket.site?.nom || '—'}</div>
              <div><strong>Créé par:</strong> {ticket.cree_par?.nom_user || ticket.cree_par?.code_user || '—'}</div>
              <div><strong>Assigné à:</strong> {ticket.assigne_a_display || '—'}</div>
              {ticket.mots_cles_ia && <div style={{ gridColumn: '1 / -1' }}><strong>Mots-clés:</strong> {ticket.mots_cles_ia}</div>}
              {ticket.description && <div style={{ gridColumn: '1 / -1' }}><strong>Description IA:</strong> {ticket.description}</div>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function SiteRow({ site, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [statut, setStatut] = useState(site.statut || site.statut_site || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setStatut(site.statut || site.statut_site || ''); }, [site.statut, site.statut_site]);

  const handleSave = async () => {
    setSaving(true);
    try { const u = await updateSite(site.id, { statut }); onUpdated(u); setEditing(false); }
    catch (e) { alert('Erreur: ' + e.message); } finally { setSaving(false); }
  };

  return (
    <>
      <tr style={{ cursor: 'pointer' }} onClick={() => setEditing(!editing)}>
        <td style={S.td}>{site.codeSite}</td>
        <td style={S.td}>{site.nom}</td>
        <td style={S.td}><Badge text={site.statut || site.statut_site} map={SITE_C} /></td>
        <td style={S.td}>{site.wilaya || '—'}</td>
        <td style={S.td}>{site.commune || '—'}</td>
        <td style={S.td}>{site.tickets_ouverts ?? site.num_reclamations ?? '—'}</td>
        <td style={S.td}>{site.derniere_maj ? new Date(site.derniere_maj).toLocaleDateString('fr', { day: '2-digit', month: 'short' }) : '—'}</td>
      </tr>
      {editing && (
        <tr>
          <td colSpan={7} style={S.edit}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: '#475569' }}>
                Statut: <select value={statut} onChange={(e) => setStatut(e.target.value)} style={{ ...S.sel, marginLeft: 4 }}>
                  <option value="UP">UP</option>
                  <option value="DOWN">DOWN</option>
                  <option value="DEGRADE">DÉGRADÉ</option>
                  <option value="PERTURBE">PERTURBÉ</option>
                </select>
              </label>
              <button onClick={handleSave} disabled={saving} style={S.btn(true)}>{saving ? '…' : 'Mettre à jour'}</button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function parseEvoDate(jourStr) {
  if (!jourStr) return null;
  const d = new Date(jourStr);
  if (!isNaN(d.getTime())) return d;
  return null;
}

export default function DetailModal({ type, data, onClose, stats, reporting }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [filterPrio, setFilterPrio] = useState((type === 'priorite' && data?.name) || (type === 'delai' && data?.priorite) || '');

  const evo = (stats?.graphiques?.evolution_tickets ?? []).map((d) => {
    const dd = parseEvoDate(d.jour);
    return { ...d, _raw: d.jour, jour: dd ? dd.toLocaleDateString('fr', { day: '2-digit', month: 'short' }) : d.jour, _rawDate: dd };
  });

  const donut = stats?.graphiques?.repartition_priorite_donut
    ? Object.entries(stats.graphiques.repartition_priorite_donut).map(([k, v]) => ({
        name: { critique: 'Critique', haute: 'Haute', normale: 'Normale', basse: 'Basse' }[k] || k, value: v,
        color: { critique: '#DC2626', haute: '#F59E0B', normale: '#2563EB', basse: '#10B981' }[k] || '#94A3B8',
      })) : [];

  const topSites = stats?.graphiques?.top_sites_impactes ?? [];
  const communes = reporting?.tableau_communes ?? [];

  const delaiRaw = stats?.graphiques?.delai_moyen_par_priorite ?? {};
  const delaiData = Object.entries(delaiRaw).filter(([, v]) => v !== 'N/A').map(([k, v]) => {
    const m = v.match(/(\d+)h\s*(\d+)m/);
    return { priorite: { critique: 'Critique', haute: 'Haute', normale: 'Normale', basse: 'Basse' }[k] || k, heures: m ? parseInt(m[1]) + parseInt(m[2]) / 60 : 0 };
  });

  const PRIOS = [
    { key: '', label: 'Toutes', color: '#64748B' },
    { key: 'critique', label: 'Critique', color: '#DC2626' },
    { key: 'haute', label: 'Haute', color: '#F59E0B' },
    { key: 'normale', label: 'Normale', color: '#2563EB' },
    { key: 'basse', label: 'Basse', color: '#10B981' },
  ];

  const getTitle = useCallback(() => {
    switch (type) {
      case 'evolution': return `Évolution des tickets — ${data?.jour || data?._raw || 'tendances'}`;
      case 'priorite': return `Priorité : ${filterPrio || 'Toutes'}`;
      case 'delai': return `Délai de résolution — ${filterPrio || 'Toutes'}`;
      case 'top_site': return `Site : ${data?.nom || data?.codeSite || ''}`;
      case 'commune': return `Commune : ${data?.commune || ''}`;
      default: return 'Détails';
    }
  }, [type, data, filterPrio]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      let result = [];
      switch (type) {
        case 'evolution': {
          const rawDate = data?._raw;
          if (rawDate) {
            const raw = await getReclamationsList();
            const targetDate = parseEvoDate(rawDate);
            if (targetDate) {
              result = raw.filter((t) => {
                const td = new Date(t.created_at);
                return td.getFullYear() === targetDate.getFullYear() &&
                       td.getMonth() === targetDate.getMonth() &&
                       td.getDate() === targetDate.getDate();
              });
            } else {
              result = raw;
            }
          } else {
            result = await getReclamationsList();
          }
          break;
        }
        case 'priorite': {
          const prio = filterPrio?.toLowerCase() || '';
          result = await getReclamationsList({ statut: 'ouvert,resolu,ferme' });
          if (prio) result = result.filter((t) => t.priorite?.toLowerCase() === prio);
          break;
        }
        case 'delai': {
          const prio2 = filterPrio?.toLowerCase() || '';
          result = await getReclamationsList({ statut: 'resolu' });
          if (prio2) result = result.filter((t) => t.priorite?.toLowerCase() === prio2);
          break;
        }
        case 'top_site': {
          const all = await getReclamationsList({ statut: 'ouvert,resolu,ferme' });
          const siteCode = data?.codeSite || '';
          if (siteCode) {
            result = all.filter((t) => t.site?.codeSite === siteCode || t.site_display === data?.nom);
          } else if (data?.id) {
            result = all.filter((t) => t.site?.id === data.id);
          }
          if (result.length === 0) {
            result = [{
              id: data?.id, codeSite: data?.codeSite, nom: data?.nom,
              statut: data?.statut, wilaya: data?.wilaya, commune: data?.commune,
              derniere_maj: data?.derniere_maj, num_reclamations: data?.num_reclamations,
              tickets_ouverts: data?.num_reclamations,
            }];
          }
          break;
        }
        case 'commune': {
          const cn = data?.commune || '';
          result = await getReclamationsList({ statut: 'ouvert,resolu,ferme' });
          if (cn) result = result.filter((t) => t.site?.commune?.toUpperCase() === cn.toUpperCase());
          break;
        }
        default: break;
      }
      setItems(Array.isArray(result) ? result : [result].filter(Boolean));
    } catch (e) { console.error(e); setItems([]); }
    finally { setLoading(false); }
  }, [type, data, filterPrio]);

  useEffect(() => { setTitle(getTitle()); fetchItems(); }, [getTitle, fetchItems]);

  const handleUpdate = (u) => setItems((prev) => prev.map((it) => (it.id === u.id ? u : it)));

  const renderChart = () => {
    switch (type) {
      case 'evolution':
        return (
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={evo} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="jour" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#d0d0d0' }} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<Tip />} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="total" stroke="#E8401A" strokeWidth={2.5} dot={{ r: 3, fill: '#E8401A' }} activeDot={{ r: 6 }} name="Tickets" />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'priorite':
        return (
          <div style={{ display: 'flex', alignItems: 'center', height: 360 }}>
            <ResponsiveContainer width="55%" height={360}>
              <PieChart>
                <Pie data={donut} cx="50%" cy="50%" innerRadius={70} outerRadius={120} paddingAngle={3} dataKey="value">
                  {donut.map((e, i) => <Cell key={e.name} fill={e.color} />)}
                </Pie>
                <Tooltip content={<Tip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, padding: '0 20px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1c212b', marginBottom: 12 }}>Répartition</div>
              {donut.map((e) => {
                const total = donut.reduce((s, x) => s + x.value, 0);
                return (
                  <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: e.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, color: '#475569' }}>{e.name}</span>
                    <span style={{ fontWeight: 700, color: '#1c212b' }}>{e.value}</span>
                    <span style={{ color: '#94A3B8', fontSize: 11 }}>
                      ({total > 0 ? Math.round(e.value / total * 100) : 0}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'delai':
        return (
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={delaiData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 10 }} barSize={30}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#d0d0d0' }} />
              <YAxis type="category" dataKey="priorite" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="heures" radius={[0, 4, 4, 0]} name="Heures">
                {delaiData.map((_, i) => <Cell key={i} fill={PAL[i % PAL.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'top_site':
        return (
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={topSites} margin={{ top: 10, right: 20, left: 0, bottom: 10 }} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
              <XAxis dataKey="codeSite" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#d0d0d0' }} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="num_reclamations" radius={[4, 4, 0, 0]} name="Réclamations">
                {topSites.map((_, i) => <Cell key={i} fill={PAL[i % PAL.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'commune':
        return (
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={communes} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 10 }} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 100]} tickLine={false} axisLine={{ stroke: '#d0d0d0' }} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="commune" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={65} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="taux_dispo_num" radius={[0, 4, 4, 0]} name="Disponibilité">
                {communes.map((e) => <Cell key={e.commune} fill={e.taux_dispo_num >= 95 ? '#10B981' : e.taux_dispo_num >= 80 ? '#F59E0B' : '#EF4444'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      default:
        return <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8', fontSize: 13 }}>Aperçu non disponible</div>;
    }
  };

  const renderStats = () => {
    switch (type) {
      case 'evolution':
        return (<><StatBox label="Total période" value={stats?.tickets?.total ?? '—'} color="#E8401A" /><StatBox label="En cours" value={stats?.tickets?.ouverts ?? '—'} color="#F59E0B" /><StatBox label="Résolus" value={stats?.tickets?.resolus ?? '—'} color="#10B981" /><StatBox label="Taux" value={stats?.tickets?.taux_resolution ?? '—'} color="#2563EB" /></>);
      case 'priorite': {
        const total = donut.reduce((s, x) => s + x.value, 0);
        return (<><StatBox label="Priorité" value={data?.name || '—'} color="#DC2626" /><StatBox label="Tickets" value={data?.value ?? '—'} color="#2563EB" /><StatBox label="Proportion" value={total > 0 && data?.value ? `${Math.round(data.value / total * 100)}%` : '—'} color="#F59E0B" /></>);
      }
      case 'delai':
        return (<><StatBox label="Priorité" value={data?.priorite || '—'} color="#8B5CF6" /><StatBox label="Temps" value={data?.heures ? data.heures.toFixed(1) + 'h' : '—'} color="#8B5CF6" /></>);
      case 'top_site':
        return (<><StatBox label="Site" value={data?.codeSite || '—'} color="#E8401A" /><StatBox label="Réclamations" value={data?.num_reclamations ?? '—'} color="#E8401A" /><StatBox label="Statut" value={data?.statut || '—'} color={SITE_C[data?.statut] || '#64748B'} /></>);
      case 'commune':
        return (<><StatBox label="Commune" value={data?.commune || '—'} color="#10B981" /><StatBox label="Disponibilité" value={data?.taux_dispo_num ? data.taux_dispo_num + '%' : '—'} color="#10B981" /><StatBox label="Sites" value={data?.total_sites ?? '—'} color="#3B82F6" /><StatBox label="En panne" value={data?.sites_down ?? '—'} color="#DC2626" /></>);
      default: return null;
    }
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.head}>
          <h2 style={S.title}>{title}</h2>
          <button onClick={onClose} style={S.close}>&times;</button>
        </div>

        {type === 'priorite' ? (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <div style={{ width: '40%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0' }}>
              <div style={{ flex: 1, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={donut} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value">
                      {donut.map((e, i) => <Cell key={e.name} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<Tip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ padding: '8px 20px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 10 }}>RÉPARTITION</div>
                {donut.map((e) => {
                  const total = donut.reduce((s, x) => s + x.value, 0);
                  return (
                    <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: e.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, color: '#475569' }}>{e.name}</span>
                      <span style={{ fontWeight: 700, color: '#1c212b' }}>{e.value}</span>
                      <span style={{ color: '#94A3B8', fontSize: 10 }}>({total > 0 ? Math.round(e.value / total * 100) : 0}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {PRIOS.map((p) => (
                  <button key={p.key} onClick={() => setFilterPrio(p.key)}
                    style={{ padding: '3px 10px', fontSize: 10, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', background: (filterPrio || '') === p.key ? p.color : '#f1f4f9', color: (filterPrio || '') === p.key ? '#fff' : '#475569' }}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div style={{ padding: '8px 16px', fontSize: 10, fontWeight: 700, color: '#64748B', letterSpacing: 0.3 }}>
                LISTE DES TICKETS
                <span style={{ fontWeight: 400, color: '#94A3B8', marginLeft: 6 }}>({items.length} résultat{items.length > 1 ? 's' : ''})</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: 30, color: '#94A3B8', fontSize: 12 }}>Chargement…</div>
                ) : items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 30, color: '#94A3B8', fontSize: 12 }}>Aucun résultat</div>
                ) : items[0]?.codeSite && !items[0]?.numero_ticket ? (
                  <table style={S.table}>
                    <thead><tr>
                      <th style={S.th}>codeSite</th><th style={S.th}>nomSite</th><th style={S.th}>statutSite</th>
                      <th style={S.th}>wilaya</th><th style={S.th}>commune</th><th style={S.th}>Tickets</th><th style={S.th}>Dernière MAJ</th>
                    </tr></thead>
                    <tbody>{items.map((s) => <SiteRow key={s.id || s.codeSite} site={s} onUpdated={handleUpdate} />)}</tbody>
                  </table>
                ) : (
                  <table style={S.table}>
                    <thead><tr>
                      <th style={S.th}>numeroTicket</th><th style={S.th}>nomClient</th><th style={S.th}>statutTicket</th>
                      <th style={S.th}>priorite</th><th style={S.th}>codeSite</th><th style={S.th}>Assigné</th><th style={S.th}>dateCreation</th>
                    </tr></thead>
                    <tbody>{items.map((t) => <TicketRow key={t.id} ticket={t} onUpdated={handleUpdate} />)}</tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={S.chartZone}>
              <div style={S.chartBox}>{renderChart()}</div>
            </div>
            <div style={S.stats}>{renderStats()}</div>
            <div style={S.body}>
              {(type === 'delai') && (
                <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
                  {PRIOS.map((p) => (
                    <button key={p.key} onClick={() => setFilterPrio(p.key)}
                      style={{ padding: '3px 10px', fontSize: 10, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', background: (filterPrio || '') === p.key ? p.color : '#f1f4f9', color: (filterPrio || '') === p.key ? '#fff' : '#475569' }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
              <div style={S.secT}>
                {type === 'top_site' ? 'TICKETS LIES AU SITE' : 'LISTE DES TICKETS'}
                <span style={{ fontWeight: 400, color: '#94A3B8', marginLeft: 8 }}>
                  ({items.length} résultat{items.length > 1 ? 's' : ''})
                </span>
              </div>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#94A3B8', fontSize: 12 }}>Chargement…</div>
              ) : items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#94A3B8', fontSize: 12 }}>Aucun résultat</div>
              ) : items[0]?.codeSite && !items[0]?.numero_ticket ? (
                <table style={S.table}>
                  <thead><tr>
                    <th style={S.th}>Code</th><th style={S.th}>Nom</th><th style={S.th}>Statut</th>
                    <th style={S.th}>Wilaya</th><th style={S.th}>Commune</th><th style={S.th}>Tickets</th><th style={S.th}>Dernière MAJ</th>
                  </tr></thead>
                  <tbody>{items.map((s) => <SiteRow key={s.id || s.codeSite} site={s} onUpdated={handleUpdate} />)}</tbody>
                </table>
              ) : (
                <table style={S.table}>
                  <thead><tr>
                    <th style={S.th}>Ticket</th><th style={S.th}>Client</th><th style={S.th}>Statut</th>
                    <th style={S.th}>Priorité</th><th style={S.th}>Site</th><th style={S.th}>Assigné</th><th style={S.th}>Date</th>
                  </tr></thead>
                  <tbody>{items.map((t) => <TicketRow key={t.id} ticket={t} onUpdated={handleUpdate} />)}</tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
