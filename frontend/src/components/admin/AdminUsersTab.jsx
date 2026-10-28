import React, { memo } from 'react';
import {
  Users,
  UserCheck,
  ShieldCheck,
  Search,
  Edit,
  Key,
  UserX,
  Trash2,
  MoreHorizontal
} from 'lucide-react';

export const AdminUsersTab = memo(({
  usersList,
  filteredUsers,
  searchTerm,
  onSearchChange,
  activeActionMenu,
  onToggleActionMenu,
  onOpenEditUserModal,
  onAssignAppToUser,
  onRevokeSessions,
  onDeleteUser
}) => {
  const activeCount = usersList.filter((u) => u.is_active).length;
  const adminCount = usersList.filter((u) => u.is_admin).length;

  return (
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
          <div className="kpi-value">{activeCount}</div>
          <span className="kpi-badge blue">Habilités SSO</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Profils Administrateur</span>
            <div className="kpi-icon-box purple"><ShieldCheck size={18} /></div>
          </div>
          <div className="kpi-value">{adminCount}</div>
          <span className="kpi-badge purple">Privilèges élevés</span>
        </div>
      </div>

      {/* Toolbar / Search & Actions */}
      <div className="table-toolbar">
        <div className="toolbar-left">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon-inside" aria-hidden="true" />
            <input
              type="text"
              placeholder="Rechercher un employé (nom, matricule, email)..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Rechercher un employé"
            />
          </div>
        </div>
        <div className="toolbar-right" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-primary-action"
            onClick={() => onOpenEditUserModal(usersList[0])}
          >
            <Edit size={16} /> Modifier l'Utilisateur & ses Droits
          </button>
        </div>
      </div>

      {/* Users Table */}
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
              filteredUsers.map((u) => {
                const userInitials = u.first_name
                  ? `${u.first_name.charAt(0)}${u.last_name ? u.last_name.charAt(0) : ''}`.toUpperCase()
                  : 'U';
                const roleText =
                  u.Roles && u.Roles.length > 0
                    ? u.Roles.map((r) => r.name).join(', ')
                    : u.is_admin
                    ? 'Administrateur'
                    : 'Employé Standard';

                return (
                  <tr key={u.id}>
                    <td>
                      <div className="user-cell-content">
                        <div className="user-avatar-circle">{userInitials}</div>
                        <div>
                          <div className="user-name-title">
                            {u.first_name} {u.last_name}
                          </div>
                          <div className="user-subtext">
                            Matricule: {u.matricule || 'Non renseigné'}
                          </div>
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
                        <button
                          type="button"
                          className="action-dots-btn"
                          onClick={() => onToggleActionMenu(`user-${u.id}`)}
                          aria-label="Actions pour cet utilisateur"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {activeActionMenu === `user-${u.id}` && (
                          <div className="action-menu-dropdown">
                            <button
                              type="button"
                              className="action-menu-item"
                              onClick={() => onOpenEditUserModal(u)}
                            >
                              <Edit size={16} className="action-menu-icon" /> Modifier les Droits
                            </button>
                            <button
                              type="button"
                              className="action-menu-item"
                              onClick={() => onAssignAppToUser(u)}
                            >
                              <Key size={16} className="action-menu-icon" /> Assigner App
                            </button>
                            <button
                              type="button"
                              className="action-menu-item"
                              style={{ color: '#ea580c' }}
                              onClick={() => onRevokeSessions(u.id, u.email || u.matricule)}
                            >
                              <UserX size={16} className="action-menu-icon" /> Révoquer Sessions
                            </button>
                            <button
                              type="button"
                              className="action-menu-item delete"
                              onClick={() => onDeleteUser(u.id)}
                            >
                              <Trash2 size={16} className="action-menu-icon" /> Supprimer
                            </button>
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
  );
});

AdminUsersTab.displayName = 'AdminUsersTab';

export default AdminUsersTab;
