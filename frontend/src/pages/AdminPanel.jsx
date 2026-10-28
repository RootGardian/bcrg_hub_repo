import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  Users,
  AppWindow,
  ShieldCheck,
  Database,
  Lock
} from 'lucide-react';
import './AdminPanel.css';

// Panels & Tabs
import LdapConfigPanel from './LdapConfigPanel';
import SecurityPanel from './SecurityPanel';
import { AdminStatsTab } from '../components/admin/AdminStatsTab';
import { AdminAppsTab } from '../components/admin/AdminAppsTab';
import { AdminUsersTab } from '../components/admin/AdminUsersTab';
import { AdminRolesTab } from '../components/admin/AdminRolesTab';

// Modals
import { AppModal } from '../components/admin/AppModal';
import { RoleModal } from '../components/admin/RoleModal';
import UserModal from '../components/admin/UserModal';
import AssignAppModal from '../components/admin/AssignAppModal';
import AssignRoleModal from '../components/admin/AssignRoleModal';
import RoleMembersModal from '../components/admin/RoleMembersModal';
import { ConfirmDialog } from '../components/admin/ConfirmDialog';
import { ToastNotification } from '../components/admin/ToastNotification';

// Custom Data Hook
import { useAdminData } from '../hooks/useAdminData';

/**
 * AdminPanel Orchestrator Component
 * Refactored to Single Responsibility Principle (SRP) with feature-based architecture.
 */
const AdminPanel = ({
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
  hideTabsHeader = false
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState('stats');
  const activeTab = propActiveTab || internalActiveTab;
  const setActiveTab = propSetActiveTab || setInternalActiveTab;

  const [searchTerm, setSearchTerm] = useState('');
  const [activeActionMenu, setActiveActionMenu] = useState(null);

  // Toast & In-App Confirm Dialogs
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const requestConfirm = useCallback((message, onConfirm) => {
    setConfirmDialog({ message, onConfirm });
  }, []);

  // Admin Data Management
  const {
    loading,
    stats,
    usersList,
    apps,
    roles,
    ldapUsers,
    ldapGroups,
    loadingLdap,
    ldapError,
    fetchStats,
    fetchUsers,
    fetchApps,
    fetchRoles,
    fetchLdapEntities,
    saveApp,
    deleteApp,
    saveUser,
    deleteUser,
    revokeUserSessions,
    saveRole,
    deleteRole,
    revokeLdapMapping,
    assignApp,
    assignRoleToLdap
  } = useAdminData();

  // Load appropriate data on mount or tab change
  useEffect(() => {
    fetchStats();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'apps') fetchApps();
    if (activeTab === 'roles') fetchRoles();
    if (activeTab === 'stats') {
      fetchUsers();
      fetchApps();
      fetchRoles();
    }
  }, [activeTab, fetchStats, fetchUsers, fetchApps, fetchRoles]);

  // Close action menus when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.dropdown-action-menu') && !e.target.closest('.btn-table-action')) {
        setActiveActionMenu(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Filtered lists (memoized for performance)
  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return usersList.filter(
      (u) =>
        `${u.first_name || ''} ${u.last_name || ''} ${u.email || ''} ${u.matricule || ''}`
          .toLowerCase()
          .includes(term)
    );
  }, [usersList, searchTerm]);

  const filteredApps = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return apps.filter(
      (a) =>
        `${a.name || ''} ${a.url || ''}`.toLowerCase().includes(term)
    );
  }, [apps, searchTerm]);

  const filteredRoles = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return roles.filter(
      (r) =>
        `${r.name || ''} ${r.description || ''}`.toLowerCase().includes(term)
    );
  }, [roles, searchTerm]);

  // Modal States
  // 1. App Modal
  const [showAppModal, setShowAppModal] = useState(false);
  const [editingAppId, setEditingAppId] = useState(null);
  const [appForm, setAppForm] = useState({
    name: '',
    url: '',
    description: '',
    auth_type: 'SSO',
    status: 'Actif',
    icon_url: '',
    slo_url: ''
  });

  const handleOpenNewAppModal = useCallback(() => {
    setEditingAppId(null);
    setAppForm({
      name: '',
      url: '',
      description: '',
      auth_type: 'SSO',
      status: 'Actif',
      icon_url: '',
      slo_url: ''
    });
    setShowAppModal(true);
  }, []);

  const handleEditApp = useCallback((app) => {
    setEditingAppId(app.id);
    setAppForm({
      name: app.name || '',
      url: app.url || '',
      description: app.description || '',
      auth_type: app.auth_type || 'SSO',
      status: app.status || 'Actif',
      icon_url: app.icon_url || '',
      slo_url: app.slo_url || ''
    });
    setShowAppModal(true);
    setActiveActionMenu(null);
  }, []);

  const handleDeleteApp = useCallback((id, name) => {
    setActiveActionMenu(null);
    requestConfirm(`Êtes-vous sûr de vouloir supprimer l'application "${name}" ?`, async () => {
      try {
        await deleteApp(id);
        showToast('Application supprimée avec succès');
      } catch {
        showToast("Erreur lors de la suppression de l'application", 'error');
      }
    });
  }, [requestConfirm, deleteApp, showToast]);

  const handleSaveAppSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      setShowAppModal(false);
      await saveApp(appForm, editingAppId);
      showToast(editingAppId ? 'Application modifiée avec succès' : 'Application créée avec succès');
    } catch {
      showToast("Erreur lors de l'enregistrement de l'application", 'error');
    }
  }, [appForm, editingAppId, saveApp, showToast]);

  // 2. Role Modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });

  const handleOpenNewRoleModal = useCallback(() => {
    setEditingRoleId(null);
    setRoleForm({ name: '', description: '' });
    setShowRoleModal(true);
  }, []);

  const handleEditRole = useCallback((role) => {
    setEditingRoleId(role.id);
    setRoleForm({ name: role.name || '', description: role.description || '' });
    setShowRoleModal(true);
    setActiveActionMenu(null);
  }, []);

  const handleDeleteRole = useCallback((id, name) => {
    setActiveActionMenu(null);
    requestConfirm(`Êtes-vous sûr de vouloir supprimer le rôle "${name}" ?`, async () => {
      try {
        await deleteRole(id);
        showToast('Rôle supprimé avec succès');
      } catch {
        showToast('Erreur lors de la suppression du rôle', 'error');
      }
    });
  }, [requestConfirm, deleteRole, showToast]);

  const handleSaveRoleSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      setShowRoleModal(false);
      await saveRole(roleForm, editingRoleId);
      showToast(editingRoleId ? 'Rôle mis à jour avec succès' : 'Rôle créé avec succès');
    } catch {
      showToast("Erreur lors de l'enregistrement du rôle", 'error');
    }
  }, [roleForm, editingRoleId, saveRole, showToast]);

  // 3. User Modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userForm, setUserForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    matricule: '',
    department: '',
    is_admin: false
  });

  const handleOpenEditUserModal = useCallback((u) => {
    setEditingUserId(u.id);
    setUserForm({
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      email: u.email || '',
      matricule: u.matricule || '',
      department: u.department || '',
      is_admin: Boolean(u.is_admin)
    });
    setShowUserModal(true);
    setActiveActionMenu(null);
  }, []);

  const handleSaveUserSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!editingUserId) return;
    try {
      setShowUserModal(false);
      await saveUser(userForm, editingUserId);
      showToast('Utilisateur mis à jour avec succès');
    } catch (err) {
      showToast(err.response?.data?.message || "Erreur lors de la mise à jour de l'utilisateur", 'error');
    }
  }, [editingUserId, userForm, saveUser, showToast]);

  const handleDeleteUser = useCallback((id, name) => {
    setActiveActionMenu(null);
    requestConfirm(`Êtes-vous sûr de vouloir supprimer le compte de "${name}" ?`, async () => {
      try {
        await deleteUser(id);
        showToast('Compte utilisateur supprimé avec succès');
      } catch {
        showToast("Erreur lors de la suppression de l'utilisateur", 'error');
      }
    });
  }, [requestConfirm, deleteUser, showToast]);

  const handleRevokeSessions = useCallback((userId, name) => {
    setActiveActionMenu(null);
    requestConfirm(`Révoquer immédiatement toutes les sessions actives de "${name}" ?`, async () => {
      try {
        const msg = await revokeUserSessions(userId);
        showToast(msg || 'Sessions révoquées avec succès');
      } catch {
        showToast('Erreur lors de la révocation des sessions', 'error');
      }
    });
  }, [requestConfirm, revokeUserSessions, showToast]);

  // 4. Assign App Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    targetType: 'role',
    user_id: '',
    role_id: '',
    ldap_identifier: '',
    ldap_name: '',
    app_id: ''
  });
  const [assignResult, setAssignResult] = useState(null);

  const handleOpenAssignModal = useCallback((defaultAppId = null, defaultTargetType = 'role', defaultTargetId = null) => {
    setAssignForm({
      targetType: defaultTargetType,
      user_id: defaultTargetType === 'user' ? (defaultTargetId || '') : '',
      role_id: defaultTargetType === 'role' ? (defaultTargetId || '') : '',
      ldap_identifier: defaultTargetType === 'group' ? (defaultTargetId || '') : '',
      ldap_name: '',
      app_id: defaultAppId || ''
    });
    setAssignResult(null);
    setShowAssignModal(true);
    setActiveActionMenu(null);
    fetchLdapEntities();
  }, [fetchLdapEntities]);

  const handleAssignAppSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      const msg = await assignApp(assignForm);
      setAssignResult(msg || 'Application assignée avec succès !');
      setTimeout(() => {
        setShowAssignModal(false);
        setAssignResult(null);
        showToast('Habilitation enregistrée avec succès');
      }, 1200);
    } catch (err) {
      showToast(err.response?.data?.message || "Erreur lors de l'assignation", 'error');
    }
  }, [assignApp, assignForm, showToast]);

  // 5. Assign Role to AD Modal
  const [showAssignRoleModal, setShowAssignRoleModal] = useState(false);
  const [assignRoleForm, setAssignRoleForm] = useState({
    ldap_type: 'USER',
    ldap_identifier: '',
    role_id: '',
    ldap_name: ''
  });
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [isLdapDropdownOpen, setIsLdapDropdownOpen] = useState(false);
  const [assignRoleResult, setAssignRoleResult] = useState(null);

  const handleOpenAssignRoleModal = useCallback((defaultRoleId = '') => {
    setAssignRoleForm({
      ldap_type: 'USER',
      ldap_identifier: '',
      role_id: defaultRoleId || '',
      ldap_name: ''
    });
    setModalSearchTerm('');
    setAssignRoleResult(null);
    setShowAssignRoleModal(true);
    setActiveActionMenu(null);
    fetchLdapEntities();
  }, [fetchLdapEntities]);

  const handleAssignRoleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!assignRoleForm.ldap_identifier || !assignRoleForm.role_id) {
      setAssignRoleResult({ success: false, message: 'Veuillez sélectionner une entité AD et un rôle' });
      return;
    }
    try {
      await assignRoleToLdap(assignRoleForm);
      setAssignRoleResult({ success: true, message: 'Rôle assigné avec succès !' });
      setTimeout(() => {
        setShowAssignRoleModal(false);
        setAssignRoleResult(null);
        showToast('Rôle AD synchronisé avec succès');
      }, 1400);
    } catch (err) {
      setAssignRoleResult({
        success: false,
        message: err.response?.data?.message || "Erreur lors de l'assignation"
      });
    }
  }, [assignRoleForm, assignRoleToLdap, showToast]);

  // 6. Role Members Modal
  const [showRoleMembersModal, setShowRoleMembersModal] = useState(false);
  const [selectedRoleForMembers, setSelectedRoleForMembers] = useState(null);

  const handleOpenRoleMembersModal = useCallback((role) => {
    setSelectedRoleForMembers(role);
    setShowRoleMembersModal(true);
    setActiveActionMenu(null);
  }, []);

  const handleRevokeLdap = useCallback(async (mappingId) => {
    requestConfirm('Voulez-vous retirer cette affectation de rôle AD ?', async () => {
      try {
        await revokeLdapMapping(mappingId);
        showToast('Affectation révoquée avec succès');
        setShowRoleMembersModal(false);
      } catch {
        showToast('Erreur lors de la révocation', 'error');
      }
    });
  }, [requestConfirm, revokeLdapMapping, showToast]);

  return (
    <div className="admin-panel">
      {!hideTabsHeader && (
        <>
          <div className="admin-header">
            <h2>Espace d'Administration</h2>
            <p>Gérez les applications, les utilisateurs et les droits d'accès.</p>
          </div>

          <div className="admin-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'stats'}
              className={`admin-tab ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              <BarChart3 size={16} /> Statistiques
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'users'}
              className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={16} /> Utilisateurs
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'apps'}
              className={`admin-tab ${activeTab === 'apps' ? 'active' : ''}`}
              onClick={() => setActiveTab('apps')}
            >
              <AppWindow size={16} /> Applications
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'roles'}
              className={`admin-tab ${activeTab === 'roles' ? 'active' : ''}`}
              onClick={() => setActiveTab('roles')}
            >
              <ShieldCheck size={16} /> Rôles & Permissions
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'ldap'}
              className={`admin-tab ${activeTab === 'ldap' ? 'active' : ''}`}
              onClick={() => setActiveTab('ldap')}
            >
              <Database size={16} /> LDAP & AD
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'security'}
              className={`admin-tab ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <Lock size={16} /> Sécurité & Conformité
            </button>
          </div>
        </>
      )}

      <div className="admin-content">
        {loading && activeTab !== 'ldap' && activeTab !== 'security' ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#6c8093' }}>
            <p style={{ fontWeight: 600, fontSize: '1rem' }}>Chargement des données en cours...</p>
          </div>
        ) : (
          <>
            {activeTab === 'stats' && (
              <AdminStatsTab
                stats={stats}
                apps={apps}
                onNavigateTab={setActiveTab}
                onOpenNewAppModal={handleOpenNewAppModal}
                onOpenAssignModal={() => handleOpenAssignModal()}
              />
            )}

            {activeTab === 'apps' && (
              <AdminAppsTab
                apps={apps}
                filteredApps={filteredApps}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                activeActionMenu={activeActionMenu}
                onToggleActionMenu={(id) => setActiveActionMenu((prev) => (prev === id ? null : id))}
                onOpenNewAppModal={handleOpenNewAppModal}
                onEditApp={handleEditApp}
                onDeleteApp={handleDeleteApp}
                onOpenAssignModal={(appId) => handleOpenAssignModal(appId, 'role')}
              />
            )}

            {activeTab === 'users' && (
              <AdminUsersTab
                usersList={usersList}
                filteredUsers={filteredUsers}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                activeActionMenu={activeActionMenu}
                onToggleActionMenu={(id) => setActiveActionMenu((prev) => (prev === id ? null : id))}
                onOpenEditUserModal={handleOpenEditUserModal}
                onAssignAppToUser={(userId) => handleOpenAssignModal(null, 'user', userId)}
                onRevokeSessions={handleRevokeSessions}
                onDeleteUser={handleDeleteUser}
              />
            )}

            {activeTab === 'roles' && (
              <AdminRolesTab
                roles={roles}
                filteredRoles={filteredRoles}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                activeActionMenu={activeActionMenu}
                onToggleActionMenu={(id) => setActiveActionMenu((prev) => (prev === id ? null : id))}
                onOpenNewRoleModal={handleOpenNewRoleModal}
                onEditRole={handleEditRole}
                onDeleteRole={handleDeleteRole}
                onOpenRoleMembersModal={handleOpenRoleMembersModal}
                onOpenAssignAppModal={(roleId) => handleOpenAssignModal(null, 'role', roleId)}
                onOpenAssignRoleModal={handleOpenAssignRoleModal}
              />
            )}

            {activeTab === 'ldap' && (
              <div style={{ minHeight: 'calc(100vh - 200px)' }}>
                <LdapConfigPanel />
              </div>
            )}

            {activeTab === 'security' && (
              <div style={{ minHeight: 'calc(100vh - 200px)' }}>
                <SecurityPanel />
              </div>
            )}
          </>
        )}
      </div>

      {/* --- MODALS --- */}
      <AppModal
        isOpen={showAppModal}
        editingAppId={editingAppId}
        appForm={appForm}
        onChangeAppForm={setAppForm}
        onSubmit={handleSaveAppSubmit}
        onClose={() => setShowAppModal(false)}
      />

      <RoleModal
        isOpen={showRoleModal}
        editingRoleId={editingRoleId}
        roleForm={roleForm}
        onChangeRoleForm={setRoleForm}
        onSubmit={handleSaveRoleSubmit}
        onClose={() => setShowRoleModal(false)}
      />

      <UserModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        usersList={usersList}
        editingUserId={editingUserId}
        setEditingUserId={setEditingUserId}
        newUser={userForm}
        setNewUser={setUserForm}
        onSubmit={handleSaveUserSubmit}
      />

      <AssignAppModal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setAssignResult(null);
        }}
        assignForm={assignForm}
        setAssignForm={setAssignForm}
        ldapGroups={ldapGroups}
        loadingLdap={loadingLdap}
        fetchLdapEntities={fetchLdapEntities}
        roles={roles}
        usersList={usersList}
        apps={apps}
        assignResult={assignResult}
        onSubmit={handleAssignAppSubmit}
      />

      <AssignRoleModal
        isOpen={showAssignRoleModal}
        onClose={() => {
          setShowAssignRoleModal(false);
          setModalSearchTerm('');
        }}
        assignRoleForm={assignRoleForm}
        setAssignRoleForm={setAssignRoleForm}
        ldapUsers={ldapUsers}
        ldapGroups={ldapGroups}
        loadingLdap={loadingLdap}
        ldapError={ldapError}
        fetchLdapEntities={fetchLdapEntities}
        modalSearchTerm={modalSearchTerm}
        setModalSearchTerm={setModalSearchTerm}
        isLdapDropdownOpen={isLdapDropdownOpen}
        setIsLdapDropdownOpen={setIsLdapDropdownOpen}
        roles={roles}
        assignRoleResult={assignRoleResult}
        onSubmit={handleAssignRoleSubmit}
      />

      <RoleMembersModal
        isOpen={showRoleMembersModal}
        role={selectedRoleForMembers}
        onClose={() => setShowRoleMembersModal(false)}
        onRevoke={handleRevokeLdap}
      />

      {/* Pop-up de confirmation in-app (remplace window.confirm) */}
      <ConfirmDialog
        confirmDialog={confirmDialog}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={() => {
          const fn = confirmDialog?.onConfirm;
          setConfirmDialog(null);
          if (fn) fn();
        }}
      />

      {/* Toast Notification */}
      <ToastNotification toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};

export default AdminPanel;
