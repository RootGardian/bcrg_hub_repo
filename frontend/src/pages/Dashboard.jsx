import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';
import {
  LayoutDashboard,
  Bell,
  ChevronLeft,
  ChevronDown,
  ShieldCheck,
  Calendar,
  LogOut,
  AppWindow,
  User as UserIcon,
  Key,
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Hash,
  ExternalLink,
  Wrench
} from 'lucide-react';
import logo from '../assets/bcrg_logo_seul_inverse_144.png';
import './Dashboard.css';

const STATUS_COLORS = {
  'Actif': { bg: '#e8f5e9', color: '#2e7d32' },
  'En maintenance': { bg: '#fff3e0', color: '#f57c00' },
  'Inactif': { bg: '#fce4ec', color: '#c62828' }
};

// Palette de couleurs pour les avatars générés
const AVATAR_COLORS = [
  ['#1a3c2c', '#e8f5e9'], ['#1e3a5f', '#e3f0ff'], ['#5b21b6', '#f3e8ff'],
  ['#9d174d', '#fce7f3'], ['#b45309', '#fef3c7'], ['#065f46', '#d1fae5'],
  ['#1d4ed8', '#dbeafe'], ['#7c2d12', '#ffedd5'], ['#134e4a', '#ccfbf1'],
  ['#4c1d95', '#ede9fe']
];

const getAvatarColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const AppAvatar = ({ name, size = 28 }) => {
  const initials = name
    ? name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?';
  const [fg, bg] = getAvatarColor(name);
  return (
    <div style={{
      width: `${size}px`, height: `${size}px`,
      borderRadius: '10px',
      background: bg,
      color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800,
      fontSize: `${Math.round(size * 0.38)}px`,
      letterSpacing: '0.5px',
      userSelect: 'none',
      flexShrink: 0
    }}>
      {initials}
    </div>
  );
};

const isLocalUrl = (url) => {
  try {
    const h = new URL(url).hostname;
    return h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.168.') || h.startsWith('10.');
  } catch { return false; }
};

const AppLogo = ({ app, size = 28 }) => {
  const [srcIndex, setSrcIndex] = useState(0);

  const getSources = () => {
    const sources = [];
    if (app && app.icon_url && !isLocalUrl(app.icon_url)) sources.push(app.icon_url);
    if (app && app.url && !isLocalUrl(app.url)) {
      try {
        const urlObj = new URL(app.url);
        sources.push(`https://icons.duckduckgo.com/ip3/${urlObj.hostname}.ico`);
        sources.push(`https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`);
      } catch (e) {
        // ignore invalid URL
      }
    }
    return sources;
  };

  const sources = getSources();

  if (srcIndex >= sources.length || sources.length === 0) {
    return <AppAvatar name={app ? app.name : ''} size={size} />;
  }

  return (
    <img
      src={sources[srcIndex]}
      alt={app ? app.name : 'App'}
      onError={() => setSrcIndex(prev => prev + 1)}
      style={{ width: `${size}px`, height: `${size}px`, objectFit: 'contain', borderRadius: '8px' }}
    />
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    const s = localStorage.getItem('user');
    return s ? JSON.parse(s) : null;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [myApps, setMyApps] = useState([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');


  useEffect(() => {
    const fetchMyApps = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = {
          withCredentials: true,
          ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {})
        };
        const { data } = await axios.get(`${API_URL}/api/apps/my-apps`, config);
        setMyApps(data);
      } catch (err) {
        console.error('Erreur chargement apps:', err);
      } finally {
        setLoadingApps(false);
      }
    };
    if (user) {
      fetchMyApps();

      // Battement de cœur (Heartbeat) optimisé : synchronise le profil et vérifie les droits en direct
      // Intervalle de 30 secondes pour supporter 800+ utilisateurs sans surcharger le serveur
      const checkSession = async () => {
        // Si l'onglet est masqué/en arrière-plan, ne pas surcharger le serveur
        if (document.hidden) return;

        try {
          const token = localStorage.getItem('token');
          const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
          const { data: updatedUser } = await axios.get(`${API_URL}/api/auth/me`, headers);
          if (updatedUser) {
            setUser(prev => {
              const wasAdmin = Boolean(prev && (prev.is_admin || (prev.roles && prev.roles.some(r => (typeof r === 'string' ? r : r.name || '').toLowerCase().includes('admin')))));
              const nowAdmin = Boolean(updatedUser && (updatedUser.is_admin || (updatedUser.roles && updatedUser.roles.some(r => (typeof r === 'string' ? r : r.name || '').toLowerCase().includes('admin')))));

              // Si l'utilisateur vient d'être promu Administrateur en direct !
              if (!wasAdmin && nowAdmin) {
                localStorage.setItem('user', JSON.stringify(updatedUser));
                window.location.href = '/admin';
                return updatedUser;
              }
              if (JSON.stringify(prev) !== JSON.stringify(updatedUser)) {
                localStorage.setItem('user', JSON.stringify(updatedUser));
                return updatedUser;
              }
              return prev;
            });
          }
        } catch (e) {
          // L'intercepteur global axios gère automatiquement la déconnexion si la session est révoquée
        }
      };

      const heartbeat = setInterval(checkSession, 30000); // 30 secondes

      // Vérification immédiate lorsque l'utilisateur revient sur l'onglet
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          checkSession();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearInterval(heartbeat);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, []);

  if (!user) {
    return (
      <div className="dashboard-layout" style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <h2 style={{ color: '#1a3c2c' }}>Accès refusé. Veuillez vous connecter.</h2>
        <button onClick={() => navigate('/login')} style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#1a3c2c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Retour à la connexion
        </button>
      </div>
    );
  }

  const isAdmin = Boolean(user && (user.is_admin || (user.roles && user.roles.some(r => (typeof r === 'string' ? r : r.name || '').toLowerCase().includes('admin')))));
  const roleName = isAdmin ? 'ADMINISTRATEUR' : (user.roles && user.roles.length > 0 ? (typeof user.roles[0] === 'string' ? user.roles[0] : user.roles[0].name || '').toUpperCase() : 'EMPLOYÉ');
  const initial = user.first_name ? user.first_name.charAt(0).toUpperCase() + (user.last_name ? user.last_name.charAt(0).toUpperCase() : '') : 'U';
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      await axios.post(`${API_URL}/api/auth/logout`, {}, headers);
    } catch (e) {
      console.error('Erreur lors de la déconnexion SLO:', e);
    }
    setTimeout(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login', {
        state: {
          sloMessage: 'Déconnexion globale réussie : vos sessions actives sur le HUB et toutes les applications connectées ont été révoquées simultanément.'
        }
      });
    }, 700);
  };

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const closeDropdown = () => {
    if (isProfileDropdownOpen) setIsProfileDropdownOpen(false);
  };

  const openApp = (app) => {
    if (app.status === 'En maintenance') {
      navigate(`/maintenance?appName=${encodeURIComponent(app.name)}&appId=${app.id}&desc=${encodeURIComponent(app.description || '')}`);
      return;
    }
    if (app.status !== 'Actif') return;

    // Mode Redirection simple (sans jeton SSO) — ouvrir directement
    const isNone = String(app.auth_type).toUpperCase() === 'NONE';
    if (isNone) {
      window.open(app.url, '_blank', 'noopener,noreferrer');
      return;
    }

    // Mode SSO : Redirection directe par le backend (302)
    // Zéro async, Zéro popup blocker : window.open est appelé directement dans le gestionnaire de clic
    const token = localStorage.getItem('token');
    if (!token) {
      alert("Votre session BCRG HUB a expiré. Veuillez vous reconnecter.");
      localStorage.removeItem('user');
      navigate('/login');
      return;
    }

    // Appel synchrone immédiat dans le contexte direct du clic :
    // Le navigateur n'applique aucun bloqueur de popups et le backend 302 redirige instantanément
    const ssoRedirectUrl = `${API_URL}/api/apps/${app.id}/sso-redirect?token=${encodeURIComponent(token)}`;
    window.open(ssoRedirectUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="dashboard-layout" onClick={closeDropdown}>
      {/* Overlay Déconnexion Globale (Single Logout) */}
      {isLoggingOut && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          color: 'white'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px 36px',
            maxWidth: '430px',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            color: '#1e293b'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <LogOut size={26} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>
              Déconnexion Globale (SLO)
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 18px 0', lineHeight: 1.5 }}>
              Envoi du signal de révocation cryptographique aux applications connectées pour clôturer toutes vos sessions simultanément...
            </p>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              background: '#f1f5f9',
              borderRadius: '20px',
              fontSize: '0.8rem',
              color: '#475569',
              fontWeight: 600
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
              Protocole OIDC Back-Channel Logout actif
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="BCRG Logo" className="sidebar-logo" />
          <button className="toggle-btn" onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(!isSidebarOpen); }}>
            <ChevronLeft size={20} style={{ transform: isSidebarOpen ? 'rotate(0deg)' : 'rotate(180deg)', transition: '0.3s' }} />
          </button>
        </div>
        <nav className="sidebar-nav">
          <ul className="nav-list">
            <li className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentView('dashboard')}>
              <LayoutDashboard size={20} className="nav-icon" />
              {isSidebarOpen && <span>Tableau de bord</span>}
            </li>
            {isAdmin && (
              <li
                className="nav-item"
                onClick={() => navigate('/admin')}
                style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px', cursor: 'pointer' }}
              >
                <ShieldCheck size={20} className="nav-icon" />
                {isSidebarOpen && <span>Panneau Admin</span>}
              </li>
            )}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h3>{roleName}</h3>
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                style={{
                  background: '#15803d',
                  color: 'white',
                  border: 'none',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(21, 128, 61, 0.2)'
                }}
              >
                <ShieldCheck size={16} /> Panneau d'Administration
              </button>
            )}
          </div>
          <div className="topbar-right">
            <div className="user-profile-container">
              <div className="user-profile" onClick={toggleDropdown}>
                <div className="avatar">{initial}</div>
                <div className="user-info">
                  <span className="user-name">{user.first_name} {user.last_name}</span>
                  <span className="user-email">{user.email}</span>
                </div>
                <ChevronDown size={16} className="dropdown-icon" />
              </div>
              {isProfileDropdownOpen && (
                <div className="profile-dropdown">
                  <button className="dropdown-item" onClick={() => { setCurrentView('profile'); setIsProfileDropdownOpen(false); }}>
                    <UserIcon size={18} /> Mon profil
                  </button>
                  {isAdmin && (
                    <button className="dropdown-item text-green" onClick={() => { navigate('/admin'); setIsProfileDropdownOpen(false); }}>
                      <ShieldCheck size={18} /> Panneau d'Administration
                    </button>
                  )}
                  <button className="dropdown-item text-red" onClick={handleLogout}>
                    <LogOut size={18} /> Se déconnecter
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="content-area">
          {currentView === 'dashboard' ? (
            <>
              {/* Hero Banner */}
              <div className="hero-banner">
                <div className="hero-badge">
                  <ShieldCheck size={16} /> PORTAIL EMPLOYÉ BCRG
                </div>
                <div className="hero-main">
                  <div>
                    <h1 className="hero-title">Tableau de bord Hub BCRG</h1>
                    <p className="hero-subtitle">
                      Vue globale de vos habilitations. Accédez à vos outils métiers en un seul clic, sans vous reconnecter.
                    </p>
                  </div>
                  <div className="hero-date">
                    <Calendar size={16} /> {today}
                  </div>
                </div>
              </div>

              {/* Apps Grid — Real data from DB */}
              <div className="apps-section">
                <div className="apps-section-header">
                  <h2 className="section-title">
                    Mes Applications ({myApps.length})
                  </h2>
                  {/* Barre de recherche */}
                  <div className="apps-search-wrapper">
                    <svg className="apps-search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      id="apps-search-input"
                      type="text"
                      className="apps-search-input"
                      placeholder="Rechercher une application..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoComplete="off"
                    />
                    {searchQuery && (
                      <button className="apps-search-clear" onClick={() => setSearchQuery('')} title="Effacer">
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {loadingApps ? (
                  <p style={{ color: '#666', padding: '20px 0' }}>Chargement de vos applications...</p>
                ) : myApps.length === 0 ? (
                  <div className="empty-apps">
                    <AppWindow size={48} style={{ color: '#94a3b8', marginBottom: '12px' }} />
                    <p>Aucune application ne vous a été assignée pour le moment.</p>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Contactez votre administrateur pour obtenir des accès.</p>
                  </div>
                ) : (() => {
                  const q = searchQuery.trim().toLowerCase();
                  const filtered = q
                    ? myApps.filter(a =>
                        a.name?.toLowerCase().includes(q) ||
                        a.description?.toLowerCase().includes(q)
                      )
                    : myApps;
                  return filtered.length === 0 ? (
                    <div className="empty-apps">
                      <AppWindow size={40} style={{ color: '#94a3b8', marginBottom: '12px' }} />
                      <p>Aucun résultat pour « {searchQuery} »</p>
                    </div>
                  ) : (
                    <div className="apps-grid">
                      {filtered.map((app) => {
                        const isMaintenance = app.status === 'En maintenance';
                        const isDisabled = app.status !== 'Actif' && !isMaintenance;
                        const badge = STATUS_COLORS[app.status] || STATUS_COLORS['Actif'];
                        return (
                          <div
                            key={app.id}
                            className={`app-card ${isMaintenance ? 'app-card-maintenance' : ''} ${isDisabled ? 'app-card-disabled' : ''}`}
                            onClick={() => openApp(app)}
                            style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                            title={isMaintenance ? `Application en maintenance — Cliquez pour voir les détails` : (isDisabled ? `Application ${app.status}` : `Ouvrir ${app.name}`)}
                          >
                            <div className="app-icon">
                              <AppLogo app={app} size={32} />
                            </div>
                            <div className="app-details">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                <h4>{app.name}</h4>
                                {!isDisabled && !isMaintenance && <ExternalLink size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />}
                                {isMaintenance && <Wrench size={14} style={{ color: '#d97706', flexShrink: 0 }} />}
                              </div>
                              <p>{app.description || 'Application BCRG'}</p>
                              <span className="app-status-badge" style={{ backgroundColor: badge.bg, color: badge.color }}>
                                {app.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </>
          ) : currentView === 'profile' ? (
            /* Profile View */
            <div className="profile-view">
              <div className="profile-actions">
                <button className="btn-secondary" onClick={() => setCurrentView('dashboard')}>
                  <ArrowLeft size={16} /> Retour
                </button>
                <div className="profile-actions-right">
                  <button className="btn-danger" onClick={handleLogout}>
                    <LogOut size={16} /> Se déconnecter
                  </button>
                </div>
              </div>

              <div className="profile-card-main">
                <div className="profile-banner"></div>
                <div className="profile-card-content">
                  <div className="profile-avatar-large">{initial}</div>
                  <div className="profile-name-section">
                    <h2>{user.first_name} {user.last_name}</h2>
                    <span className="role-badge"><UserIcon size={14} /> {roleName}</span>
                  </div>
                </div>
              </div>

              <div className="profile-grid">
                <div className="profile-section-card">
                  <h3><Building size={18} /> Rattachement Institutionnel</h3>
                  <div className="profile-info-group">
                    <div className="profile-info-item">
                      <div className="info-icon"><Building size={16} /></div>
                      <div className="info-text">
                        <label>FONCTION / POSTE</label>
                        <p>{user.department || 'Non renseigné'}</p>
                      </div>
                    </div>
                    <div className="profile-info-item">
                      <div className="info-icon"><Hash size={16} /></div>
                      <div className="info-text">
                        <label>MATRICULE AGENT / HÔTE</label>
                        <p>{user.matricule || 'Non renseigné'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="profile-section-card">
                  <h3><Mail size={18} /> Coordonnées & Contact</h3>
                  <div className="profile-info-group">
                    <div className="profile-info-item">
                      <div className="info-icon"><Mail size={16} /></div>
                      <div className="info-text">
                        <label>ADRESSE E-MAIL</label>
                        <p>{user.email}</p>
                      </div>
                    </div>
                    <div className="profile-info-item">
                      <div className="info-icon"><Phone size={16} /></div>
                      <div className="info-text">
                        <label>TÉLÉPHONE / FLOTTE INTERNE</label>
                        <p>Non renseigné</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="profile-section-card full-width">
                <h3><ShieldCheck size={18} /> Habilitations & Permissions Applicatives</h3>
                <p className="permissions-text">
                  Droits standards associés au rôle <strong>{roleName}</strong>. {myApps.length} application(s) accessibles.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
