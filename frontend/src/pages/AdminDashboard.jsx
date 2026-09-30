import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Calendar 
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

  if (!user || !user.is_admin) {
    return (
      <div className="dashboard-layout" style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <h2 style={{ color: '#1a3c2c' }}>Accès réservé aux administrateurs.</h2>
        <button onClick={() => navigate('/login')} className="btn-primary" style={{marginTop: '20px'}}>Retour à la connexion</button>
      </div>
    );
  }

  const roleName = 'ADMINISTRATEUR';
  const initial = user.first_name ? user.first_name.charAt(0).toUpperCase() + (user.last_name ? user.last_name.charAt(0).toUpperCase() : '') : 'A';

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
              className="nav-item" 
              onClick={() => navigate('/dashboard')} 
              style={{marginTop: '30px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px'}}
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
            <button className="bell-btn"><Bell size={20} /><span className="notification-dot"></span></button>
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
