import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldCheck,
  ChevronLeft,
  ChevronDown,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import logo from '../assets/bcrg_logo_seul_inverse_144.png';
import './Dashboard.css';

// Composants modulaires
import ErrorBoundary from '../components/common/ErrorBoundary';
import LogoutOverlay from '../components/common/LogoutOverlay';
import HeroBanner from '../components/dashboard/HeroBanner';
import AppsSection from '../components/dashboard/AppsSection';
import UserProfileView from '../components/dashboard/UserProfileView';

// Custom Hooks métier
import useAuthSession from '../hooks/useAuthSession';
import useDashboardApps from '../hooks/useDashboardApps';

export const Dashboard = () => {
  const navigate = useNavigate();

  // 1. Initialisation de l'utilisateur depuis localStorage
  const initialUser = useMemo(() => {
    try {
      const s = localStorage.getItem('user');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  }, []);

  // 2. Gestion de la session & déconnexion (Custom Hook)
  const { user, isLoggingOut, handleLogout } = useAuthSession(initialUser, navigate);

  // 3. Gestion des applications métier & filtre (Custom Hook)
  const {
    apps,
    filteredApps,
    loading: loadingApps,
    searchQuery,
    setSearchQuery,
    openApp
  } = useDashboardApps(user, navigate);

  // 4. États d'interface locaux (UI state)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');

  // 5. Valeurs dérivées pures (zéro duplication de state)
  const isAdmin = useMemo(() => {
    return Boolean(
      user &&
      (user.is_admin ||
        (Array.isArray(user.roles) &&
          user.roles.some((r) =>
            (typeof r === 'string' ? r : r.name || '').toLowerCase().includes('admin')
          )))
    );
  }, [user]);

  const roleName = useMemo(() => {
    if (isAdmin) return 'ADMINISTRATEUR';
    if (user?.roles && user.roles.length > 0) {
      const firstRole = user.roles[0];
      return (typeof firstRole === 'string' ? firstRole : firstRole.name || '').toUpperCase();
    }
    return 'EMPLOYÉ';
  }, [isAdmin, user]);

  const initial = useMemo(() => {
    if (!user?.first_name) return 'U';
    const first = user.first_name.charAt(0).toUpperCase();
    const last = user.last_name ? user.last_name.charAt(0).toUpperCase() : '';
    return `${first}${last}`;
  }, [user]);

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }, []);

  // Callbacks d'interface
  const toggleDropdown = useCallback((e) => {
    e.stopPropagation();
    setIsProfileDropdownOpen((prev) => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsProfileDropdownOpen(false);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, [setSearchQuery]);

  const handleNavigateToProfile = useCallback(() => {
    setCurrentView('profile');
    setIsProfileDropdownOpen(false);
  }, []);

  const handleNavigateToAdmin = useCallback(() => {
    navigate('/admin');
    setIsProfileDropdownOpen(false);
  }, [navigate]);

  if (!user) {
    return (
      <div className="dashboard-layout" style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <h2 style={{ color: '#1a3c2c' }}>Session expirée ou utilisateur non connecté.</h2>
        <button type="button" onClick={() => navigate('/login')} className="btn-primary" style={{ marginTop: '20px' }}>
          Retour à la page de connexion
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-layout" onClick={closeDropdown}>
      {/* Overlay Déconnexion Globale */}
      <LogoutOverlay isLoggingOut={isLoggingOut} />

      {/* Barre latérale (Sidebar) */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`} aria-label="Navigation latérale">
        <div className="sidebar-header">
          <img src={logo} alt="BCRG Logo" className="sidebar-logo" />
          <button
            type="button"
            className="toggle-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsSidebarOpen((prev) => !prev);
            }}
            aria-label={isSidebarOpen ? 'Réduire le menu' : 'Agrandir le menu'}
          >
            <ChevronLeft
              size={20}
              style={{
                transform: isSidebarOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                transition: 'transform 0.3s'
              }}
            />
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            <li
              className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentView('dashboard')}
            >
              <LayoutDashboard size={20} className="nav-icon" />
              {isSidebarOpen && <span>Tableau de bord</span>}
            </li>

            {isAdmin && (
              <li
                className="nav-item"
                onClick={() => navigate('/admin')}
                style={{
                  marginTop: '20px',
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  paddingTop: '15px',
                  cursor: 'pointer'
                }}
              >
                <ShieldCheck size={20} className="nav-icon" />
                {isSidebarOpen && <span>Panneau Admin</span>}
              </li>
            )}
          </ul>
        </nav>
      </aside>

      {/* Zone Principale */}
      <main className="main-content">
        {/* Barre Supérieure (Topbar) */}
        <header className="topbar">
          <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h3>{roleName}</h3>
            {isAdmin && (
              <button
                type="button"
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
              <div className="user-profile" onClick={toggleDropdown} role="button" tabIndex={0}>
                <div className="avatar">{initial}</div>
                <div className="user-info">
                  <span className="user-name">{user.first_name} {user.last_name}</span>
                  <span className="user-email">{user.email}</span>
                </div>
                <ChevronDown size={16} className="dropdown-icon" />
              </div>

              {isProfileDropdownOpen && (
                <div className="profile-dropdown">
                  <button type="button" className="dropdown-item" onClick={handleNavigateToProfile}>
                    <UserIcon size={18} /> Mon profil
                  </button>
                  {isAdmin && (
                    <button type="button" className="dropdown-item text-green" onClick={handleNavigateToAdmin}>
                      <ShieldCheck size={18} /> Panneau d'Administration
                    </button>
                  )}
                  <button type="button" className="dropdown-item text-red" onClick={handleLogout}>
                    <LogOut size={18} /> Se déconnecter
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Zone de Contenu avec Défilement Intégré et Error Boundary */}
        <div className="content-area">
          <ErrorBoundary fallbackMessage="Impossible de charger cette section du tableau de bord.">
            {currentView === 'dashboard' ? (
              <>
                <HeroBanner todayStr={todayStr} />
                <AppsSection
                  totalCount={apps.length}
                  filteredApps={filteredApps}
                  loading={loadingApps}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onClearSearch={handleClearSearch}
                  onOpenApp={openApp}
                />
              </>
            ) : currentView === 'profile' ? (
              <UserProfileView
                user={user}
                roleName={roleName}
                initial={initial}
                appsCount={apps.length}
                onBack={() => setCurrentView('dashboard')}
                onLogout={handleLogout}
              />
            ) : null}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
