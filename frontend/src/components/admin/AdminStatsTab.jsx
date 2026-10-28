import React, { memo } from 'react';
import { AppWindow, Users, ShieldCheck, Plus, Key } from 'lucide-react';
import AppLogo from './AppLogo';

export const AdminStatsTab = memo(({
  stats,
  apps,
  onNavigateTab,
  onOpenNewAppModal,
  onOpenAssignModal
}) => {
  return (
    <>
      {/* 3 KPI Cards Grid */}
      <div className="kpi-cards-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="kpi-card" onClick={() => onNavigateTab('apps')} style={{ cursor: 'pointer' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-title">Applications au catalogue</span>
            <div className="kpi-icon-box blue"><AppWindow size={20} /></div>
          </div>
          <div className="kpi-value">{stats.applications}</div>
          <span className="kpi-badge blue">Gérer le catalogue &rarr;</span>
        </div>

        <div className="kpi-card" onClick={() => onNavigateTab('users')} style={{ cursor: 'pointer' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-title">Employés enregistrés</span>
            <div className="kpi-icon-box green"><Users size={20} /></div>
          </div>
          <div className="kpi-value">{stats.users}</div>
          <span className="kpi-badge green">Gérer les comptes &rarr;</span>
        </div>

        <div className="kpi-card" onClick={() => onNavigateTab('roles')} style={{ cursor: 'pointer' }}>
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
            <button
              type="button"
              className="btn-secondary-action"
              onClick={() => onNavigateTab('apps')}
            >
              Tout voir
            </button>
          </div>

          {apps.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.9rem', paddingTop: '10px' }}>
              Aucune application configurée.
            </p>
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
                {apps.slice(0, 4).map((app) => (
                  <tr key={app.id}>
                    <td>
                      <div className="user-cell-content">
                        <div
                          className="user-avatar-circle"
                          style={{
                            backgroundColor: '#e0f2fe',
                            color: '#0284c7',
                            width: '30px',
                            height: '30px',
                            borderRadius: '8px',
                            overflow: 'hidden'
                          }}
                        >
                          <AppLogo app={app} size={20} />
                        </div>
                        <strong>{app.name}</strong>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge-pill-type ${
                          app.auth_type === 'SSO' || !app.auth_type ? 'badge-pill-purple' : 'badge-pill-blue'
                        }`}
                      >
                        {app.auth_type === 'SSO' || !app.auth_type ? 'SSO' : 'Redirection'}
                      </span>
                    </td>
                    <td>
                      <span className="status-capsule active">{app.status || 'Actif'}</span>
                    </td>
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
            <button
              type="button"
              className="btn-primary-action"
              style={{ justifyContent: 'flex-start' }}
              onClick={onOpenNewAppModal}
            >
              <Plus size={18} /> Ajouter une nouvelle application
            </button>
            <button
              type="button"
              className="btn-secondary-action"
              style={{ justifyContent: 'flex-start' }}
              onClick={onOpenAssignModal}
            >
              <Key size={18} /> Assigner une application à un utilisateur / rôle
            </button>
          </div>
        </div>
      </div>
    </>
  );
});

AdminStatsTab.displayName = 'AdminStatsTab';

export default AdminStatsTab;
