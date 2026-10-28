import React, { memo } from 'react';
import { AppWindow, Search, X } from 'lucide-react';
import AppCard from './AppCard';

export const AppsSection = memo(({
  totalCount,
  filteredApps,
  loading,
  searchQuery,
  onSearchChange,
  onClearSearch,
  onOpenApp
}) => {
  return (
    <section className="apps-section" aria-label="Applications autorisées">
      <div className="apps-section-header">
        <h2 className="section-title">
          Mes Applications ({totalCount})
        </h2>

        {/* Barre de recherche */}
        <div className="apps-search-wrapper">
          <Search size={16} className="apps-search-icon" aria-hidden="true" />
          <input
            id="apps-search-input"
            type="text"
            className="apps-search-input"
            placeholder="Rechercher une application..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            autoComplete="off"
            aria-label="Rechercher parmi vos applications"
          />
          {searchQuery && (
            <button
              type="button"
              className="apps-search-clear"
              onClick={onClearSearch}
              title="Effacer la recherche"
              aria-label="Effacer le texte de recherche"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ color: '#64748b', padding: '30px 0', textAlign: 'center', fontSize: '0.95rem' }}>
          Chargement de vos applications en cours...
        </div>
      ) : totalCount === 0 ? (
        <div className="empty-apps">
          <AppWindow size={48} style={{ color: '#94a3b8', marginBottom: '12px' }} />
          <p>Aucune application ne vous a été assignée pour le moment.</p>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Contactez votre administrateur pour obtenir des accès.
          </p>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="empty-apps">
          <AppWindow size={40} style={{ color: '#94a3b8', marginBottom: '12px' }} />
          <p>Aucun résultat pour « {searchQuery} »</p>
        </div>
      ) : (
        <div className="bcrg-apps-grid">
          {filteredApps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              onOpenApp={onOpenApp}
            />
          ))}
        </div>
      )}
    </section>
  );
});

AppsSection.displayName = 'AppsSection';

export default AppsSection;
