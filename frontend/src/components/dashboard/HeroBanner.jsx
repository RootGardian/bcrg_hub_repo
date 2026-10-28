import React, { memo } from 'react';
import { ShieldCheck, Calendar } from 'lucide-react';

export const HeroBanner = memo(({ todayStr }) => {
  return (
    <div className="hero-banner">
      <div className="hero-badge">
        <ShieldCheck size={16} /> PORTAIL EMPLOYÉ BCRG
      </div>
      <div className="hero-main">
        <div>
          <h1 className="hero-title">Tableau de bord Hub BCRG</h1>
          <p className="hero-subtitle">
            Vue globale de vos habilitations. Accédez à vos outils métiers en un seul clic, sans vous reconnecter.
          </p>
        </div>
        <div className="hero-date">
          <Calendar size={16} /> {todayStr}
        </div>
      </div>
    </div>
  );
});

HeroBanner.displayName = 'HeroBanner';

export default HeroBanner;
