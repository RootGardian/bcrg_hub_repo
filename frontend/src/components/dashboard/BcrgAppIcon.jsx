import React, { useState } from 'react';
import {
  Car,
  Users,
  HeartPulse,
  Landmark,
  FileText,
  AppWindow
} from 'lucide-react';

export const getAppIconComponent = (name = '', description = '') => {
  const text = `${name} ${description}`.toLowerCase();
  if (text.includes('park') || text.includes('véhicule') || text.includes('vehicule') || text.includes('voiture')) {
    return Car;
  }
  if (text.includes('rh') || text.includes('congé') || text.includes('conge') || text.includes('personnel') || text.includes('paie') || text.includes('employ')) {
    return Users;
  }
  if (text.includes('med') || text.includes('santé') || text.includes('sante') || text.includes('soin') || text.includes('docteur') || text.includes('patient')) {
    return HeartPulse;
  }
  if (text.includes('banque') || text.includes('finance') || text.includes('compta') || text.includes('caisse') || text.includes('trésor')) {
    return Landmark;
  }
  if (text.includes('doc') || text.includes('courrier') || text.includes('ged') || text.includes('archive')) {
    return FileText;
  }
  return AppWindow;
};

export const getAppTags = (app) => {
  const text = `${app.name || ''} ${app.description || ''}`.toLowerCase();
  if (text.includes('park') || text.includes('véhicule') || text.includes('voiture')) {
    return ['R+12 Siège', 'Accès Véhicules'];
  }
  if (text.includes('rh') || text.includes('congé') || text.includes('conge') || text.includes('personnel') || text.includes('paie')) {
    return ['Personnel', 'RH'];
  }
  if (text.includes('med') || text.includes('santé') || text.includes('sante') || text.includes('soin')) {
    return ['Santé', 'Médical'];
  }
  if (text.includes('banque') || text.includes('finance') || text.includes('compta')) {
    return ['Finance', 'Trésorerie'];
  }
  if (text.includes('doc') || text.includes('courrier')) {
    return ['Archives', 'GED'];
  }
  return ['Portail Métier', 'BCRG'];
};

export const BcrgAppIcon = ({ app, size = 22 }) => {
  const [imgError, setImgError] = useState(false);
  const IconComponent = getAppIconComponent(app.name, app.description);

  if (app.icon_url && !imgError) {
    return (
      <img
        src={app.icon_url}
        alt={app.name || 'Application icon'}
        onError={() => setImgError(true)}
        style={{ width: '28px', height: '28px', objectFit: 'contain' }}
      />
    );
  }

  return <IconComponent size={size} color="#065f46" strokeWidth={2.2} />;
};

export default BcrgAppIcon;
