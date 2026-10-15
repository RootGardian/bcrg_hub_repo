import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';
import {
  BarChart3,
  AppWindow,
  Users,
  ShieldCheck,
  User as UserIcon,
  Bell,
  ChevronLeft,
  ChevronDown,
  LogOut,
  Calendar,
  Database,
  Lock
} from 'lucide-react';
import logo from '../assets/bcrg_logo_seul_inverse_144.png';
import AdminPanel from './AdminPanel';
import './Dashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('stats');
  const [isLoggingOut, setIsLoggingOut] = useState(false);



  const isAdmin = Boolean(user && (user.is_admin || (user.roles && user.roles.some(r => (typeof r === 'string' ? r : r.name || '').toLowerCase().includes('admin')))));

  // Battement de cœur (Heartbeat) de sécurité : vérifie la validité de la session administrateur
  useEffect(() => {
    if (!user) return;

    const checkAdminSession = async () => {
      if (document.hidden) return;
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        const { data: updatedUser } = await axios.get(`${API_URL}/api/auth/me`, headers);
        if (updatedUser) {
          localStorage.setItem('user', JSON.stringify(updatedUser));
          const stillAdmin = Boolean(updatedUser.is_admin || (updatedUser.roles && updatedUser.roles.some(r => (typeof r === 'string' ? r : r.name || '').toLowerCase().includes('admin'))));
          if (!stillAdmin) {
            window.location.href = '/dashboard';
          }
        }
      } catch (e) {
        // L'intercepteur global axios déconnecte automatiquement si la session est révoquée
      }
    };

    const heartbeat = setInterval(checkAdminSession, 15000); // 15 secondes pour les admins

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkAdminSession();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, API_URL]);

  if (!user || !isAdmin) {
    return (
      <div className="dashboard-layout" style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <h2 style={{ color: '#1a3c2c' }}>Accès réservé aux administrateurs.</h2>
        <button onClick={() => navigate('/login')} className="btn-primary" style={{ marginTop: '20px' }}>Retour à la connexion</button>
      </div>
    );
  }

  const roleName = 'ADMINISTRATEUR';
  const initial = user.first_name ? user.first_name.charAt(0).toUpperCase() + (user.last_name ? user.last_name.charAt(0).toUpperCase() : '') : 'A';

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
          sloMessage: 'Déconnexion globale réussie : vos sessions d\'administration et applicatives ont été révoquées avec succès.'
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

  const todayStr = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const getHeaderInfo = () => {
    switch (activeTab) {
      case 'apps':
        return {
          title: "Catalogue d'applications",
          subtitle: "Ajoutez, modifiez ou configurez les applications d'entreprise et leurs modes d'authentification."
        };
      case 'users':
        return {
          title: "Gestion des utilisateurs",
          subtitle: "Consultez la liste des employés, créez de nouveaux comptes ou importez des données en masse via CSV."
        };
      case 'roles':
        return {
          title: "Droits & Habilitations (RBAC)",
          subtitle: "Définissez les rôles d'accès et attribuez les applications autorisées par profil utilisateur."
        };
      case 'ldap':
        return {
          title: "Configuration LDAP & AD",
          subtitle: "Gérez la connexion à vos annuaires Active Directory pour l'authentification centralisée."
        };
      case 'security':
        return {
          title: "Sécurité & Conformité",
          subtitle: "Supervisez la posture de sécurité, le durcissement réseau, le SSO et les journaux d'audit."
        };
      default:
        return {
          title: "Tableau de bord administration",
          subtitle: "Vue globale des ressources, des utilisateurs et des tendances d'accès pour pilotage de la plateforme."
        };
    }
  };

  const headerInfo = getHeaderInfo();

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
              Envoi du signal de révocation cryptographique aux applications connectées pour clôturer toutes les sessions actives...
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

      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="BCRG Logo" className="sidebar-logo" />
          <button className="toggle-btn" onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(!isSidebarOpen); }}>
            <ChevronLeft size={20} style={{ transform: isSidebarOpen ? 'rotate(0deg)' : 'rotate(180deg)', transition: '0.3s' }} />
          </button>
        </div>
        <nav className="sidebar-nav">
          <ul className="nav-list">
            <li
              className={`nav-item ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              <BarChart3 size={20} className="nav-icon" />
              {isSidebarOpen && <span>Tableau de bord</span>}
            </li>
            <li
              className={`nav-item ${activeTab === 'apps' ? 'active' : ''}`}
              onClick={() => setActiveTab('apps')}
            >
              <AppWindow size={20} className="nav-icon" />
              {isSidebarOpen && <span>Applications</span>}
            </li>
            <li
              className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={20} className="nav-icon" />
              {isSidebarOpen && <span>Utilisateurs</span>}
            </li>

            <li
              className={`nav-item ${activeTab === 'roles' ? 'active' : ''}`}
              onClick={() => setActiveTab('roles')}
            >
              <ShieldCheck size={20} className="nav-icon" />
              {isSidebarOpen && <span>Rôles & Accès</span>}
            </li>
            <li
              className={`nav-item ${activeTab === 'ldap' ? 'active' : ''}`}
              onClick={() => setActiveTab('ldap')}
            >
              <Database size={20} className="nav-icon" />
              {isSidebarOpen && <span>LDAP & AD</span>}
            </li>
            <li
              className={`nav-item ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <Lock size={20} className="nav-icon" />
              {isSidebarOpen && <span>Sécurité & Conformité </span>}
            </li>

            <li
              className="nav-item"
              onClick={() => navigate('/dashboard')}
              style={{ marginTop: '30px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}
            >
              <UserIcon size={20} className="nav-icon" />
              {isSidebarOpen && <span>Portail Employé</span>}
            </li>
          </ul>
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <h3 style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>{roleName}</h3>
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
                  <button className="dropdown-item text-red" onClick={handleLogout}>
                    <LogOut size={18} /> Se déconnecter
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content-area" style={{ padding: '24px' }}>
          {/* Hero Header Card matching reference design */}
          <div className="hero-header-card">
            <div className="hero-content">
              <div className="hero-badge">
                <ShieldCheck size={14} />
                <span>{roleName}</span>
              </div>
              <h1 className="hero-title">{headerInfo.title}</h1>
              <p className="hero-subtitle">{headerInfo.subtitle}</p>
            </div>
            <div className="hero-date-box">
              <Calendar size={16} />
              <span>{todayStr}</span>
            </div>
          </div>

          <AdminPanel
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            hideTabsHeader={true}
          />
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
