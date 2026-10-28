import React, { memo } from 'react';
import { ArrowUpRight, ArrowRight, Wrench } from 'lucide-react';
import { BcrgAppIcon, getAppTags } from './BcrgAppIcon';

export const STATUS_COLORS = {
  'Actif': { bg: '#eefcf6', color: '#065f46', border: '#a7f3d0' },
  'En maintenance': { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  'Inactif': { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' }
};

export const AppCard = memo(({ app, onOpenApp }) => {
  const isMaintenance = app.status === 'En maintenance';
  const isDisabled = app.status !== 'Actif' && !isMaintenance;
  const badge = STATUS_COLORS[app.status] || STATUS_COLORS['Actif'];
  const tags = getAppTags(app);

  const handleClick = () => {
    if (isDisabled) return;
    onOpenApp(app);
  };

  return (
    <article
      className={`bcrg-card ${isMaintenance ? 'bcrg-card-maintenance' : ''} ${isDisabled ? 'bcrg-card-disabled' : ''}`}
      onClick={handleClick}
      style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
      title={
        isMaintenance
          ? `Application en maintenance — Cliquez pour voir les détails`
          : isDisabled
            ? `Application ${app.status}`
            : `Ouvrir ${app.name}`
      }
    >
      {/* Rangée supérieure : Icône à gauche, Statut + SSO Direct à droite */}
      <div className="bcrg-card-top">
        <div className="bcrg-card-icon-box">
          <BcrgAppIcon app={app} size={22} />
        </div>

        <div className="bcrg-card-status-col">
          <div
            className="bcrg-status-badge"
            style={{ backgroundColor: badge.bg, borderColor: badge.border, color: badge.color }}
          >
            <span className="bcrg-dot" style={{ backgroundColor: badge.color }} />
            <span>{app.status}</span>
          </div>
          <span className="bcrg-sso-caption">SSO Direct</span>
        </div>
      </div>

      {/* Titre avec badge lien externe */}
      <div className="bcrg-card-title-row">
        <h3 className="bcrg-card-title">{app.name}</h3>
        <span className="bcrg-ext-badge" aria-hidden="true">
          <ArrowUpRight size={11} color="#ffffff" strokeWidth={2.6} />
        </span>
      </div>

      {/* Description */}
      <p className="bcrg-card-desc">
        {app.description || "Application de gestion et services internes de la Banque Centrale."}
      </p>

      {/* Badges de tags */}
      <div className="bcrg-card-tags">
        {tags.map((tag) => (
          <span key={tag} className="bcrg-tag-pill">{tag}</span>
        ))}
      </div>

      {/* Ligne de séparation */}
      <div className="bcrg-card-divider" />

      {/* Pied de carte : Portail Web à gauche, Bouton Ouvrir à droite */}
      <div className="bcrg-card-footer">
        <span className="bcrg-portal-label">Portail Web</span>
        <button
          type="button"
          className="bcrg-open-button"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          disabled={isDisabled}
          aria-label={isMaintenance ? `Voir les détails de maintenance pour ${app.name}` : `Ouvrir l'application ${app.name}`}
        >
          <span>{isMaintenance ? 'Détails' : 'Ouvrir'}</span>
          {isMaintenance ? <Wrench size={12} /> : <ArrowRight size={13} />}
        </button>
      </div>
    </article>
  );
});

AppCard.displayName = 'AppCard';

export default AppCard;
