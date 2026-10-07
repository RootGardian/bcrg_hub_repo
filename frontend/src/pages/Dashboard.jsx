import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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
  ExternalLink
} from 'lucide-react';
import logo from '../assets/bcrg_logo_seul_inverse_144.png';
import './Dashboard.css';

const STATUS_COLORS = {
  'Actif': { bg: '#e8f5e9', color: '#2e7d32' },
  'En maintenance': { bg: '#fff3e0', color: '#f57c00' },
  'Inactif': { bg: '#fce4ec', color: '#c62828' }
};

const AppLogo = ({ app, size = 28 }) => {
  const [srcIndex, setSrcIndex] = useState(0);

  const getSources = () => {
    const sources = [];
    if (app && app.icon_url) sources.push(app.icon_url);
    if (app && app.url) {
      try {
        const urlObj = new URL(app.url);
        // DuckDuckGo is generally very reliable for favicons
        sources.push(`https://icons.duckduckgo.com/ip3/${urlObj.hostname}.ico`);
        // Google fallback
        sources.push(`https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`);
        // Direct root checks for PWA/standard icons
        sources.push(`${urlObj.origin}/favicon.ico`);
        sources.push(`${urlObj.origin}/logo192.png`);
        sources.push(`${urlObj.origin}/apple-touch-icon.png`);
      } catch (e) {
        // ignore invalid URL
      }
    }
    return sources;
  };

  const sources = getSources();

  if (srcIndex >= sources.length || sources.length === 0) {
    return <AppWindow size={size} />;
  }

  return (
    <img
      src={sources[srcIndex]}
      alt={app ? app.name : 'App'}
      onError={() => setSrcIndex(prev => prev + 1)}
      style={{ width: `${size}px`, height: `${size}px`, objectFit: 'contain', borderRadius: '6px' }}
    />
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const token = localStorage.getItem('token');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [myApps, setMyApps] = useState([]);
  const [loadingApps, setLoadingApps] = useState(true);

  useEffect(() => {
    const fetchMyApps = async () => {
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/apps/my-apps`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMyApps(data);
      } catch (err) {
        console.error('Erreur chargement apps:', err);
      } finally {
        setLoadingApps(false);
      }
    };
    if (token) fetchMyApps();
  }, [token]);

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

  const roleName = user.roles && user.roles.length > 0 ? user.roles[0].name.toUpperCase() : 'EMPLOYÉ';
  const initial = user.first_name ? user.first_name.charAt(0).toUpperCase() + (user.last_name ? user.last_name.charAt(0).toUpperCase() : '') : 'U';
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const closeDropdown = () => {
    if (isProfileDropdownOpen) setIsProfileDropdownOpen(false);
  };

  const openApp = (app) => {
    if (app.status !== 'Actif') return;
    try {
      const urlObj = new URL(app.url);
      if (app.auth_type === 'SSO') {
        const token = localStorage.getItem('token');
        if (token) urlObj.searchParams.append('sso_token', token);
      }
      window.open(urlObj.toString(), '_blank', 'noopener,noreferrer');
    } catch(e) {
      window.open(app.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="dashboard-layout" onClick={closeDropdown}>
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
            {user && user.is_admin && (
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
          <div className="topbar-left">
            <h3>{roleName}</h3>
          </div>
          <div className="topbar-right">
            <button className="bell-btn">
              <Bell size={20} />
              <span className="notification-dot"></span>
            </button>
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
                <h2 className="section-title">
                  Mes Applications ({myApps.length})
                </h2>
                {loadingApps ? (
                  <p style={{ color: '#666', padding: '20px 0' }}>Chargement de vos applications...</p>
                ) : myApps.length === 0 ? (
                  <div className="empty-apps">
                    <AppWindow size={48} style={{ color: '#94a3b8', marginBottom: '12px' }} />
                    <p>Aucune application ne vous a été assignée pour le moment.</p>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Contactez votre administrateur pour obtenir des accès.</p>
                  </div>
                ) : (
                  <div className="apps-grid">
                    {myApps.map((app) => {
                      const isDisabled = app.status !== 'Actif';
                      const badge = STATUS_COLORS[app.status] || STATUS_COLORS['Actif'];
                      return (
                        <div
                          key={app.id}
                          className={`app-card ${isDisabled ? 'app-card-disabled' : ''}`}
                          onClick={() => openApp(app)}
                          style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                          title={isDisabled ? `Application ${app.status}` : `Ouvrir ${app.name}`}
                        >
                          <div className="app-icon">
                            <AppLogo app={app} size={30} />
                          </div>
                          <div className="app-details">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                              <h4>{app.name}</h4>
                              {!isDisabled && <ExternalLink size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />}
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
                )}
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
                  <button className="btn-secondary">
                    <Key size={16} /> Changer le mot de passe
                  </button>
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
