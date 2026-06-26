import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import logoDjezzy from '../assets/Djezzy_Logo.png';

const Login = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Fonction sécurisée pour décoder le JWT
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

        if (!username || !password) {
            setError('Veuillez remplir tous les champs.');
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post('http://127.0.0.1:8000/api/token/', {
                username: username,
                password: password
            });

            if (response.data.access) {
                localStorage.setItem('token', response.data.access);
            }

            const decoded = response.data.access ? decodeJWT(response.data.access) : null;
            
            // 🔍 Extraction intelligente du rôle (teste les formats classiques de clés)
            let userRole = null;
            
            if (decoded) {
                userRole = decoded.role || decoded.user_type || decoded.groups?.[0] || decoded.role_name;
            }
            if (!userRole) {
                userRole = response.data.role || response.data.user_type || response.data.user?.role || response.data.user?.role_user;
            }

            // Si pas de rôle dans la réponse du login, on va le chercher via /me/
            if (!userRole && response.data.access) {
                try {
                    const meResp = await axios.get('http://127.0.0.1:8000/api/accounts/me/', {
                        headers: { Authorization: 'Bearer ' + response.data.access }
                    });
                    userRole = meResp.data?.role_user || meResp.data?.role;
                } catch (_) {}
            }

            console.log("Rôle détecté :", userRole);

            // Si Django utilise des booléens à la place d'une chaîne de texte
            if (!userRole && decoded) {
                if (decoded.is_superuser) userRole = "Administrateur";
                else userRole = "Agent Call Center"; // Rôle par défaut si non spécifié
            }

            // ── ROUTAGE ET REDIRECTION ─────────────────────────────────────────
            // Normalisation en minuscules pour éviter les conflits de casse (Majuscules/Minuscules)
            const normalizedRole = userRole ? userRole.toString().toLowerCase().trim() : "";

            if (normalizedRole.includes("call center") || normalizedRole.includes("agent")) {
                navigate('/call-center-dashboard');
            } else if (normalizedRole.includes("admin")) {
                navigate('/admin-dashboard');
            } else if (normalizedRole.includes("ingénieur") || normalizedRole.includes("ingenieur") || normalizedRole.includes("engineer") || normalizedRole.includes("reseau")) {
                navigate('/engineer-dashboard');
            } else if (normalizedRole.includes("reporting") || normalizedRole.includes("responsable") || normalizedRole.includes("supervisor")) {
                navigate('/supervisor-dashboard');
            } else {
                setError(`Rôle trouvé : "${userRole || 'Aucun'}". Ce rôle n'est pas associé à une redirection. Vérifie tes groupes dans l'admin Django.`);
            }

        } catch (err) {
            console.error("Erreur login:", err);
            if (err.response && err.response.status === 401) {
                setError("Nom d'utilisateur ou mot de passe incorrect.");
            } else {
                setError("Serveur injoignable. Vérifie que ton backend Django tourne.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.loginCard}>
                <div style={styles.logoWrapper}>
                    <img src={logoDjezzy} alt="Djezzy Logo" style={styles.logo} />
                </div>

                <h2 style={styles.title}>Log In</h2>

                {error && (
                    <div style={styles.errorBox}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Nom d'utilisateur :</label>
                        <input 
                            type="text" 
                            placeholder="Nom d'utilisateur" 
                            style={styles.input}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Mot de passe :</label>
                        <input 
                            type="password" 
                            placeholder="••••••••" 
                            style={styles.input}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button type="submit" style={styles.button} disabled={loading}>
                        {loading ? 'Connexion...' : 'Log in'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const styles = {
    container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'linear-gradient(135deg, #800000 0%, #1a0000 100%)', fontFamily: 'Arial, sans-serif' },
    loginCard: { width: '450px', backgroundColor: '#141414', borderRadius: '24px', padding: '40px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', boxSizing: 'border-box' },
    logoWrapper: { display: 'flex', justifyContent: 'center', marginBottom: '20px' },
    logo: { width: '70px', height: 'auto', objectFit: 'contain' },
    title: { color: '#FFFFFF', textAlign: 'center', fontSize: '32px', fontWeight: 'bold', marginBottom: '30px' },
    errorBox: { backgroundColor: 'rgba(232, 64, 26, 0.1)', border: '1px solid #E8401A', color: '#FF6B3D', padding: '12px 15px', borderRadius: '8px', fontSize: '13px', textAlign: 'center', marginBottom: '20px' },
    form: { display: 'flex', flexDirection: 'column', gap: '20px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    label: { color: '#A0AEC0', fontSize: '14px' },
    input: { padding: '14px 16px', borderRadius: '10px', border: 'none', backgroundColor: '#EBF4FF', fontSize: '15px', color: '#1A202C', outline: 'none' },
    button: { backgroundColor: '#A31D1D', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }
};

export default Login;