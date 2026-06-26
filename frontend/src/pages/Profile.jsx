import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logoDjezzy from '../assets/Djezzy_Logo.png';

const THEME = {
  sidebarBg: '#11101f',
  sidebarActive: '#850a27',
  djezzyRed: '#E8401A',
  djezzyOrange: '#FF6B3D',
  cardBg: '#FFFFFF',
  mainBg: '#f5f6fa',
  textDark: '#1c212b',
  textMuted: '#818898',
  border: '#d8dde5',
};

const API_URL = 'http://127.0.0.1:8000/api';

const getHeaders = () => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

const ROLE_LABELS = {
  ADMIN: 'Administrateur',
  INGENIEUR_RESEAUX: 'Ingenieur Reseaux',
  AGENT_CALL_CENTER: 'Agent Call Center',
  RESPONSABLE_REPORTING: 'Responsable Reporting',
  SUPERVISEUR: 'Superviseur',
};

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '' });
  const [passwordData, setPasswordData] = useState({ ancien_mot_de_passe: '', nouveau_mot_de_passe: '', confirm: '' });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetch(`${API_URL}/accounts/me/`, { method: 'GET', headers: getHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error('Non autorise');
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setFormData({ first_name: data.first_name || '', last_name: data.last_name || '', email: data.email || '' });
      })
      .catch(() => navigate('/login'));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  const handleEditToggle = () => {
    if (editMode) {
      setFormData({ first_name: user?.first_name || '', last_name: user?.last_name || '', email: user?.email || '' });
    }
    setEditMode(!editMode);
    setMessage({ type: '', text: '' });
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch(`${API_URL}/accounts/update-profile/`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setEditMode(false);
        setMessage({ type: 'success', text: 'Profil mis a jour avec succes.' });
      } else {
        const errMsg = Object.values(data).flat().join(', ') || 'Erreur lors de la mise a jour.';
        setMessage({ type: 'error', text: errMsg });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.nouveau_mot_de_passe !== passwordData.confirm) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    if (passwordData.nouveau_mot_de_passe.length < 8) {
      setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 8 caracteres.' });
      return;
    }
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch(`${API_URL}/accounts/change-password/`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          ancien_mot_de_passe: passwordData.ancien_mot_de_passe,
          nouveau_mot_de_passe: passwordData.nouveau_mot_de_passe,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Mot de passe modifie avec succes.' });
        setPasswordData({ ancien_mot_de_passe: '', nouveau_mot_de_passe: '', confirm: '' });
        setShowPasswordForm(false);
      } else {
        const errMsg = Object.values(data).flat().join(', ') || 'Erreur lors du changement.';
        setMessage({ type: 'error', text: errMsg });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur.' });
    } finally {
      setSaving(false);
    }
  };

  const roleLabel = ROLE_LABELS[user?.role] || user?.role_user || user?.role || 'Agent Call Center';
  const nomUtilisateur = user?.nom_user || user?.code_user || 'Utilisateur';

  return (
    <div style={{ ...styles.appLayout, backgroundColor: THEME.mainBg }}>
      <aside style={styles.sidebar}>
        <div style={styles.brandZone}>
          <img src={logoDjezzy} alt="Djezzy" style={styles.brandLogo} />
          <div>
            <div style={styles.brandName}>Djezzy</div>
            <div style={styles.brandRole}>Mon Profil</div>
          </div>
        </div>

        <div style={styles.menuSection}>
          <span style={styles.sectionLabel}>NAVIGATION</span>
          <button style={styles.menuItem} onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ marginRight: '10px', flexShrink: 0 }}><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Retour
          </button>
          <button style={styles.menuItem} onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ marginRight: '10px', flexShrink: 0 }}><path d="M15 16l4-4-4-4"/><path d="M19 12H8"/><path d="M12 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6"/></svg>
            Deconnexion
          </button>
        </div>

      </aside>

      <div style={{ ...styles.mainContent, backgroundColor: THEME.mainBg }}>
        <header style={styles.topHeader}>
          <h1 style={{ ...styles.pageTitle, color: '#1c212b' }}>Mon Profil</h1>
        </header>

        {message.text && (
          <div style={message.type === 'success' ? styles.successBox : styles.errorBox}>
            {message.text}
          </div>
        )}

        <div style={{ ...styles.profileCard, backgroundColor: THEME.cardBg, border: `1px solid ${THEME.border}` }}>
          <div style={{ ...styles.avatarSection, borderBottom: `1px solid ${THEME.border}` }}>
            <div style={styles.avatar}>{nomUtilisateur.charAt(0).toUpperCase()}</div>
            <div>
              <h2 style={{ ...styles.userName, color: THEME.textDark }}>{nomUtilisateur}</h2>
              <span style={styles.roleBadge}>{roleLabel}</span>
              <span style={styles.codeBadge}>{user?.code_user}</span>
            </div>
          </div>

          {!editMode ? (
            <div style={styles.infoSection}>
              <div style={styles.sectionHeader}>
                <h3 style={{ ...styles.sectionTitle, color: THEME.textMuted }}>Informations personnelles</h3>
                <button style={styles.editButton} onClick={handleEditToggle}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Modifier
                </button>
              </div>
              {[
                ['Code utilisateur', user?.code_user || '—'],
                ['Nom complet', nomUtilisateur],
                ['Email', user?.email || '—'],
                ['Role', roleLabel],
              ].map(([label, value]) => (
                <div key={label} style={{ ...styles.infoRow, borderBottom: `1px solid ${THEME.border}` }}>
                  <span style={styles.infoLabel}>{label}</span>
                  <span style={{ fontSize: '13px', color: '#1c212b', fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.editSection}>
              <div style={styles.sectionHeader}>
                <h3 style={{ ...styles.sectionTitle, color: THEME.textMuted }}>Modifier mes informations</h3>
                <button style={styles.cancelButton} onClick={handleEditToggle}>Annuler</button>
              </div>

              <div style={styles.editGrid}>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Prenom</label>
                  <input
                    style={{ ...styles.fieldInput, backgroundColor: THEME.inputBg, color: '#1c212b', border: `1px solid ${THEME.border}` }}
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Nom</label>
                  <input
                    style={{ ...styles.fieldInput, backgroundColor: THEME.inputBg, color: '#1c212b', border: `1px solid ${THEME.border}` }}
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>Email</label>
                <input
                  style={styles.fieldInput}
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div style={styles.readOnlyFields}>
                <div style={styles.readOnlyRow}>
                  <span style={styles.fieldLabel}>Code utilisateur</span>
                  <span style={styles.readOnlyValue}>{user?.code_user}</span>
                </div>
                <div style={styles.readOnlyRow}>
                  <span style={styles.fieldLabel}>Role</span>
                  <span style={styles.readOnlyValue}>{roleLabel}</span>
                </div>
              </div>

              <button
                style={saving ? { ...styles.saveButton, ...styles.saveButtonDisabled } : styles.saveButton}
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          )}

          <div style={{ ...styles.divider, backgroundColor: THEME.border }} />

          <div style={styles.passwordSection}>
            <div style={styles.sectionHeader}>
              <h3 style={{ ...styles.sectionTitle, color: THEME.textMuted }}>Mot de passe</h3>
              {!showPasswordForm && (
                <button style={styles.editButton} onClick={() => { setShowPasswordForm(true); setMessage({ type: '', text: '' }); }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Changer
                </button>
              )}
            </div>

            {showPasswordForm && (
              <div style={styles.passwordForm}>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Mot de passe actuel</label>
                  <input
                    style={{ ...styles.fieldInput, backgroundColor: THEME.inputBg, color: '#1c212b', border: `1px solid ${THEME.border}` }}
                    type="password"
                    value={passwordData.ancien_mot_de_passe}
                    onChange={(e) => setPasswordData({ ...passwordData, ancien_mot_de_passe: e.target.value })}
                  />
                </div>
                <div style={styles.editGrid}>
                  <div style={styles.fieldGroup}>
                    <label style={styles.fieldLabel}>Nouveau mot de passe</label>
                    <input
                      style={{ ...styles.fieldInput, backgroundColor: THEME.inputBg, color: '#1c212b', border: `1px solid ${THEME.border}` }}
                      type="password"
                      value={passwordData.nouveau_mot_de_passe}
                      onChange={(e) => setPasswordData({ ...passwordData, nouveau_mot_de_passe: e.target.value })}
                    />
                  </div>
                  <div style={styles.fieldGroup}>
                    <label style={styles.fieldLabel}>Confirmer</label>
                    <input
                      style={{ ...styles.fieldInput, backgroundColor: THEME.inputBg, color: '#1c212b', border: `1px solid ${THEME.border}` }}
                      type="password"
                      value={passwordData.confirm}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                    />
                  </div>
                </div>
                <div style={styles.passwordActions}>
                  <button
                    style={saving ? { ...styles.saveButton, ...styles.saveButtonDisabled } : styles.saveButton}
                    onClick={handleChangePassword}
                    disabled={saving}
                  >
                    {saving ? 'Modification...' : 'Modifier le mot de passe'}
                  </button>
                  <button
                    style={styles.cancelPasswordButton}
                    onClick={() => { setShowPasswordForm(false); setPasswordData({ ancien_mot_de_passe: '', nouveau_mot_de_passe: '', confirm: '' }); }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  appLayout: { display: 'flex', minHeight: '100vh', backgroundColor: THEME.mainBg, fontFamily: "'Inter', system-ui, sans-serif" },
  sidebar: { width: '193px', backgroundColor: THEME.sidebarBg, color: '#94A3B8', display: 'flex', flexDirection: 'column', padding: '0', flexShrink: 0 },
  brandZone: { height: '82px', display: 'flex', alignItems: 'center', gap: '13px', padding: '0 17px', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  brandLogo: { width: '34px', height: 'auto', objectFit: 'contain' },
  brandName: { color: '#FFFFFF', fontWeight: 700, fontSize: '16px' },
  brandRole: { marginTop: '6px', fontSize: '10px', color: '#9492a0' },
  menuSection: { display: 'flex', flexDirection: 'column', gap: '5px', padding: '26px 12px 0' },
  sectionLabel: { margin: '0 5px 10px', fontSize: '6px', fontWeight: 700, color: '#4e4b5c', letterSpacing: '1px' },
  menuItem: { display: 'flex', alignItems: 'center', background: 'transparent', border: 'none', color: '#92909e', padding: '0 10px', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', fontSize: '13px', width: '100%', height: '34px', textDecoration: 'none', outline: 'none' },
  mainContent: { flex: 1, padding: '30px 40px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', maxWidth: '800px' },
  topHeader: { marginBottom: '24px' },
  pageTitle: { margin: 0, fontSize: '14px', fontWeight: 700, color: THEME.textDark },

  successBox: { backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--textDark, #166534)', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', marginBottom: '20px' },
  errorBox: { backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--textDark, #991B1B)', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', marginBottom: '20px' },

  profileCard: { backgroundColor: THEME.cardBg, borderRadius: '7px', border: `1px solid ${THEME.border}`, padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' },
  avatarSection: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px', paddingBottom: '24px', borderBottom: `1px solid ${THEME.border}` },
  avatar: { width: '64px', height: '64px', borderRadius: '50%', backgroundColor: THEME.djezzyRed, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, flexShrink: 0 },
  userName: { margin: 0, fontSize: '20px', fontWeight: 700, color: THEME.textDark },
  roleBadge: { display: 'inline-block', backgroundColor: '#FEF3C7', color: '#D97706', padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, marginTop: '4px', marginRight: '6px' },
  codeBadge: { display: 'inline-block', backgroundColor: '#DBEAFE', color: '#2563EB', padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, marginTop: '4px' },

  infoSection: {},
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  sectionTitle: { fontSize: '13px', fontWeight: 700, color: THEME.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 },
  editButton: { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'transparent', border: `1px solid var(--border, #d8dde5)`, color: THEME.textMuted, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, transition: 'all 0.15s' },
  cancelButton: { backgroundColor: 'transparent', border: 'none', color: '#94A3B8', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' },

  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${THEME.border}` },
  infoLabel: { fontSize: '12px', color: 'var(--textMuted, #818898)', fontWeight: 500 },
  infoValue: { fontSize: '13px', color: 'var(--textDark, #1c212b)', fontWeight: 600 },
  infoValueMuted: { fontSize: '13px', color: 'var(--textMuted, #94A3B8)', fontWeight: 600 },

  editSection: {},
  editGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  fieldGroup: { marginBottom: '16px' },
  fieldLabel: { display: 'block', fontSize: '11px', color: 'var(--textMuted, #818898)', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.3px' },
  fieldInput: { width: '100%', padding: '10px 14px', borderRadius: '6px', border: `1px solid ${THEME.border}`, backgroundColor: 'var(--inputBg, #FFFFFF)', fontSize: '13px', color: 'var(--textDark, #1c212b)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },

  readOnlyFields: { backgroundColor: 'var(--inputBg, #F8FAFC)', borderRadius: '8px', padding: '14px 16px', marginBottom: '20px' },
  readOnlyRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0' },
  readOnlyValue: { fontSize: '13px', color: 'var(--textMuted, #94A3B8)', fontWeight: 600 },

  saveButton: { backgroundColor: THEME.djezzyRed, color: '#FFFFFF', border: 'none', padding: '10px 24px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' },
  saveButtonDisabled: { backgroundColor: '#CBD5E1', cursor: 'not-allowed' },

  divider: { height: '1px', backgroundColor: THEME.border, margin: '28px 0' },

  passwordSection: {},
  passwordForm: {},
  passwordActions: { display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' },
  cancelPasswordButton: { backgroundColor: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '13px', padding: '8px 12px' },
};
