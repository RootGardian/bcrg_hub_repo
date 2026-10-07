import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users,
  AppWindow,
  ShieldCheck,
  BarChart3,
  Upload,
  Plus,
  Key,
  AlertTriangle,
  Search,
  Filter,
  MoreHorizontal,
  Calendar,
  CheckCircle2,
  Lock,
  ExternalLink,
  UserCheck,
  Edit,
  Trash2,
  Database
} from 'lucide-react';
import './AdminPanel.css';
import LdapConfigPanel from './LdapConfigPanel';

const AppLogo = ({ app, size = 24 }) => {
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

const AdminPanel = ({ activeTab: propActiveTab, setActiveTab: propSetActiveTab, hideTabsHeader = false }) => {
  const [internalActiveTab, setInternalActiveTab] = useState('stats');
  const activeTab = propActiveTab || internalActiveTab;
  const setActiveTab = propSetActiveTab || setInternalActiveTab;

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // UI States for in-app popups
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const requestConfirm = (message, onConfirm) => {
    setConfirmDialog({ message, onConfirm });
  };

  const [stats, setStats] = useState({ users: 0, applications: 0, roles: 0 });
  const [usersList, setUsersList] = useState([]);
  const [apps, setApps] = useState([]);
  const [roles, setRoles] = useState([]);

  const [showAppModal, setShowAppModal] = useState(false);
  const [editingAppId, setEditingAppId] = useState(null);
  const [newApp, setNewApp] = useState({ name: '', url: '', description: '', auth_type: 'SSO', status: 'Actif', icon_url: '' });

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [newRole, setNewRole] = useState({ name: '', description: '' });

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [newUser, setNewUser] = useState({ first_name: '', last_name: '', email: '', matricule: '', department: '', role_id: '', password: '' });

  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ targetType: 'user', user_id: '', role_id: '', app_id: '' });
  const [assignResult, setAssignResult] = useState(null);

  const [showAssignRoleModal, setShowAssignRoleModal] = useState(false);
  const [assignRoleForm, setAssignRoleForm] = useState({ ldap_type: 'USER', ldap_identifier: '', role_id: '', ldap_name: '' });
  
  const [ldapUsers, setLdapUsers] = useState([]);
  const [ldapGroups, setLdapGroups] = useState([]);
  const [loadingLdap, setLoadingLdap] = useState(false);
  const [assignRoleResult, setAssignRoleResult] = useState(null);

  const [activeActionMenu, setActiveActionMenu] = useState(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.action-menu-wrapper')) {
        setActiveActionMenu(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const getConfig = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };
  const config = getConfig();

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/stats`, getConfig());
      setStats(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/users`, getConfig());
      setUsersList(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchApps = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/applications`, getConfig());
      setApps(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/roles`, getConfig());
      setRoles(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'stats') {
      fetchStats();
      fetchApps();
    }
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'apps') fetchApps();
    if (activeTab === 'roles') fetchRoles();
  }, [activeTab]);

  const handleCreateApp = async (e) => {
    e.preventDefault();
    try {
      if (editingAppId) {
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/applications/${editingAppId}`, newApp, getConfig());
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/applications`, newApp, getConfig());
      }
      setShowAppModal(false); setEditingAppId(null); showToast("Application sauvegardée avec succès");
      setNewApp({ name: '', url: '', description: '', auth_type: 'SSO', status: 'Actif', icon_url: '' });
      fetchApps(); fetchStats();
    } catch (err) { showToast("Erreur lors de la sauvegarde de l'application", "error"); }
  };


  const handleAssignApp = async (e) => {
    e.preventDefault();
    try {
      if (assignForm.targetType === 'user') {
        const { data } = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/users/assign-app`, {
          user_id: assignForm.user_id,
          app_id: assignForm.app_id
        }, getConfig());
        setAssignResult(data.message);
        setTimeout(() => {
          setShowAssignModal(false);
          setAssignResult(null);
          setAssignForm({ targetType: 'user', user_id: '', role_id: '', app_id: '' });
        }, 1200);
      } else {
        const { data } = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/roles/assign-app`, {
          role_id: assignForm.role_id,
          app_id: assignForm.app_id
        }, getConfig());
        setAssignResult(data.message);
        setTimeout(() => {
          setShowAssignModal(false);
          setAssignResult(null);
          setAssignForm({ targetType: 'user', user_id: '', role_id: '', app_id: '' });
        }, 1200);
      }
    } catch (err) { showToast("Erreur lors de l'assignation de l'application", "error"); }
  };

  const fetchLdapEntities = async () => {
    setLoadingLdap(true);
    try {
      const resUsers = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ldap-config/users`);
      setLdapUsers(resUsers.data || []);
      const resGroups = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ldap-config/groups`);
      setLdapGroups(resGroups.data || []);
    } catch (err) {
      console.error("Erreur lors de la récupération de l'AD", err);
    } finally {
      setLoadingLdap(false);
    }
  };

  const handleAssignRole = async (e) => {
    e.preventDefault();
    if (!assignRoleForm.ldap_identifier || !assignRoleForm.role_id) {
      setAssignRoleResult({ success: false, message: 'Veuillez sélectionner une entité AD et un rôle' });
      return;
    }
    try {
      const configWithAuth = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/roles/assign-ldap`, assignRoleForm, configWithAuth);
      setAssignRoleResult({ success: true, message: 'Rôle assigné avec succès !' });
      setTimeout(() => { setShowAssignRoleModal(false); setAssignRoleResult(null); }, 2000);
    } catch (err) {
      setAssignRoleResult({ success: false, message: err.response?.data?.message || 'Erreur lors de l\'assignation' });
    }
  };

  const handleDeleteApp = async (id) => {
    requestConfirm('Êtes-vous sûr de vouloir supprimer cette application ?', async () => {
      try {
        await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/applications/${id}`, getConfig());
        showToast("Application supprimée avec succès");
        fetchApps(); fetchStats();
      } catch (err) { showToast("Erreur lors de la suppression de l'application", "error"); }
    });
  };

  const handleDeleteUser = async (id) => {
    requestConfirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?', async () => {
      try {
        await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/users/${id}`, getConfig());
        showToast("Utilisateur supprimé avec succès");
        fetchUsers(); fetchStats();
      } catch (err) { showToast("Erreur lors de la suppression de l'utilisateur", "error"); }
    });
  };

  const handleDeleteRole = async (id) => {
    requestConfirm('Êtes-vous sûr de vouloir supprimer ce rôle ?', async () => {
      try {
        await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/roles/${id}`, getConfig());
        showToast("Rôle supprimé avec succès");
        fetchRoles(); fetchStats();
      } catch (err) { showToast("Erreur lors de la suppression du rôle", "error"); }
    });
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    try {
      if (editingRoleId) {
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/roles/${editingRoleId}`, newRole, getConfig());
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/roles`, newRole, getConfig());
      }
      setShowRoleModal(false); setEditingRoleId(null); showToast("Rôle sauvegardé avec succès");
      setNewRole({ name: '', description: '' });
      fetchRoles(); fetchStats();
    } catch (err) { showToast("Erreur lors de la sauvegarde du rôle", "error"); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      if (editingUserId) {
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/users/${editingUserId}`, newUser, getConfig());
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/users`, newUser, getConfig());
      }
      setShowUserModal(false); setEditingUserId(null); showToast('Utilisateur sauvegardé avec succès');
      setNewUser({ first_name: '', last_name: '', email: '', matricule: '', department: '', role_id: '', password: '' });
      fetchUsers(); fetchStats();
    } catch (err) {
      console.error('Erreur création utilisateur:', err.response?.data || err.message);
      showToast(err.response?.data?.message || "Erreur lors de la sauvegarde de l'utilisateur", 'error');
    }
  };

  const handleImportCSV = async (e) => {
    e.preventDefault();
    if (!importFile) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const usersToImport = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',');
        if (cols.length >= 4) {
          usersToImport.push({
            matricule: cols[0].trim(),
            last_name: cols[1].trim(),
            first_name: cols[2].trim(),
            email: cols[3].trim(),
            department: cols[4] ? cols[4].trim() : '',
            role_name: cols[5] ? cols[5].trim() : ''
          });
        }
      }

      try {
        const { data } = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/users/import`, { users: usersToImport }, getConfig());
        setImportResult(data);
        fetchUsers(); fetchStats();
      } catch (err) {
        showToast("Erreur serveur lors de l'import", "error");
      }
    };
    reader.readAsText(importFile);
  };

  // Filtered lists
  const filteredUsers = usersList.filter(u =>
    `${u.first_name} ${u.last_name} ${u.email} ${u.matricule}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredApps = apps.filter(a =>
    `${a.name} ${a.url}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRoles = roles.filter(r =>
    `${r.name} ${r.description}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-panel">
      {!hideTabsHeader && (
        <>
          <div className="admin-header">
            <h2>Espace d'Administration</h2>
            <p>Gérez les applications, les utilisateurs et les droits d'accès.</p>
          </div>

          <div className="admin-tabs">
            <button className={`admin-tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
              <BarChart3 size={16} /> Statistiques
            </button>
            <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
              <Users size={16} /> Utilisateurs
            </button>
            <button className={`admin-tab ${activeTab === 'apps' ? 'active' : ''}`} onClick={() => setActiveTab('apps')}>
              <AppWindow size={16} /> Applications
            </button>
            <button className={`admin-tab ${activeTab === 'roles' ? 'active' : ''}`} onClick={() => setActiveTab('roles')}>
              <ShieldCheck size={16} /> Rôles & Permissions
            </button>
            <button className={`admin-tab ${activeTab === 'ldap' ? 'active' : ''}`} onClick={() => setActiveTab('ldap')}>
              <Database size={16} /> LDAP & AD
            </button>
          </div>
        </>
      )}

      <div className="admin-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#6c8093' }}>
            <p style={{ fontWeight: 600, fontSize: '1rem' }}>Chargement des données en cours...</p>
          </div>
        ) : (
          <>
            {/* --- TAB STATS (DASHBOARD STATISTIQUES REELLES) --- */}
            {activeTab === 'stats' && (
              <>
                {/* 3 KPI Cards Grid - Données réelles uniquement */}
                <div className="kpi-cards-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  <div className="kpi-card" onClick={() => setActiveTab('apps')} style={{ cursor: 'pointer' }}>
                    <div className="kpi-card-header">
                      <span className="kpi-card-title">Applications au catalogue</span>
                      <div className="kpi-icon-box blue"><AppWindow size={20} /></div>
                    </div>
                    <div className="kpi-value">{stats.applications}</div>
                    <span className="kpi-badge blue">Gérer le catalogue &rarr;</span>
                  </div>

                  <div className="kpi-card" onClick={() => setActiveTab('users')} style={{ cursor: 'pointer' }}>
                    <div className="kpi-card-header">
                      <span className="kpi-card-title">Employés enregistrés</span>
                      <div className="kpi-icon-box green"><Users size={20} /></div>
                    </div>
                    <div className="kpi-value">{stats.users}</div>
                    <span className="kpi-badge green">Gérer les comptes &rarr;</span>
                  </div>

                  <div className="kpi-card" onClick={() => setActiveTab('roles')} style={{ cursor: 'pointer' }}>
                    <div className="kpi-card-header">
                      <span className="kpi-card-title">Rôles d'accès (RBAC)</span>
                      <div className="kpi-icon-box purple"><ShieldCheck size={20} /></div>
                    </div>
                    <div className="kpi-value">{stats.roles}</div>
                    <span className="kpi-badge purple">Matrice d'habilitations &rarr;</span>
                  </div>
                </div>

                {/* Synthèse des données réelles du système */}
                <div className="dashboard-middle-grid">
                  {/* Gauche: Liste des dernières applications réelles */}
                  <div className="card-panel">
                    <div className="card-panel-header">
                      <div>
                        <h3>Applications récentes</h3>
                        <p className="card-panel-sub">Applications actuellement enregistrées dans la base de données</p>
                      </div>
                      <button className="btn-secondary-action" onClick={() => setActiveTab('apps')}>Tout voir</button>
                    </div>

                    {apps.length === 0 ? (
                      <p style={{ color: '#64748b', fontSize: '0.9rem', paddingTop: '10px' }}>Aucune application configurée.</p>
                    ) : (
                      <table className="bcrg-table">
                        <thead>
                          <tr>
                            <th>Nom</th>
                            <th>Authentification</th>
                            <th>Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          {apps.slice(0, 4).map(app => (
                            <tr key={app.id}>
                              <td>
                                <div className="user-cell-content">
                                  <div className="user-avatar-circle" style={{ backgroundColor: '#e0f2fe', color: '#0284c7', width: '30px', height: '30px', borderRadius: '8px', overflow: 'hidden' }}>
                                    <AppLogo app={app} size={20} />
                                  </div>
                                  <strong>{app.name}</strong>
                                </div>
                              </td>

                              <td><span className="status-capsule active">{app.status || 'Actif'}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Droite: Actions rapides d'administration */}
                  <div className="card-panel">
                    <div className="card-panel-header">
                      <div>
                        <h3>Actions d'Administration</h3>
                        <p className="card-panel-sub">Raccourcis pour les opérations courantes</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                      <button className="btn-primary-action" style={{ justifyContent: 'flex-start' }} onClick={() => { setNewApp({ name: '', url: '', description: '', status: 'Actif', icon_url: '' }); setEditingAppId(null); setShowAppModal(true); }}>
                        <Plus size={18} /> Ajouter une nouvelle application
                      </button>
                      <button className="btn-secondary-action" style={{ justifyContent: 'flex-start' }} onClick={() => { fetchRoles(); setShowUserModal(true); }}>
                        <Users size={18} /> Créer un compte employé
                      </button>
                      <button className="btn-secondary-action" style={{ justifyContent: 'flex-start' }} onClick={() => setShowImportModal(true)}>
                        <Upload size={18} /> Importation de masse (CSV)
                      </button>
                      <button className="btn-secondary-action" style={{ justifyContent: 'flex-start' }} onClick={() => { fetchApps(); fetchUsers(); fetchRoles(); setAssignResult(null); setShowAssignModal(true); }}>
                        <Key size={18} /> Assigner une application à un utilisateur / rôle
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* --- TAB APPLICATIONS (MATCHING IMAGE 2 LIST UI) --- */}
            {activeTab === 'apps' && (
              <>
                {/* Top KPI Cards for Apps */}
                <div className="kpi-cards-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span className="kpi-card-title">Applications au Catalogue</span>
                      <div className="kpi-icon-box green"><AppWindow size={18} /></div>
                    </div>
                    <div className="kpi-value">{apps.length}</div>
                    <span className="kpi-badge green">Total configuré</span>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span className="kpi-card-title">Authentification SSO / OIDC</span>
                      <div className="kpi-icon-box blue"><Key size={18} /></div>
                    </div>
                    <div className="kpi-value">{apps.length}</div>
                    <span className="kpi-badge blue">Connectivité SSO maison</span>
                  </div>


                </div>

                {/* Toolbar / Search & Add */}
                <div className="table-toolbar">
                  <div className="toolbar-left">
                    <div className="search-input-wrapper">
                      <Search size={16} className="search-icon-inside" />
                      <input
                        type="text"
                        placeholder="Rechercher une application (nom, auth, url)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <button className="btn-filter"><Filter size={14} /> Filtrer</button>
                  </div>
                  <div className="toolbar-right">
                    <button className="btn-secondary-action" onClick={() => { fetchApps(); fetchUsers(); fetchRoles(); setAssignResult(null); setShowAssignModal(true); }}>
                      <Key size={16} /> Assigner une Application
                    </button>
                    <button className="btn-primary-action" onClick={() => { setNewApp({ name: '', url: '', description: '', status: 'Actif', icon_url: '' }); setEditingAppId(null); setShowAppModal(true); }}>
                      <Plus size={18} /> Nouvelle Application
                    </button>
                  </div>
                </div>

                {/* Applications Table matching Image 2 */}
                <div className="table-card-container">
                  <table className="bcrg-table">
                    <thead>
                      <tr>
                        <th>Application</th>
                        <th>Type Authentification</th>
                        <th>URL Redirection</th>
                        <th>Statut</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApps.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                            Aucune application trouvée.
                          </td>
                        </tr>
                      ) : (
                        filteredApps.map(app => (
                          <tr key={app.id}>
                            <td>
                              <div className="user-cell-content">
                                <div className="user-avatar-circle" style={{ backgroundColor: '#e0f2fe', color: '#0284c7', borderRadius: '10px', overflow: 'hidden' }}>
                                  <AppLogo app={app} size={24} />
                                </div>
                                <div>
                                  <div className="user-name-title">{app.name}</div>
                                  <div className="user-subtext">{app.description || 'Application d\'entreprise BCRG'}</div>
                                </div>
                              </div>
                            </td>

                            <td>
                              <a href={app.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                                {app.url} <ExternalLink size={12} />
                              </a>
                            </td>
                            <td>
                              <span className={`status-capsule ${app.status === 'Actif' ? 'active' :
                                app.status === 'En maintenance' ? 'maintenance' : 'inactive'
                                }`}>
                                {app.status || 'Actif'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="action-menu-wrapper">
                                <button className="action-dots-btn" onClick={() => setActiveActionMenu(activeActionMenu === `app-${app.id}` ? null : `app-${app.id}`)}>
                                  <MoreHorizontal size={16} />
                                </button>
                                {activeActionMenu === `app-${app.id}` && (
                                  <div className="action-menu-dropdown">
                                    <button className="action-menu-item" onClick={() => { setNewApp({ name: app.name, url: app.url, description: app.description, auth_type: app.auth_type, status: app.status, icon_url: app.icon_url || '' }); setEditingAppId(app.id); setShowAppModal(true); setActiveActionMenu(null); }}><Edit size={16} className="action-menu-icon" /> Modifier</button>
                                    <button className="action-menu-item delete" onClick={() => { handleDeleteApp(app.id); setActiveActionMenu(null); }}><Trash2 size={16} className="action-menu-icon" /> Supprimer</button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* --- TAB USERS (MATCHING IMAGE 2 LIST UI) --- */}
            {activeTab === 'users' && (
              <>
                {/* Top KPI Cards for Users */}
                <div className="kpi-cards-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span className="kpi-card-title">Utilisateurs Enregistrés</span>
                      <div className="kpi-icon-box green"><Users size={18} /></div>
                    </div>
                    <div className="kpi-value">{usersList.length}</div>
                    <span className="kpi-badge green">Total effectif</span>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span className="kpi-card-title">Comptes Actifs</span>
                      <div className="kpi-icon-box blue"><UserCheck size={18} /></div>
                    </div>
                    <div className="kpi-value">{usersList.filter(u => u.is_active).length}</div>
                    <span className="kpi-badge blue">Habilités SSO</span>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span className="kpi-card-title">Profils Administrateur</span>
                      <div className="kpi-icon-box purple"><ShieldCheck size={18} /></div>
                    </div>
                    <div className="kpi-value">{usersList.filter(u => u.is_admin).length}</div>
                    <span className="kpi-badge purple">Privilèges élevés</span>
                  </div>
                </div>

                {/* Toolbar / Search & Add */}
                <div className="table-toolbar">
                  <div className="toolbar-left">
                    <div className="search-input-wrapper">
                      <Search size={16} className="search-icon-inside" />
                      <input
                        type="text"
                        placeholder="Rechercher un employé (nom, matricule, email)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

                  </div>
                  <div className="toolbar-right">
                    <button className="btn-secondary-action" onClick={() => setShowImportModal(true)}>
                      <Upload size={16} /> Import CSV / XLSX
                    </button>
                    <button className="btn-primary-action" onClick={() => { setNewUser({ first_name: '', last_name: '', email: '', matricule: '', department: '', role_id: '', password: '' }); setEditingUserId(null); fetchRoles(); setShowUserModal(true); }}>
                      <Plus size={18} /> Nouvel Utilisateur
                    </button>
                  </div>
                </div>

                {/* Users Table matching Image 2 */}
                <div className="table-card-container">
                  <table className="bcrg-table">
                    <thead>
                      <tr>
                        <th>Employé</th>
                        <th>Email & Département</th>
                        <th>Rôle Attribué</th>
                        <th>Statut</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                            Aucun utilisateur trouvé.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map(u => {
                          const userInitials = u.first_name ? `${u.first_name.charAt(0)}${u.last_name ? u.last_name.charAt(0) : ''}`.toUpperCase() : 'U';
                          const roleText = u.Roles && u.Roles.length > 0 ? u.Roles.map(r => r.name).join(', ') : (u.is_admin ? 'Administrateur' : 'Employé Standard');
                          return (
                            <tr key={u.id}>
                              <td>
                                <div className="user-cell-content">
                                  <div className="user-avatar-circle">
                                    {userInitials}
                                  </div>
                                  <div>
                                    <div className="user-name-title">{u.first_name} {u.last_name}</div>
                                    <div className="user-subtext">Matricule: {u.matricule || 'Non renseigné'}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div>{u.email}</div>
                                <div className="user-subtext">{u.department || 'Banque Centrale'}</div>
                              </td>
                              <td>
                                <span className={`badge-pill-type ${u.is_admin ? 'badge-pill-pink' : 'badge-pill-blue'}`}>
                                  {roleText}
                                </span>
                              </td>
                              <td>
                                <span className={`status-capsule ${u.is_active !== false ? 'active' : 'inactive'}`}>
                                  {u.is_active !== false ? 'ACTIF' : 'INACTIF'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div className="action-menu-wrapper">
                                  <button className="action-dots-btn" onClick={() => setActiveActionMenu(activeActionMenu === `user-${u.id}` ? null : `user-${u.id}`)}>
                                    <MoreHorizontal size={16} />
                                  </button>
                                  {activeActionMenu === `user-${u.id}` && (
                                    <div className="action-menu-dropdown">
                                      <button className="action-menu-item" onClick={() => { setAssignForm({ ...assignForm, targetType: 'user', user_id: u.id }); setShowAssignModal(true); setActiveActionMenu(null); }}><Key size={16} className="action-menu-icon" /> Assigner App</button>
                                      <button className="action-menu-item" onClick={() => { setNewUser({ first_name: u.first_name, last_name: u.last_name, email: u.email, matricule: u.matricule, department: u.department, role_id: u.Role ? u.Role.id : '' }); setEditingUserId(u.id); setShowUserModal(true); setActiveActionMenu(null); }}><Edit size={16} className="action-menu-icon" /> Modifier</button>
                                      <button className="action-menu-item delete" onClick={() => { handleDeleteUser(u.id); setActiveActionMenu(null); }}><Trash2 size={16} className="action-menu-icon" /> Supprimer</button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* --- TAB ROLES (MATCHING IMAGE 2 LIST UI) --- */}
            {activeTab === 'roles' && (
              <>
                {/* Top KPI Cards for Roles */}
                <div className="kpi-cards-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span className="kpi-card-title">Rôles Définis</span>
                      <div className="kpi-icon-box purple"><ShieldCheck size={18} /></div>
                    </div>
                    <div className="kpi-value">{roles.length}</div>
                    <span className="kpi-badge purple">Groupes d'accès</span>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span className="kpi-card-title">Attributions d'Apps</span>
                      <div className="kpi-icon-box blue"><AppWindow size={18} /></div>
                    </div>
                    <div className="kpi-value">
                      {roles.reduce((acc, r) => acc + (r.Applications ? r.Applications.length : 0), 0)}
                    </div>
                    <span className="kpi-badge blue">Habilitations actives</span>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span className="kpi-card-title">Politique Sécurité</span>
                      <div className="kpi-icon-box green"><CheckCircle2 size={18} /></div>
                    </div>
                    <div className="kpi-value">RBAC</div>
                    <span className="kpi-badge green">Conforme BCRG</span>
                  </div>
                </div>

                {/* Toolbar / Search & Add */}
                <div className="table-toolbar">
                  <div className="toolbar-left">
                    <div className="search-input-wrapper">
                      <Search size={16} className="search-icon-inside" />
                      <input
                        type="text"
                        placeholder="Rechercher un rôle ou un privilège..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="toolbar-right">
                    <button className="btn-secondary-action" onClick={() => { fetchRoles(); fetchLdapEntities(); setAssignRoleResult(null); setAssignRoleForm({ldap_type: 'USER', ldap_identifier: '', role_id: '', ldap_name: ''}); setShowAssignRoleModal(true); }}>
                      <UserCheck size={16} /> Ajouter un utilisateur à un rôle
                    </button>
                    <button className="btn-primary-action" onClick={() => { setNewRole({ name: '', description: '' }); setEditingRoleId(null); setShowRoleModal(true); }}>
                      <Plus size={18} /> Nouveau Rôle
                    </button>
                  </div>
                </div>

                {/* Roles Table matching Image 2 */}
                <div className="table-card-container">
                  <table className="bcrg-table">
                    <thead>
                      <tr>
                        <th>Nom du Rôle</th>
                        <th>Description & Portée</th>
                        <th>Applications Assignées</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRoles.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                            Aucun rôle défini.
                          </td>
                        </tr>
                      ) : (
                        filteredRoles.map(r => (
                          <tr key={r.id}>
                            <td>
                              <div className="user-cell-content">
                                <div className="user-avatar-circle" style={{ backgroundColor: '#f3e8ff', color: '#7e22ce' }}>
                                  <ShieldCheck size={18} />
                                </div>
                                <div className="user-name-title">{r.name}</div>
                              </div>
                            </td>
                            <td>{r.description || 'Rôle d\'accès aux ressources du Store BCRG'}</td>
                            <td>
                              {r.Applications && r.Applications.length > 0 ? (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  {r.Applications.map(app => (
                                    <span key={app.id} className="badge-pill-type badge-pill-green">
                                      {app.name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="user-subtext">Aucune app assignée</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="action-menu-wrapper">
                                <button className="action-dots-btn" onClick={() => setActiveActionMenu(activeActionMenu === `role-${r.id}` ? null : `role-${r.id}`)}>
                                  <MoreHorizontal size={16} />
                                </button>
                                {activeActionMenu === `role-${r.id}` && (
                                  <div className="action-menu-dropdown">
                                    <button className="action-menu-item" onClick={() => { setAssignForm({ ...assignForm, targetType: 'role', role_id: r.id }); setShowAssignModal(true); setActiveActionMenu(null); }}><Key size={16} className="action-menu-icon" /> Assigner App</button>
                                    <button className="action-menu-item" onClick={() => { setNewRole({ name: r.name, description: r.description }); setEditingRoleId(r.id); setShowRoleModal(true); setActiveActionMenu(null); }}><Edit size={16} className="action-menu-icon" /> Modifier</button>
                                    <button className="action-menu-item delete" onClick={() => { handleDeleteRole(r.id); setActiveActionMenu(null); }}><Trash2 size={16} className="action-menu-icon" /> Supprimer</button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* Modal Ajout Application */}
      {showAppModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editingAppId ? "Modifier l'Application" : "Ajouter une Application"}</h3>
            <form onSubmit={handleCreateApp}>
              <div className="form-group">
                <label>Nom de l'application</label>
                <input required value={newApp.name} onChange={e => setNewApp({ ...newApp, name: e.target.value })} placeholder="ex: SIRH, Core Banking" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea required value={newApp.description} onChange={e => setNewApp({ ...newApp, description: e.target.value })} placeholder="Description et usage..." />
              </div>
              <div className="form-group">
                <label>URL de lancement / redirection SSO</label>
                <input required type="url" value={newApp.url} onChange={e => setNewApp({ ...newApp, url: e.target.value })} placeholder="https://sirh.bcrg.gn" />
              </div>
              <div className="form-group">
                <label>URL du Logo / Icône PWA (optionnel)</label>
                <input type="url" value={newApp.icon_url || ''} onChange={e => setNewApp({ ...newApp, icon_url: e.target.value })} placeholder="https://domain.com/logo.png (détecté automatiquement si vide)" />
              </div>

              <div className="form-group">
                <label>Statut</label>
                <select value={newApp.status} onChange={e => setNewApp({ ...newApp, status: e.target.value })}>
                  <option value="Actif">Actif</option>
                  <option value="En maintenance">En maintenance</option>
                  <option value="Inactif">Inactif</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary-action" onClick={() => setShowAppModal(false)}>Annuler</button>
                <button type="submit" className="btn-primary-action">{editingAppId ? 'Sauvegarder' : "Créer l'application"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajout Rôle */}
      {showRoleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editingRoleId ? "Modifier le Rôle" : "Ajouter un Rôle d'accès (RBAC)"}</h3>
            <form onSubmit={handleCreateRole}>
              <div className="form-group">
                <label>Nom du rôle</label>
                <input required value={newRole.name} onChange={e => setNewRole({ ...newRole, name: e.target.value })} placeholder="ex: Finance, Opérations" />
              </div>
              <div className="form-group">
                <label>Description du rôle</label>
                <textarea value={newRole.description} onChange={e => setNewRole({ ...newRole, description: e.target.value })} placeholder="Droits associés..." />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary-action" onClick={() => setShowRoleModal(false)}>Annuler</button>
                <button type="submit" className="btn-primary-action">{editingRoleId ? 'Sauvegarder' : 'Créer le rôle'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajout Utilisateur */}
      {showUserModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editingUserId ? "Modifier l'Utilisateur" : "Nouveau Compte Employé"}</h3>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>Prénom</label>
                <input required value={newUser.first_name} onChange={e => setNewUser({ ...newUser, first_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Nom</label>
                <input required value={newUser.last_name} onChange={e => setNewUser({ ...newUser, last_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email Professionnel</label>
                <input required type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="ex: m.diallo@bcrg-guinee.org" />
              </div>
              <div className="form-group">
                <label>Matricule BCRG</label>
                <input required value={newUser.matricule} onChange={e => setNewUser({ ...newUser, matricule: e.target.value })} placeholder="ex: 2005" />
              </div>
              <div className="form-group">
                <label>Département / Direction</label>
                <input value={newUser.department} onChange={e => setNewUser({ ...newUser, department: e.target.value })} placeholder="ex: Informatique & Systèmes" />
              </div>
              <div className="form-group">
                <label>Rôle initial</label>
                <select value={newUser.role_id} onChange={e => setNewUser({ ...newUser, role_id: e.target.value })}>
                  <option value="">Sélectionner un rôle...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Mot de passe {editingUserId && "(Laissez vide pour ne pas modifier)"}</label>
                <input type="password" value={newUser.password || ''} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="Mot de passe" required={!editingUserId} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary-action" onClick={() => setShowUserModal(false)}>Annuler</button>
                <button type="submit" className="btn-primary-action">{editingUserId ? 'Sauvegarder' : "Créer l'utilisateur"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Importation CSV */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Importation en Masse (CSV / XLSX)</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>
              Format attendu: Matricule, Nom, Prénom, Email, Département, Rôle
            </p>
            <form onSubmit={handleImportCSV}>
              <div className="form-group">
                <label>Sélectionner le fichier .csv</label>
                <input type="file" accept=".csv" onChange={e => setImportFile(e.target.files[0])} required />
              </div>
              {importResult && (
                <div style={{ padding: '15px', background: '#f0fdf4', borderRadius: '8px', color: '#166534', marginBottom: '15px', fontSize: '0.85rem' }}>
                  {importResult.message} ({importResult.createdCount} créés, {importResult.errors ? importResult.errors.length : 0} erreurs)
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn-secondary-action" onClick={() => { setShowImportModal(false); setImportResult(null); }}>Fermer</button>
                <button type="submit" className="btn-primary-action">Lancer l'importation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Assignation App à un Utilisateur ou Rôle */}
      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Assigner une Application</h3>
            <form onSubmit={handleAssignApp}>
              <div className="form-group">
                <label>Sélectionner le Groupe / Rôle</label>
                <select
                  required
                  value={assignForm.role_id}
                  onChange={e => setAssignForm({ ...assignForm, targetType: 'role', role_id: e.target.value })}
                >
                  <option value="">Choisir un rôle...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Sélectionner l'Application</label>
                <select
                  required
                  value={assignForm.app_id}
                  onChange={e => setAssignForm({ ...assignForm, app_id: e.target.value })}
                >
                  <option value="">Choisir une application...</option>
                  {apps.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              {assignResult && (
                <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '8px', color: '#166534', marginBottom: '15px', fontSize: '0.85rem' }}>
                  {assignResult}
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn-secondary-action" onClick={() => { setShowAssignModal(false); setAssignResult(null); setAssignForm({ targetType: 'user', user_id: '', role_id: '', app_id: '' }); }}>Fermer</button>
                <button type="submit" className="btn-primary-action">Valider l'habilitation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignRoleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Assigner un rôle à l'Active Directory</h3>
            <form onSubmit={handleAssignRole}>
              
              <div className="form-group">
                <label>Type d'entité</label>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                  <label>
                    <input type="radio" name="ldap_type" value="USER" checked={assignRoleForm.ldap_type === 'USER'} onChange={e => setAssignRoleForm({ ...assignRoleForm, ldap_type: e.target.value, ldap_identifier: '', ldap_name: '' })} /> Utilisateur AD
                  </label>
                  <label>
                    <input type="radio" name="ldap_type" value="GROUP" checked={assignRoleForm.ldap_type === 'GROUP'} onChange={e => setAssignRoleForm({ ...assignRoleForm, ldap_type: e.target.value, ldap_identifier: '', ldap_name: '' })} /> Groupe AD
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>{assignRoleForm.ldap_type === 'USER' ? 'Utilisateur AD' : 'Groupe AD'}</label>
                {loadingLdap ? (
                  <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>Chargement depuis l'Active Directory...</div>
                ) : (
                  <select value={assignRoleForm.ldap_identifier} onChange={e => {
                    const id = e.target.value;
                    const name = e.target.options[e.target.selectedIndex].text;
                    setAssignRoleForm({ ...assignRoleForm, ldap_identifier: id, ldap_name: name });
                  }}>
                    <option value="">Sélectionner...</option>
                    {assignRoleForm.ldap_type === 'USER' && ldapUsers.map(u => (
                      <option key={u.identifier} value={u.identifier}>{u.name || u.first_name + ' ' + u.last_name} ({u.identifier})</option>
                    ))}
                    {assignRoleForm.ldap_type === 'GROUP' && ldapGroups.map(g => (
                      <option key={g.identifier} value={g.identifier}>{g.name} {g.description ? `(${g.description})` : ''}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label>Groupe de rôle</label>
                <select value={assignRoleForm.role_id} onChange={e => setAssignRoleForm({ ...assignRoleForm, role_id: e.target.value })}>
                  <option value="">Choisir un rôle...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {assignRoleResult && (
                <div className="alert" style={{ marginTop: '10px', padding: '10px', borderRadius: '8px', backgroundColor: assignRoleResult.success ? '#e8f5e9' : '#ffebee', color: assignRoleResult.success ? '#2e7d32' : '#c62828' }}>
                  {assignRoleResult.message}
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAssignRoleModal(false)}>Annuler</button>
                <button type="submit" className="btn-primary-action">Confirmer l'ajout</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="admin-content">
        {/* L'accolade fermante pour 'roles' est déjà plus haut, je dois juste ajouter au niveau root du admin-content */}
            {activeTab === 'ldap' && (
              <div style={{ minHeight: 'calc(100vh - 200px)' }}>
                <LdapConfigPanel />
              </div>
            )}
      </div>
    </div>
  );
};

export default AdminPanel;












