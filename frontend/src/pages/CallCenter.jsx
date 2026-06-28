import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTickets, createTicket, updateTicket, getSites } from '../api/tickets';
import logoDjezzy from '../assets/Djezzy_Logo.png';

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
  if (!isoString) return '\u2014';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '\u2014';
  return `${d.getDate()} ${MOIS_FR[d.getMonth()]}`;
};

const formatDateTimeFr = (isoString) => {
  if (!isoString) return '\u2014';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '\u2014';
  return `${d.getDate()} ${MOIS_FR[d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const iconProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

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
const IconChevronLeft = (p) => (
  <svg {...iconProps} {...p}><path d="M15 6l-6 6 6 6" /></svg>
);
const IconSearch = (p) => (
  <svg {...iconProps} {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
);
const IconRefresh = (p) => (
  <svg {...iconProps} {...p}><path d="M3 12a9 9 0 0 1 15.5-6.3M21 12a9 9 0 0 1-15.5 6.3" /><path d="M3 4v5h5M21 20v-5h-5" /></svg>
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

const INITIAL_FORM = {
  nom_client: '', telephone: '', email: '',
  type_client: 'particulier',
  site_id: '', priorite: 'normale',
  mots_cles_ia: '',
};

export default function CallCenter() {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('non-traites');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filterSiteId, setFilterSiteId] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [sites, setSites] = useState([]);
  const [expandedField, setExpandedField] = useState(null);
  const [hoveredUser, setHoveredUser] = useState(null);

  useEffect(() => {
    getSites().then(setSites).catch(() => setSites([]));
  }, []);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const statut = currentView === 'non-traites' ? 'ouvert,en_cours,ferme' : 'resolu';
      const data = await getTickets(statut);
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Impossible de charger les reclamations', err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [currentView]);

  useEffect(() => {
    if (currentView !== 'nouveau-ticket') {
      fetchTickets();
    }
  }, [currentView, fetchTickets]);

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
        priorite: formData.priorite,
        mots_cles_ia: formData.mots_cles_ia,
      });
      setFormData(INITIAL_FORM);
      setCurrentView('non-traites');
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la creation du ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (ticket) => {
    if (!window.confirm(`Archiver le ticket ${ticket.numero_ticket} ?`)) return;
    try {
      await updateTicket(ticket.id, { statut: 'ferme' });
      setSelectedTicket(null);
      fetchTickets();
    } catch (err) {
      alert("Erreur lors de l'archivage.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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
  });

  const getStatutKey = (statut) => statut?.replace('_', ' ').toUpperCase();

  return (
    <div style={styles.appLayout}>
      <aside style={styles.sidebar}>
        <div style={styles.brandZone}>
          <img src={logoDjezzy} alt="Djezzy" style={styles.brandLogo} />
          <div>
            <div style={styles.brandName}>Djezzy</div>
            <div style={styles.brandRole}>Agent Call Center</div>
          </div>
        </div>

        <div style={styles.menuSection}>
          <span style={styles.sectionLabel}>PRINCIPAL</span>
          <button
            onClick={() => setCurrentView('non-traites')}
            style={{ ...styles.menuItem, ...(currentView === 'non-traites' ? styles.menuItemActive : {}) }}
          >
            <IconTicket style={{ marginRight: '10px', flexShrink: 0 }} /> Tickets Non-Traites
          </button>
          <button
            onClick={() => setCurrentView('traites')}
            style={{ ...styles.menuItem, ...(currentView === 'traites' ? styles.menuItemActive : {}) }}
          >
            <IconArchive style={{ marginRight: '10px', flexShrink: 0 }} /> Tickets Traites
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

      <div style={{ ...styles.mainContent, backgroundColor: COLORS.mainBg }}>
        <header style={{ ...styles.topHeader, backgroundColor: COLORS.cardBg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            {currentView === 'nouveau-ticket' ? (
              <div>
                <div style={styles.backNav} onClick={() => setCurrentView('non-traites')}>
                  <IconChevronLeft />
                  <span style={{ marginLeft: '8px', fontWeight: 600 }}>Nouveau Ticket</span>
                </div>
                <div style={styles.breadcrumb}>
                  Reclamations &gt; <span style={{ color: COLORS.djezzyRed }}>Nouveau Ticket</span>
                </div>
              </div>
            ) : (
              <h1 style={{ ...styles.pageTitle, color: COLORS.textDark }}>Reclamations</h1>
            )}
          </div>
        </header>

        {currentView === 'nouveau-ticket' ? (
          <div style={styles.tableCard}>
            <div style={styles.formHeader}>
              <IconPin style={{ color: COLORS.djezzyRed, marginRight: '10px' }} />
              <span style={{ fontWeight: 700, fontSize: '14px' }}>Creer un nouveau ticket</span>
            </div>

            <form onSubmit={handleCreateTicket} style={styles.formBody}>
              <div style={styles.formSectionTitle}>INFORMATIONS CLIENT</div>

              <div style={styles.formGrid}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>NOM CLIENT</label>
                  <input type="text" name="nom_client" value={formData.nom_client} onChange={handleInputChange} placeholder="Nom et prenom" style={styles.input} required />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>NUMERO TELEPHONE</label>
                  <input type="text" name="telephone" value={formData.telephone} onChange={handleInputChange} placeholder="0X XX XX XX XX" style={styles.input} required />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>EMAIL</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="client@gmail.com" style={styles.input} />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>TYPE CLIENT</label>
                  <select name="type_client" value={formData.type_client} onChange={handleInputChange} style={styles.select}>
                    <option value="particulier">PARTICULIER</option>
                    <option value="entreprise">ENTREPRISE</option>
                  </select>
                </div>
              </div>

              <div style={{ ...styles.formSectionTitle, marginTop: '24px' }}>RECLAMATION</div>

              <div style={styles.formGrid}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>SITE RESEAU CONCERNE</label>
                  <select name="site_id" value={formData.site_id} onChange={handleInputChange} style={styles.select} required>
                    <option value="">Selectionner un site...</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>{site.nom}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>PRIORITE</label>
                  <select name="priorite" value={formData.priorite} onChange={handleInputChange} style={styles.select}>
                    <option value="basse">BASSE</option>
                    <option value="normale">NORMALE</option>
                    <option value="haute">HAUTE</option>
                    <option value="critique">CRITIQUE</option>
                  </select>
                </div>
                <div style={{ ...styles.inputGroup, gridColumn: '1 / -1' }}>
                  <label style={styles.label}>MOTS CLES (notes rapides)</label>
                  <textarea
                    name="mots_cles_ia"
                    value={formData.mots_cles_ia}
                    onChange={handleInputChange}
                    placeholder="Saisissez les mots-cles de la reclamation... (ex: perte signal, zone rurale, coupure frequente)"
                    style={styles.textarea}
                    rows={3}
                  />
                  <div style={{ fontSize: '11px', color: COLORS.textMuted, marginTop: '4px' }}>
                    Une description detaillee sera automatiquement generee pour les ingenieurs.
                  </div>
                </div>
              </div>

              <div style={styles.formActions}>
                <button type="button" onClick={() => setCurrentView('non-traites')} style={styles.btnCancel}>Annuler</button>
                <button type="submit" disabled={submitting} style={styles.btnSubmit}>
                  <IconCheck style={{ marginRight: '6px' }} /> {submitting ? 'Creation...' : 'Creer'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div style={styles.tableCard}>
            <div style={styles.toolbar}>
              <div style={styles.toolbarLeft}>
                <h2 style={styles.tableTitle}>
                  {currentView === 'non-traites' ? 'Listes des reclamations non-traitees' : 'Listes des reclamations'}
                </h2>
              </div>

              <div style={styles.toolbarActions}>
                <button onClick={fetchTickets} style={styles.btnFilter}>
                  <IconRefresh style={{ marginRight: '6px' }} /> Actualiser
                </button>
                <button onClick={() => setShowFilters(!showFilters)} style={styles.btnFilter}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ marginRight: '6px' }}><path d="M4 5h16l-6 7v6l-4 1v-7L4 5Z" /></svg> Filtrer
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
                <button onClick={() => setCurrentView('nouveau-ticket')} style={styles.btnNew}>
                  <IconPlus style={{ marginRight: '6px' }} /> Nouveau Ticket
                </button>
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
                    <th style={{ ...styles.th, paddingLeft: '20px' }}>TICKET</th>
                    <th style={styles.th}>CLIENT</th>
                    <th style={styles.th}>TYPE</th>
                    <th style={styles.th}>SITE</th>
                    <th style={styles.th}>PRIORITE</th>
                    <th style={styles.th}>STATUT</th>
                    <th style={styles.th}>DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" style={styles.emptyCell}>Chargement des donnees...</td></tr>
                  ) : filteredTickets.length === 0 ? (
                    <tr><td colSpan="7" style={styles.emptyCell}>Aucune reclamation trouvee.</td></tr>
                  ) : filteredTickets.map((ticket) => {
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

      {selectedTicket && (
        <div className="fade-in" style={styles.overlay} onClick={() => setSelectedTicket(null)}>
          <div className="scale-in" style={styles.modal} onClick={(e) => e.stopPropagation()}>
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
                    <span style={styles.modalValue}>{selectedTicket.site_display || '\u2014'}</span>
                  </div>
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
                  <h3 style={styles.modalSectionTitle}>Description generee par IA</h3>
                  <p style={styles.modalText}>{selectedTicket.description}</p>
                </div>
              )}

            </div>

            <div style={styles.modalFooter}>
              {getStatutKey(selectedTicket.statut) !== 'FERME' && (
                <button style={styles.btnDanger} onClick={() => handleArchive(selectedTicket)}>
                  <IconArchive /> Archiver
                </button>
              )}
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
      )}
    </div>
  );
}

const styles = {
  appLayout: { display: 'flex', minHeight: '100vh', backgroundColor: COLORS.mainBg, fontFamily: "'Inter', system-ui, sans-serif", width: '100%' },
  sidebar: { width: '193px', backgroundColor: COLORS.sidebarBg, color: 'var(--text-muted2)', display: 'flex', flexDirection: 'column', padding: '0', flexShrink: 0 },
  brandZone: { height: '82px', display: 'flex', alignItems: 'center', gap: '13px', padding: '0 17px', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  brandLogo: { width: '34px', height: 'auto', objectFit: 'contain' },
  brandName: { color: '#FFFFFF', fontWeight: 700, fontSize: '16px' },
  brandRole: { marginTop: '6px', fontSize: '10px', color: 'var(--text-muted3)' },
  menuSection: { display: 'flex', flexDirection: 'column', gap: '5px', padding: '26px 12px 0' },
  sectionLabel: { margin: '0 5px 10px', fontSize: '6px', fontWeight: 700, color: 'var(--text-muted3)', letterSpacing: '1px' },
  menuItem: { display: 'flex', alignItems: 'center', background: 'transparent', border: 'none', color: 'var(--text-muted2)', padding: '0 10px', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', fontSize: '13px', width: '100%', height: '34px', textDecoration: 'none', outline: 'none' },
  menuItemActive: { background: 'linear-gradient(90deg, #E8401A, #C0340D)', color: '#FFFFFF', fontWeight: 600, position: 'relative' },
  mainContent: { flex: 1, padding: '30px 40px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },
  topHeader: { marginBottom: '20px' },
  pageTitle: { margin: 0, fontSize: '22px', fontWeight: 700, color: COLORS.textDark },
  backNav: { display: 'flex', alignItems: 'center', fontSize: '16px', color: COLORS.textDark, cursor: 'pointer', marginBottom: '4px' },
  breadcrumb: { fontSize: '12px', color: COLORS.textMuted, fontWeight: 500 },
  tableCard: { backgroundColor: COLORS.cardBg, borderRadius: '8px', border: `1px solid ${COLORS.border}`, borderTop: '3px solid #E8401A', display: 'flex', flexDirection: 'column', width: '100%' },
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
