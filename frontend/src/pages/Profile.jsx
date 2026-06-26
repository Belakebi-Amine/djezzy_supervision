import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logoDjezzy from '../assets/Djezzy_Logo.png';

const COLORS = {
  sidebarBg: '#0A1628',
  djezzyRed: '#E8401A',
  djezzyOrange: '#FF6B3D',
  cardBg: '#FFFFFF',
  mainBg: '#F4F5F7',
  textDark: '#0A1628',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

const API_URL = 'http://127.0.0.1:8000/api';

const getHeaders = () => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetch(`${API_URL}/accounts/me/`, { method: 'GET', headers: getHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error('Non autorisé');
        return res.json();
      })
      .then((data) => setUser(data))
      .catch(() => navigate('/login'));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  const roleLabel = user?.role_user || user?.role || 'Agent Call Center';
  const nomUtilisateur = user?.nom_user || user?.username || 'Utilisateur';

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div style={styles.brandZone}>
          <img src={logoDjezzy} alt="Djezzy" style={styles.logoImg} />
          <div>
            <div style={styles.brandName}>Djezzy</div>
            <div style={styles.brandRole}>Mon Profil</div>
          </div>
        </div>
        <div style={{ ...styles.menuSection, marginTop: 'auto' }}>
          <span style={styles.sectionLabel}>NAVIGATION</span>
          <button style={styles.menuItem} onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ marginRight: '10px' }}><path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 6v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-6V7Z" /><path d="M10 6v2M10 16v2" /></svg>
            Retour aux tickets
          </button>
          <button style={styles.menuItem} onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ marginRight: '10px' }}><path d="M15 16l4-4-4-4" /><path d="M19 12H8" /><path d="M12 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" /></svg>
            Log out
          </button>
        </div>
      </aside>

      <div style={styles.mainContent}>
        <header style={styles.topHeader}>
          <h1 style={styles.pageTitle}>Mon Profil</h1>
        </header>

        <div style={styles.profileCard}>
          <div style={styles.avatarSection}>
            <div style={styles.avatar}>
              {nomUtilisateur.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={styles.userName}>{nomUtilisateur}</h2>
              <span style={styles.roleBadge}>{roleLabel}</span>
            </div>
          </div>

          <div style={styles.infoSection}>
            <h3 style={styles.sectionTitle}>Informations personnelles</h3>
            {[
              ['Nom d\'utilisateur', user?.username || '—'],
              ['Nom complet', user?.nom_user || user?.username || '—'],
              ['Email', user?.email || '—'],
              ['Rôle', roleLabel],
            ].map(([label, value]) => (
              <div key={label} style={styles.infoRow}>
                <span style={styles.infoLabel}>{label}</span>
                <span style={styles.infoValue}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { display: 'flex', minHeight: '100vh', backgroundColor: COLORS.mainBg, fontFamily: "'Inter', system-ui, sans-serif" },
  sidebar: { width: '260px', backgroundColor: COLORS.sidebarBg, color: '#94A3B8', display: 'flex', flexDirection: 'column', padding: '24px 16px', flexShrink: 0 },
  brandZone: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', paddingLeft: '8px' },
  logoImg: { width: '36px', height: 'auto', objectFit: 'contain', borderRadius: '4px' },
  brandName: { color: '#FFFFFF', fontWeight: 700, fontSize: '16px' },
  brandRole: { fontSize: '12px', color: '#64748B' },
  menuSection: { display: 'flex', flexDirection: 'column', gap: '4px' },
  sectionLabel: { fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px', paddingLeft: '12px', letterSpacing: '0.5px' },
  menuItem: { display: 'flex', alignItems: 'center', backgroundColor: 'transparent', border: 'none', color: '#94A3B8', padding: '11px 12px', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', fontSize: '13px', width: '100%' },
  mainContent: { flex: 1, padding: '30px 40px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },
  topHeader: { marginBottom: '30px' },
  pageTitle: { margin: 0, fontSize: '22px', fontWeight: 700, color: COLORS.textDark },
  profileCard: { backgroundColor: COLORS.cardBg, borderRadius: '12px', border: `1px solid ${COLORS.border}`, padding: '30px', maxWidth: '600px' },
  avatarSection: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px', paddingBottom: '20px', borderBottom: `1px solid ${COLORS.border}` },
  avatar: { width: '64px', height: '64px', borderRadius: '50%', backgroundColor: COLORS.djezzyRed, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700 },
  userName: { margin: 0, fontSize: '20px', fontWeight: 700, color: COLORS.textDark },
  roleBadge: { display: 'inline-block', backgroundColor: '#FEF3C7', color: '#D97706', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, marginTop: '4px' },
  infoSection: {},
  sectionTitle: { fontSize: '12px', fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 16px 0' },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${COLORS.border}` },
  infoLabel: { fontSize: '13px', color: COLORS.textMuted },
  infoValue: { fontSize: '13px', color: COLORS.textDark, fontWeight: 600 },
};
