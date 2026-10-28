import React, { memo } from 'react';
import {
  AppWindow,
  Key,
  ShieldCheck,
  Search,
  Filter,
  Plus,
  ExternalLink,
  MoreHorizontal,
  Edit,
  Trash2
} from 'lucide-react';
import AppLogo from './AppLogo';

export const AdminAppsTab = memo(({
  apps,
  filteredApps,
  searchTerm,
  onSearchChange,
  activeActionMenu,
  onToggleActionMenu,
  onOpenNewAppModal,
  onEditApp,
  onDeleteApp,
  onOpenAssignModal
}) => {
  return (
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

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-title">Single Logout (SLO)</span>
            <div className="kpi-icon-box purple"><ShieldCheck size={18} /></div>
          </div>
          <div className="kpi-value">
            {apps.filter((a) => a.slo_url).length} / {apps.length}
          </div>
          <span className="kpi-badge purple">Endpoints configurés</span>
        </div>
      </div>

      {/* Toolbar / Search & Add */}
      <div className="table-toolbar">
        <div className="toolbar-left">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon-inside" aria-hidden="true" />
            <input
              type="text"
              placeholder="Rechercher une application (nom, auth, url)..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Rechercher une application"
            />
          </div>
          <button type="button" className="btn-filter">
            <Filter size={14} /> Filtrer
          </button>
        </div>
        <div className="toolbar-right">
          <button
            type="button"
            className="btn-secondary-action"
            onClick={onOpenAssignModal}
          >
            <Key size={16} /> Assigner une Application
          </button>
          <button
            type="button"
            className="btn-primary-action"
            onClick={onOpenNewAppModal}
          >
            <Plus size={18} /> Nouvelle Application
          </button>
        </div>
      </div>

      {/* Applications Table */}
      <div className="table-card-container">
        <table className="bcrg-table">
          <thead>
            <tr>
              <th>Application</th>
              <th>Type Authentification</th>
              <th>URL Redirection</th>
              <th>Déconnexion Globale (SLO)</th>
              <th>Statut</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredApps.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Aucune application trouvée.
                </td>
              </tr>
            ) : (
              filteredApps.map((app) => (
                <tr key={app.id}>
                  <td>
                    <div className="user-cell-content">
                      <div
                        className="user-avatar-circle"
                        style={{
                          backgroundColor: '#e0f2fe',
                          color: '#0284c7',
                          borderRadius: '10px',
                          overflow: 'hidden'
                        }}
                      >
                        <AppLogo app={app} size={24} />
                      </div>
                      <div>
                        <div className="user-name-title">{app.name}</div>
                        <div className="user-subtext">
                          {app.description || "Application d'entreprise BCRG"}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span
                      className={`badge-pill-type ${
                        app.auth_type === 'SSO' || !app.auth_type ? 'badge-pill-purple' : 'badge-pill-blue'
                      }`}
                    >
                      {app.auth_type === 'SSO' || !app.auth_type ? 'SSO Sécurisé' : 'Redirection simple'}
                    </span>
                  </td>

                  <td>
                    <a
                      href={app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#0284c7',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        textDecoration: 'none'
                      }}
                    >
                      {app.url} <ExternalLink size={12} />
                    </a>
                  </td>

                  <td>
                    {app.slo_url ? (
                      <span
                        className="badge-pill-type badge-pill-green"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        title={`Endpoint Back-Channel : ${app.slo_url}`}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: '#10b981'
                          }}
                        />{' '}
                        SLO Actif
                      </span>
                    ) : (
                      <span
                        className="badge-pill-type"
                        style={{ background: '#f1f5f9', color: '#64748b' }}
                        title="Non renseigné - Déconnexion locale uniquement"
                      >
                        Non configuré
                      </span>
                    )}
                  </td>

                  <td>
                    <span
                      className={`status-capsule ${
                        app.status === 'Actif'
                          ? 'active'
                          : app.status === 'En maintenance'
                          ? 'maintenance'
                          : 'inactive'
                      }`}
                    >
                      {app.status || 'Actif'}
                    </span>
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <div className="action-menu-wrapper">
                      <button
                        type="button"
                        className="action-dots-btn"
                        onClick={() => onToggleActionMenu(`app-${app.id}`)}
                        aria-label="Actions pour cette application"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {activeActionMenu === `app-${app.id}` && (
                        <div className="action-menu-dropdown">
                          <button
                            type="button"
                            className="action-menu-item"
                            onClick={() => onEditApp(app)}
                          >
                            <Edit size={16} className="action-menu-icon" /> Modifier
                          </button>
                          <button
                            type="button"
                            className="action-menu-item delete"
                            onClick={() => onDeleteApp(app.id)}
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

AdminAppsTab.displayName = 'AdminAppsTab';

export default AdminAppsTab;
