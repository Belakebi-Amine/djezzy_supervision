/*
 * Profile.jsx
 * User profile page for the Djezzy Supervision platform.
 * Displays the logged-in user's info (name, email, role, code) and allows
 * them to edit their personal details or change their password.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logoDjezzy from '../assets/Djezzy_Logo.png';

/* ── Theme colour tokens resolved from CSS variables ── */
const C = {
  sidebarBg: 'var(--bg-sidebar)', mainBg: 'var(--bg-main)', cardBg: 'var(--bg-card)',
  textDark: 'var(--text-primary)', textMuted: 'var(--text-muted)', border: 'var(--border-color)',
};

/* ── Shared SVG icon props & reusable icon components ── */
const iconProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IconBack = (p) => <svg {...iconProps} {...p}><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>;
const IconLogout = (p) => <svg {...iconProps} {...p}><path d="M15 16l4-4-4-4"/><path d="M19 12H8"/><path d="M12 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6"/></svg>;
const IconEdit = (p) => <svg {...iconProps} {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconLock = (p) => <svg {...iconProps} {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IconCheck = (p) => <svg {...iconProps} {...p}><path d="M4 12l5 5 11-11"/></svg>;
const IconX = (p) => <svg {...iconProps} {...p}><path d="M18 6L6 18M6 6l12 12"/></svg>;
const IconUser = (p) => <svg {...iconProps} {...p}><circle cx="12" cy="8" r="3.2"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/></svg>;
const IconShield = (p) => <svg {...iconProps} {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IconMail = (p) => <svg {...iconProps} {...p}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const IconHash = (p) => <svg {...iconProps} {...p}><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>;

/* ── Display labels for each user role ── */
const ROLE_LABELS = {
  ADMIN: 'Administrateur', INGENIEUR_RESEAUX: 'Ingenieur Reseaux',
  AGENT_CALL_CENTER: 'Agent Call Center', RESPONSABLE_REPORTING: 'Responsable Reporting',
  SUPERVISEUR: 'Superviseur',
};
/* ── Maps each role to its default dashboard route ── */
const ROLE_DASHBOARDS = {
  ADMIN: '/admin-dashboard', INGENIEUR_RESEAUX: '/engineer-dashboard',
  AGENT_CALL_CENTER: '/call-center-dashboard', RESPONSABLE_REPORTING: '/supervisor-dashboard',
  SUPERVISEUR: '/supervisor-dashboard',
};

/*
 * getDecodedRole – reads the JWT from localStorage and extracts the user's
 * role without needing a backend call. Returns null if the token is missing
 * or malformed.
 */
const getDecodedRole = () => {
  try {
    const token = sessionStorage.getItem('access_token');
    if (!token) return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64));
    return decoded?.role || decoded?.role_user || null;
  } catch { return null; }
};

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';

/* Helper that returns the standard auth headers for every API request */
const getHeaders = () => {
  const token = sessionStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' };
};

/* Djezzy brand colour constants used throughout the page */
const DJEZZY_GRADIENT = 'linear-gradient(135deg, #710820 0%, #9a0c2d 30%, #E8401A 70%, #f46d49 100%)';
const DJEZZY_ROLE_BG = '#FEE2E2';
const DJEZZY_ROLE_TEXT = '#DC2626';

export default function Profile() {
  const navigate = useNavigate();

  /* ── Component state ── */
  const [user, setUser] = useState(null);           // full user object fetched from the API
  const [editMode, setEditMode] = useState(false);   // toggles between read-only and edit form
  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '' }); // editable fields
  const [passwordData, setPasswordData] = useState({ ancien_mot_de_passe: '', nouveau_mot_de_passe: '', confirm: '' }); // password change form
  const [showPasswordForm, setShowPasswordForm] = useState(false); // toggles the password change form
  const [message, setMessage] = useState({ type: '', text: '' });  // success / error feedback banner
  const [saving, setSaving] = useState(false);       // disables buttons while an API call is in progress

  /* Derive the current user's role from the JWT and determine which dashboard to link back to */
  const userRole = getDecodedRole();
  const dashboardPath = ROLE_DASHBOARDS[userRole] || '/engineer-dashboard';

  /* ── Fetch the current user's profile on mount ── */
  useEffect(() => {
    const token = sessionStorage.getItem('access_token');
    if (!token) { navigate('/login'); return; }
    fetch(`${API_URL}/accounts/me/`, { method: 'GET', headers: getHeaders() })
      .then((res) => { if (!res.ok) throw new Error('Non autorise'); return res.json(); })
      .then((data) => { setUser(data); setFormData({ first_name: data.first_name || '', last_name: data.last_name || '', email: data.email || '' }); })
      .catch(() => setMessage({ type: 'error', text: 'Impossible de charger le profil. Vérifiez votre connexion.' }));
  }, [navigate]);

  /* Clear all auth tokens from localStorage and redirect to the login page */
  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login');
  };

  /* Toggle between read-only view and the inline edit form; resets fields if cancelling */
  const handleEditToggle = () => {
    if (editMode) setFormData({ first_name: user?.first_name || '', last_name: user?.last_name || '', email: user?.email || '' });
    setEditMode(!editMode);
    setMessage({ type: '', text: '' });
  };

  /* Send the updated profile fields to the backend and update local state on success */
  const handleSaveProfile = async () => {
    setSaving(true); setMessage({ type: '', text: '' });
    try {
      const res = await fetch(`${API_URL}/accounts/update-profile/`, {
        method: 'PUT', headers: getHeaders(),
        body: JSON.stringify({ first_name: formData.first_name, last_name: formData.last_name, email: formData.email }),
      });
      const data = await res.json();
      if (res.ok) { setUser(data.user); setEditMode(false); setMessage({ type: 'success', text: 'Profil mis a jour avec succes.' }); }
      else { setMessage({ type: 'error', text: Object.values(data).flat().join(', ') || 'Erreur lors de la mise a jour.' }); }
    } catch { setMessage({ type: 'error', text: 'Erreur de connexion au serveur.' }); }
    finally { setSaving(false); }
  };

  /* Validate inputs then send a password change request to the backend */
  const handleChangePassword = async () => {
    if (passwordData.nouveau_mot_de_passe !== passwordData.confirm) { setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas.' }); return; }
    if (passwordData.nouveau_mot_de_passe.length < 8) { setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 8 caracteres.' }); return; }
    setSaving(true); setMessage({ type: '', text: '' });
    try {
      const res = await fetch(`${API_URL}/accounts/change-password/`, {
        method: 'PUT', headers: getHeaders(),
        body: JSON.stringify({ ancien_mot_de_passe: passwordData.ancien_mot_de_passe, nouveau_mot_de_passe: passwordData.nouveau_mot_de_passe }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Mot de passe modifie avec succes.' });
        setPasswordData({ ancien_mot_de_passe: '', nouveau_mot_de_passe: '', confirm: '' });
        setShowPasswordForm(false);
      } else { setMessage({ type: 'error', text: Object.values(data).flat().join(', ') || 'Erreur lors du changement.' }); }
    } catch { setMessage({ type: 'error', text: 'Erreur de connexion au serveur.' }); }
    finally { setSaving(false); }
  };

  /* ── Derived display values ── */
  const roleLabel = ROLE_LABELS[user?.role] || user?.role_user || user?.role || 'Agent Call Center';
  const nomUtilisateur = user?.nom_user || user?.code_user || 'Utilisateur';
  /* Generate up to 2 initials from the user's name for the avatar circle */
  const initials = nomUtilisateur.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    /* ── Main layout: sidebar + content area ── */
    <div style={s.app}>
      {/* ── Left sidebar with navigation ── */}
      <aside style={s.side}>
        <div style={s.brand}><img src={logoDjezzy} alt="" style={s.logoImg} /><div><div style={s.brandName}>Djezzy Hub</div><div style={s.brandRole}>Mon Profil</div></div></div>
        <div style={s.menu}>
          <span style={s.sl}>NAVIGATION</span>
          <button className="side-btn" style={s.mi} onClick={() => navigate(dashboardPath)}><IconBack style={{ marginRight: 10 }} /> Retour</button>
        </div>
        <div style={{ ...s.menu, marginTop: 'auto' }}>
          <span style={s.sl}>COMPTE</span>
          <button className="side-btn" style={{ ...s.mi, ...s.mia }}><IconUser style={{ marginRight: 10 }} /> Profil</button>
          <button className="side-btn" style={s.mi} onClick={handleLogout}><IconLogout style={{ marginRight: 10 }} /> Déconnexion</button>
        </div>
      </aside>

      {/* ── Right: main content area ── */}
      <div style={s.main}>
        {/* Top header bar with page title and today's date */}
        <header style={s.head}>
          <h1 style={s.title}>Mon Profil</h1>
          <span style={s.date}>{new Date().toLocaleDateString('fr', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </header>

        {/* Scrollable page content */}
        <div style={s.content}>
          {/* Success or error feedback banner */}
          {message.text && (
            <div className="fade-in" style={message.type === 'success' ? s.msgSuccess : s.msgError}>{message.text}</div>
          )}

          {/* ── Avatar hero ── */}
          <div className="fade-in" style={s.heroCard}>
            {/* Djezzy gradient banner behind the avatar */}
            <div style={{ height: 70, background: DJEZZY_GRADIENT }} />
            <div style={s.heroContent}>
              {/* Initials avatar badge */}
              <div style={s.avatar}>{initials}</div>
              <div style={s.heroInfo}>
                <h2 style={s.heroName}>{nomUtilisateur}</h2>
                {/* Role and employee code badges */}
                <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ ...s.badge, background: DJEZZY_ROLE_BG, color: DJEZZY_ROLE_TEXT }}><IconShield style={{ width: 12, height: 12, marginRight: 4 }} />{roleLabel}</span>
                  {user?.code_user && <span style={{ ...s.badge, background: 'var(--bg-toolbar)', color: 'var(--text-muted3)' }}><IconHash style={{ width: 12, height: 12, marginRight: 4 }} />{user.code_user}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Two-column grid: personal info on the left, password on the right */}
          <div style={s.grid}>
            {/* ── Left: Info card ── */}
            <div className="fade-in" style={{ ...s.card, animationDelay: '0.05s' }}>
              <div style={s.cardHeader}>
                <IconUser style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
                <span style={s.cardTitle}>Informations personnelles</span>
                {/* Show the edit button only in read-only mode */}
                {!editMode && (
                  <button onClick={handleEditToggle} style={s.editBtn}><IconEdit style={{ width: 13, height: 13 }} /> Modifier</button>
                )}
              </div>

              {/* Read-only view: displays each field as a labelled row */}
              {!editMode ? (
                <div style={s.cardBody}>
                  {[
                    { icon: <IconHash />, label: 'Code', value: user?.code_user || '—' },
                    { icon: <IconUser />, label: 'Nom complet', value: nomUtilisateur },
                    { icon: <IconMail />, label: 'Email', value: user?.email || '—' },
                    { icon: <IconShield />, label: 'Role', value: roleLabel },
                  ].map((row) => (
                    <div key={row.label} style={s.infoRow}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'var(--text-muted2)', display: 'flex' }}>{row.icon}</span>
                        <span style={s.infoLabel}>{row.label}</span>
                      </div>
                      <span style={s.infoValue}>{row.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                /* Edit mode: inline form with editable first name, last name, and email */
                <div style={s.cardBody}>
                  <div style={s.fieldGrid}>
                    <div style={s.field}>
                      <label style={s.fieldLabel}>Prenom</label>
                      <input style={s.input} value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
                    </div>
                    <div style={s.field}>
                      <label style={s.fieldLabel}>Nom</label>
                      <input style={s.input} value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
                    </div>
                  </div>
                  <div style={s.field}>
                    <label style={s.fieldLabel}>Email</label>
                    <input style={s.input} type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  {/* Read-only fields: code and role cannot be changed by the user */}
                  <div style={s.readOnly}>
                    <div style={s.roRow}><span style={s.fieldLabel}>Code</span><span style={s.roVal}>{user?.code_user}</span></div>
                    <div style={s.roRow}><span style={s.fieldLabel}>Role</span><span style={s.roVal}>{roleLabel}</span></div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <button onClick={handleSaveProfile} disabled={saving} style={saving ? { ...s.btn, opacity: 0.6 } : s.btn}>
                      <IconCheck style={{ width: 14, height: 14 }} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                    <button onClick={handleEditToggle} style={s.btnGhost}><IconX style={{ width: 14, height: 14 }} /> Annuler</button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: Password card ── */}
            <div className="fade-in" style={{ ...s.card, animationDelay: '0.1s' }}>
              <div style={s.cardHeader}>
                <IconLock style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
                <span style={s.cardTitle}>Mot de passe</span>
                {/* Only show the "Change" button when the password form is hidden */}
                {!showPasswordForm && (
                  <button onClick={() => { setShowPasswordForm(true); setMessage({ type: '', text: '' }); }} style={s.editBtn}><IconLock style={{ width: 13, height: 13 }} /> Changer</button>
                )}
              </div>

              {/* Default state: shows a placeholder indicating the password is secured */}
              {!showPasswordForm ? (
                <div style={{ ...s.cardBody, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120, color: 'var(--text-muted2)', fontSize: 12, flexDirection: 'column', gap: 8 }}>
                  <IconLock style={{ width: 28, height: 28, color: 'var(--text-muted2)', opacity: 0.4 }} />
                  <span>Votre mot de passe est securise</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted3)' }}>Derniere modification inconnue</span>
                </div>
              ) : (
                /* Password change form: current password, new password, and confirmation */
                <div style={s.cardBody}>
                  <div style={s.field}>
                    <label style={s.fieldLabel}>Mot de passe actuel</label>
                    <input style={s.input} type="password" value={passwordData.ancien_mot_de_passe} onChange={(e) => setPasswordData({ ...passwordData, ancien_mot_de_passe: e.target.value })} />
                  </div>
                  <div style={s.fieldGrid}>
                    <div style={s.field}>
                      <label style={s.fieldLabel}>Nouveau mot de passe</label>
                      <input style={s.input} type="password" value={passwordData.nouveau_mot_de_passe} onChange={(e) => setPasswordData({ ...passwordData, nouveau_mot_de_passe: e.target.value })} />
                    </div>
                    <div style={s.field}>
                      <label style={s.fieldLabel}>Confirmer</label>
                      <input style={s.input} type="password" value={passwordData.confirm} onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <button onClick={handleChangePassword} disabled={saving} style={saving ? { ...s.btn, opacity: 0.6 } : s.btn}>
                      <IconCheck style={{ width: 14, height: 14 }} /> {saving ? 'Modification...' : 'Modifier'}
                    </button>
                    <button onClick={() => { setShowPasswordForm(false); setPasswordData({ ancien_mot_de_passe: '', nouveau_mot_de_passe: '', confirm: '' }); }} style={s.btnGhost}><IconX style={{ width: 14, height: 14 }} /> Annuler</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Inline styles object (kept at the bottom to avoid cluttering the component logic) ── */
const s = {
  app: { display: 'flex', height: '100vh', fontFamily: "'Inter', system-ui, sans-serif", width: '100%' },
  side: { width: 193, background: C.sidebarBg, color: 'var(--text-sidebar)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' },
  brand: { height: 82, display: 'flex', alignItems: 'center', gap: 13, padding: '0 17px', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  logoImg: { width: 34, height: 'auto', objectFit: 'contain' },
  brandName: { color: '#fff', fontWeight: 700, fontSize: 16 },
  brandRole: { marginTop: 6, fontSize: 10, color: 'var(--text-sidebar)' },
  menu: { display: 'flex', flexDirection: 'column', gap: 5, padding: '26px 12px 0' },
  sl: { margin: '0 5px 10px', fontSize: 6, fontWeight: 700, color: 'var(--text-muted3)', letterSpacing: 1 },
  mi: { display: 'flex', alignItems: 'center', gap: 9, background: 'transparent', border: 'none', color: 'var(--text-sidebar)', padding: '0 10px', borderRadius: 6, cursor: 'pointer', textAlign: 'left', fontSize: 13, width: '100%', height: 34, textDecoration: 'none', outline: 'none' },
  mia: { background: 'linear-gradient(90deg, #9a0c2d, #710820)', color: '#fff', fontWeight: 600 },
  main: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: C.mainBg },
  head: { height: 50, display: 'flex', alignItems: 'center', padding: '0 27px', borderBottom: `1px solid ${C.border}`, background: C.cardBg, flexShrink: 0 },
  title: { margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' },
  date: { marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted2)', fontWeight: 500, padding: '4px 10px', background: 'var(--bg-toolbar)', borderRadius: 4 },
  content: { flex: 1, overflowY: 'auto', padding: '20px 27px 40px' },

  msgSuccess: { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#065f46', padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, marginBottom: 16 },
  msgError: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#991b1b', padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, marginBottom: 16 },

  heroCard: { background: C.cardBg, borderRadius: 10, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  heroContent: { display: 'flex', alignItems: 'center', gap: 20, padding: '0 24px 20px', marginTop: -30 },
  avatar: { width: 64, height: 64, borderRadius: 16, background: '#1a1a2e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, border: '3px solid ' + C.cardBg, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', flexShrink: 0, letterSpacing: 1 },
  heroInfo: { paddingTop: 30 },
  heroName: { margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' },
  badge: { display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700 },

  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },

  card: { background: C.cardBg, borderRadius: 10, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderBottom: `1px solid ${C.border}`, background: 'var(--bg-hover)' },
  cardTitle: { fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 0.3, flex: 1 },
  cardBody: { padding: '16px 18px' },

  editBtn: { display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-card)', border: `1px solid ${C.border}`, borderRadius: 5, padding: '4px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'inherit', transition: 'all 0.15s', marginLeft: 'auto' },

  infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid var(--border-color)` },
  infoLabel: { fontSize: 12, color: 'var(--text-muted2)', fontWeight: 500 },
  infoValue: { fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 },

  fieldGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  field: { marginBottom: 12 },
  fieldLabel: { display: 'block', fontSize: 10, color: 'var(--text-muted3)', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: { width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: 'var(--bg-card)', color: 'var(--text-primary)', transition: 'border-color 0.15s' },

  readOnly: { background: 'var(--bg-toolbar)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 },
  roRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0' },
  roVal: { fontSize: 12, color: 'var(--text-muted3)', fontWeight: 600 },

  btn: { display: 'flex', alignItems: 'center', gap: 6, background: '#E8401A', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' },
  btnGhost: { display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', color: 'var(--text-muted3)', border: `1px solid ${C.border}`, padding: '8px 18px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' },
};
