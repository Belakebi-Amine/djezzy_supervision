import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import logoDjezzy from '../assets/Djezzy_Logo.png';

const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (token) {
            navigate('/engineer-dashboard');
        }
    }, [navigate]);

    const decodeJWT = (token) => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            return JSON.parse(atob(base64));
        } catch (e) {
            return null;
        }
    };

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
            const response = await axios.post('http://127.0.0.1:8000/api/token/', {
                email: email,
                password: password
            });

            if (response.data.access) {
                localStorage.setItem('token', response.data.access);
                localStorage.setItem('access_token', response.data.access);
                localStorage.setItem('refresh_token', response.data.refresh || '');
            }

            const decoded = response.data.access ? decodeJWT(response.data.access) : null;

            let userRole = null;

            if (decoded) {
                userRole = decoded.role || decoded.user_type || decoded.groups?.[0] || decoded.role_name;
            }
            if (!userRole) {
                userRole = response.data.role || response.data.user_type || response.data.user?.role || response.data.user?.role_user;
            }

            if (!userRole && response.data.access) {
                try {
                    const meResp = await axios.get('http://127.0.0.1:8000/api/accounts/me/', {
                        headers: { Authorization: 'Bearer ' + response.data.access }
                    });
                    userRole = meResp.data?.role_user || meResp.data?.role;
                } catch (_) {}
            }

            if (!userRole && decoded) {
                if (decoded.is_superuser) userRole = "Administrateur";
                else userRole = "Agent Call Center";
            }

            const normalizedRole = userRole ? userRole.toString().toLowerCase().trim() : "";

            if (normalizedRole.includes("call center") || normalizedRole.includes("agent")) {
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
            if (err.response && err.response.status === 401) {
                setError("Email ou mot de passe incorrect.");
            } else if (err.response && err.response.status === 400) {
                setError("Email ou mot de passe incorrect.");
            } else {
                setError("Serveur injoignable. Verifie que le backend Django tourne.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.gradientBg}>
                <div style={styles.shapes}>
                    <div style={styles.shape1} />
                    <div style={styles.shape2} />
                    <div style={styles.shape3} />
                </div>
            </div>

            <div style={styles.loginCard}>
                <div style={styles.logoWrapper}>
                    <img src={logoDjezzy} alt="Djezzy Logo" style={styles.logo} />
                </div>

                <h2 style={styles.title}>Bienvenue</h2>
                <p style={styles.subtitle}>Connectez-vous a votre espace</p>

                {error && (
                    <div style={styles.errorBox}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Email</label>
                        <div style={styles.inputWrapper}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" style={styles.inputIcon}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4l-10 8L2 4"/></svg>
                            <input
                                type="email"
                                placeholder="exemple@email.com"
                                style={styles.input}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Mot de passe</label>
                        <div style={styles.inputWrapper}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" style={styles.inputIcon}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                style={styles.input}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                style={styles.eyeButton}
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

                    <button type="submit" style={loading ? { ...styles.button, ...styles.buttonDisabled } : styles.button} disabled={loading}>
                        {loading ? (
                            <span style={styles.buttonContent}>
                                <span style={styles.spinner} />
                                Connexion en cours...
                            </span>
                        ) : (
                            "Se connecter"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#0F172A',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        position: 'relative',
        overflow: 'hidden',
    },
    gradientBg: {
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
    },
    shapes: {
        position: 'absolute',
        inset: 0,
    },
    shape1: {
        position: 'absolute',
        top: '-20%',
        right: '-15%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232, 64, 26, 0.15) 0%, rgba(232, 64, 26, 0) 70%)',
        animation: 'pulse 6s ease-in-out infinite',
    },
    shape2: {
        position: 'absolute',
        bottom: '-10%',
        left: '-10%',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255, 107, 61, 0.1) 0%, rgba(255, 107, 61, 0) 70%)',
        animation: 'pulse 8s ease-in-out infinite 2s',
    },
    shape3: {
        position: 'absolute',
        top: '40%',
        left: '50%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, rgba(168, 85, 247, 0) 70%)',
        animation: 'pulse 10s ease-in-out infinite 4s',
    },
    loginCard: {
        width: '420px',
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '40px 36px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 1,
        animation: 'fadeUp 0.6s ease-out',
    },
    logoWrapper: {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '32px',
    },
    logo: {
        width: '100px',
        height: 'auto',
        objectFit: 'contain',
        display: 'block',
    },
    title: {
        color: '#FFFFFF',
        textAlign: 'center',
        fontSize: '26px',
        fontWeight: 700,
        margin: '0 0 6px 0',
        letterSpacing: '-0.5px',
    },
    subtitle: {
        color: '#64748B',
        textAlign: 'center',
        fontSize: '14px',
        margin: '0 0 28px 0',
    },
    errorBox: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        color: '#FCA5A5',
        padding: '12px 14px',
        borderRadius: '10px',
        fontSize: '13px',
        marginBottom: '20px',
        animation: 'shake 0.4s ease-in-out',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        color: '#94A3B8',
        fontSize: '13px',
        fontWeight: 500,
    },
    inputWrapper: {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        borderRadius: '12px',
        border: '1px solid #334155',
        padding: '0 14px',
        transition: 'all 0.2s ease',
    },
    inputIcon: {
        flexShrink: 0,
        marginRight: '12px',
    },
    input: {
        flex: 1,
        padding: '14px 0',
        border: 'none',
        backgroundColor: 'transparent',
        fontSize: '14px',
        color: '#F1F5F9',
        outline: 'none',
        fontFamily: 'inherit',
    },
    eyeButton: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
    },
    button: {
        backgroundColor: '#E8401A',
        color: '#FFFFFF',
        border: 'none',
        padding: '14px 20px',
        borderRadius: '12px',
        fontSize: '15px',
        fontWeight: 600,
        cursor: 'pointer',
        marginTop: '4px',
        transition: 'all 0.2s ease',
        fontFamily: 'inherit',
    },
    buttonDisabled: {
        backgroundColor: '#334155',
        cursor: 'not-allowed',
        opacity: 0.7,
    },
    buttonContent: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
    },
    spinner: {
        width: '18px',
        height: '18px',
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#FFFFFF',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
    },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 0.5; }
        50% { transform: scale(1.1); opacity: 0.8; }
    }
    @keyframes fadeUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-4px); }
        40% { transform: translateX(4px); }
        60% { transform: translateX(-3px); }
        80% { transform: translateX(3px); }
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(styleSheet);

export default Login;
