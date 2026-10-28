import React, { memo } from 'react';
import {
  ShieldCheck,
  AppWindow,
  CheckCircle2,
  Search,
  UserCheck,
  Plus,
  Users,
  Key,
  Edit,
  Trash2,
  MoreHorizontal
} from 'lucide-react';

export const AdminRolesTab = memo(({
  roles,
  filteredRoles,
  searchTerm,
  onSearchChange,
  activeActionMenu,
  onToggleActionMenu,
  onOpenNewRoleModal,
  onEditRole,
  onDeleteRole,
  onOpenRoleMembersModal,
  onOpenAssignAppModal,
  onOpenAssignRoleModal
}) => {
  const totalAppAssignments = roles.reduce(
    (acc, r) => acc + (r.Applications ? r.Applications.length : 0),
    0
  );

  return (
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
          <div className="kpi-value">{totalAppAssignments}</div>
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

      {/* Toolbar / Search & Actions */}
      <div className="table-toolbar">
        <div className="toolbar-left">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon-inside" aria-hidden="true" />
            <input
              type="text"
              placeholder="Rechercher un rôle ou un privilège..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Rechercher un rôle"
            />
          </div>
        </div>
        <div className="toolbar-right">
          <button
            type="button"
            className="btn-secondary-action"
            onClick={onOpenAssignRoleModal}
          >
            <UserCheck size={16} /> Ajouter un utilisateur à un rôle
          </button>
          <button
            type="button"
            className="btn-primary-action"
            onClick={onOpenNewRoleModal}
          >
            <Plus size={18} /> Nouveau Rôle
          </button>
        </div>
      </div>

      {/* Roles Table */}
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
              filteredRoles.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="user-cell-content">
                      <div
                        className="user-avatar-circle"
                        style={{ backgroundColor: '#f3e8ff', color: '#7e22ce' }}
                      >
                        <ShieldCheck size={18} />
                      </div>
                      <div className="user-name-title">{r.name}</div>
                    </div>
                  </td>
                  <td>{r.description || "Rôle d'accès aux ressources du Store BCRG"}</td>
                  <td>
                    {r.Applications && r.Applications.length > 0 ? (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {r.Applications.map((app) => (
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
                      <button
                        type="button"
                        className="action-dots-btn"
                        onClick={() => onToggleActionMenu(`role-${r.id}`)}
                        aria-label="Actions pour ce rôle"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {activeActionMenu === `role-${r.id}` && (
                        <div className="action-menu-dropdown">
                          <button
                            type="button"
                            className="action-menu-item"
                            onClick={() => onOpenRoleMembersModal(r)}
                          >
                            <Users size={16} className="action-menu-icon" /> Voir les membres AD
                          </button>
                          <button
                            type="button"
                            className="action-menu-item"
                            onClick={() => onOpenAssignAppModal(r.id)}
                          >
                            <Key size={16} className="action-menu-icon" /> Assigner App
                          </button>
                          <button
                            type="button"
                            className="action-menu-item"
                            onClick={() => onEditRole(r)}
                          >
                            <Edit size={16} className="action-menu-icon" /> Modifier
                          </button>
                          <button
                            type="button"
                            className="action-menu-item delete"
                            onClick={() => onDeleteRole(r.id)}
                          >
                            <Trash2 size={16} className="action-menu-icon" /> Supprimer
                          </button>
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
  );
});

AdminRolesTab.displayName = 'AdminRolesTab';

export default AdminRolesTab;
