// ========================================================
// Page de connexion - Djezzy Hub
// --------------------------------------------------------
// Gère l'authentification de l'utilisateur :
//   1. Vérifie si un token existe déjà (redirection auto)
//   2. Envoie les identifiants au backend Django
//   3. Décode le JWT pour extraire le rôle
//   4. Redirige vers le tableau de bord correspondant
// ========================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import logoDjezzy from '../assets/Djezzy_Logo.png';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';

const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // --- Injection des animations CSS (nettoyée au démontage) ---
    useEffect(() => {
        const s = document.createElement('style');
        s.textContent = `
            @keyframes loginPulse { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.08);opacity:1} }
            @keyframes loginFadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
            @keyframes loginShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-4px)} 40%{transform:translateX(4px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} }
            @keyframes spin { to{transform:rotate(360deg)} }
            input:focus { border-color:#E8401A !important; box-shadow:0 0 0 3px rgba(232,64,26,.1) !important; }
        `;
        document.head.appendChild(s);
        return () => s.remove();
    }, []);

    // --- Vérification automatique du token au chargement ---
    useEffect(() => {
        const token = sessionStorage.getItem('access_token');
        if (token) {
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const decoded = JSON.parse(atob(base64));
                const r = (decoded?.role || decoded?.role_user || '').toString().toLowerCase();
                if (r.includes('admin')) navigate('/admin-dashboard');
                else if (r.includes('call') || r.includes('agent')) navigate('/call-center-dashboard');
                else if (r.includes('ingenieur') || r.includes('engineer') || r.includes('reseau')) navigate('/engineer-dashboard');
                else if (r.includes('reporting') || r.includes('responsable') || r.includes('supervis')) navigate('/supervisor-dashboard');
                else navigate('/engineer-dashboard');
            } catch { navigate('/engineer-dashboard'); }
        }
    }, [navigate]);

    // --- Décode un token JWT sans vérification côté client ---
    const decodeJWT = (token) => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            return JSON.parse(atob(base64));
        } catch (e) {
            return null;
        }
    };

    // --- Gestion de la soumission du formulaire de connexion ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!email || !password) {
            setError('Veuillez remplir tous les champs.');
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post(`${API_URL}/token/`, {
                email: email,
                password: password
            });

            if (response.data.access) {
                sessionStorage.setItem('access_token', response.data.access);
                sessionStorage.setItem('refresh_token', response.data.refresh || '');
            }

            const decoded = response.data.access ? decodeJWT(response.data.access) : null;

            // --- Extraction du rôle : d'abord dans le JWT, puis dans la réponse, puis via /me/ ---
            let userRole = null;

            if (decoded) {
                userRole = decoded.role || decoded.user_type || decoded.groups?.[0] || decoded.role_name;
            }
            if (!userRole) {
                userRole = response.data.role || response.data.user_type || response.data.user?.role || response.data.user?.role_user;
            }

            if (!userRole && response.data.access) {
                try {
                    const meResp = await axios.get(`${API_URL}/accounts/me/`, {
                        headers: { Authorization: 'Bearer ' + response.data.access }
                    });
                    userRole = meResp.data?.role_user || meResp.data?.role;
                } catch (_) {}
            }

            if (!userRole && decoded) {
                if (decoded.is_superuser) userRole = "Administrateur";
                else userRole = "Agent Call Center";
            }

            // Check if user must change password
            const mustChange = response.data.user?.must_change_password;

            // --- Redirection selon le role normalise ---
            const normalizedRole = userRole ? userRole.toString().toLowerCase().trim() : "";

            if (mustChange) {
                navigate('/profile?force_change=1');
            } else if (normalizedRole.includes("call center") || normalizedRole.includes("agent")) {
                navigate('/call-center-dashboard');
            } else if (normalizedRole.includes("admin")) {
                navigate('/admin-dashboard');
            } else if (normalizedRole.includes("ingenieur") || normalizedRole.includes("engineer") || normalizedRole.includes("reseau")) {
                navigate('/engineer-dashboard');
            } else if (normalizedRole.includes("reporting") || normalizedRole.includes("responsable") || normalizedRole.includes("supervisor") || normalizedRole.includes("superviseur")) {
                navigate('/supervisor-dashboard');
            } else {
                setError(`Role trouve : "${userRole || 'Aucun'}". Ce role n'est pas associe a une redirection.`);
            }

        } catch (err) {
            const msg = err.response?.data?.detail || err.response?.data?.non_field_errors?.[0];
            if (msg) {
                setError(msg);
            } else if (err.response && (err.response.status === 401 || err.response.status === 400)) {
                setError("Email ou mot de passe incorrect.");
            } else {
                setError("Serveur injoignable. Verifie que le backend Django tourne.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={S.container}>
            <div style={S.bgDecor}>
                <div style={S.circle1} />
                <div style={S.circle2} />
                <div style={S.circle3} />
                <div style={S.gridPattern} />
            </div>

            <div style={S.loginCard}>
                <div style={S.topAccent} />

                <div style={S.logoWrapper}>
                    <img src={logoDjezzy} alt="Djezzy" style={S.logo} />
                </div>

                <h2 style={S.title}>Bienvenue</h2>
                <p style={S.subtitle}>Connectez-vous a votre espace de supervision</p>

                {error && (
                    <div style={S.errorBox}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={S.form}>
                    <div style={S.inputGroup}>
                        <label style={S.label}>Email</label>
                        <div style={S.inputWrapper}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" style={S.inputIcon}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4l-10 8L2 4"/></svg>
                            <input
                                type="email"
                                placeholder="exemple@email.com"
                                style={S.input}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div style={S.inputGroup}>
                        <label style={S.label}>Mot de passe</label>
                        <div style={S.inputWrapper}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" style={S.inputIcon}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                style={S.input}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                style={S.eyeButton}
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -6 }}>
                        <button type="button" onClick={() => navigate('/forgot-password')} style={S.forgotLink}>
                            Mot de passe oublie ?
                        </button>
                    </div>

                    <button type="submit" style={loading ? { ...S.button, ...S.buttonDisabled } : S.button} disabled={loading}>
                        {loading ? (
                            <span style={S.buttonContent}>
                                <span style={S.spinner} />
                                Connexion en cours...
                            </span>
                        ) : (
                            "Se connecter"
                        )}
                    </button>
                </form>

                <p style={S.footer}>Djezzy Hub &middot; Plateforme de gestion des reclamations</p>
            </div>
        </div>
    );
};

// --- Styles en ligne du formulaire de connexion ---
const S = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f5f6fa',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        position: 'relative',
        overflow: 'hidden',
    },
    bgDecor: {
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
    },
    circle1: {
        position: 'absolute',
        top: '-15%',
        right: '-10%',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232,64,26,0.06) 0%, transparent 70%)',
        animation: 'loginPulse 8s ease-in-out infinite',
    },
    circle2: {
        position: 'absolute',
        bottom: '-12%',
        left: '-8%',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.05) 0%, transparent 70%)',
        animation: 'loginPulse 10s ease-in-out infinite 3s',
    },
    circle3: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.03) 0%, transparent 70%)',
        animation: 'loginPulse 12s ease-in-out infinite 5s',
    },
    gridPattern: {
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(circle, #d8dde5 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        opacity: 0.3,
    },
    loginCard: {
        width: 420,
        maxWidth: '92vw',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: '0 36px 36px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 1,
        animation: 'loginFadeUp 0.5s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
    },
    topAccent: {
        height: 4,
        background: 'linear-gradient(90deg, #E8401A, #FF6B3D)',
        margin: '0 -36px 32px',
        borderRadius: '0 0 2px 2px',
    },
    logoWrapper: {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: 24,
    },
    logo: {
        width: 120,
        height: 'auto',
        objectFit: 'contain',
    },
    title: {
        color: '#1c212b',
        textAlign: 'center',
        fontSize: 24,
        fontWeight: 700,
        margin: '0 0 4px',
        letterSpacing: '-0.3px',
    },
    subtitle: {
        color: '#818898',
        textAlign: 'center',
        fontSize: 13,
        margin: '0 0 28px',
    },
    errorBox: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#FEF2F2',
        border: '1px solid #FECACA',
        color: '#B91C1C',
        padding: '12px 14px',
        borderRadius: 10,
        fontSize: 13,
        marginBottom: 20,
        animation: 'loginShake 0.4s ease-in-out',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
    },
    label: {
        color: '#475569',
        fontSize: 13,
        fontWeight: 600,
    },
    inputWrapper: {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        padding: '0 14px',
        transition: 'all 0.2s ease',
    },
    inputIcon: {
        flexShrink: 0,
        marginRight: 12,
    },
    input: {
        flex: 1,
        padding: '13px 0',
        border: 'none',
        backgroundColor: 'transparent',
        fontSize: 14,
        color: '#1c212b',
        outline: 'none',
        fontFamily: 'inherit',
    },
    eyeButton: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 4,
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        borderRadius: 6,
        transition: 'background 0.15s ease',
    },
    button: {
        backgroundColor: '#E8401A',
        color: '#ffffff',
        border: 'none',
        padding: '13px 20px',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        marginTop: 4,
        transition: 'all 0.2s ease',
        fontFamily: 'inherit',
        boxShadow: '0 2px 8px rgba(232,64,26,0.25)',
    },
    buttonDisabled: {
        backgroundColor: '#cbd5e1',
        cursor: 'not-allowed',
        boxShadow: 'none',
    },
    buttonContent: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    spinner: {
        width: 18,
        height: 18,
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#ffffff',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        display: 'inline-block',
    },
    footer: {
        textAlign: 'center',
        fontSize: 11,
        color: '#94a3b8',
        marginTop: 28,
        marginBottom: 0,
    },
    forgotLink: {
        background: 'none',
        border: 'none',
        color: '#E8401A',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        padding: 0,
        fontFamily: 'inherit',
    },
};
export default Login;
