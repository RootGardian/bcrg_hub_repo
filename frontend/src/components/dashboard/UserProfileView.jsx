import React, { memo } from 'react';
import {
  ArrowLeft,
  LogOut,
  User as UserIcon,
  Building,
  Hash,
  Mail,
  Phone,
  ShieldCheck
} from 'lucide-react';

export const UserProfileView = memo(({
  user,
  roleName,
  initial,
  appsCount,
  onBack,
  onLogout
}) => {
  return (
    <div className="profile-view">
      <div className="profile-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={onBack}
        >
          <ArrowLeft size={16} /> Retour
        </button>
        <div className="profile-actions-right">
          <button
            type="button"
            className="btn-danger"
            onClick={onLogout}
          >
            <LogOut size={16} /> Se déconnecter
          </button>
        </div>
      </div>

      <div className="profile-card-main">
        <div className="profile-banner" />
        <div className="profile-card-content">
          <div className="profile-avatar-large">{initial}</div>
          <div className="profile-name-section">
            <h2>{user.first_name} {user.last_name}</h2>
            <span className="role-badge">
              <UserIcon size={14} /> {roleName}
            </span>
          </div>
        </div>
      </div>

      <div className="profile-grid">
        <div className="profile-section-card">
          <h3>
            <Building size={18} /> Rattachement Institutionnel
          </h3>
          <div className="profile-info-group">
            <div className="profile-info-item">
              <div className="info-icon">
                <Building size={16} />
              </div>
              <div className="info-text">
                <label>FONCTION / POSTE</label>
                <p>{user.department || 'Non renseigné'}</p>
              </div>
            </div>
            <div className="profile-info-item">
              <div className="info-icon">
                <Hash size={16} />
              </div>
              <div className="info-text">
                <label>MATRICULE AGENT / HÔTE</label>
                <p>{user.matricule || 'Non renseigné'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-section-card">
          <h3>
            <Mail size={18} /> Coordonnées & Contact
          </h3>
          <div className="profile-info-group">
            <div className="profile-info-item">
              <div className="info-icon">
                <Mail size={16} />
              </div>
              <div className="info-text">
                <label>ADRESSE E-MAIL</label>
                <p>{user.email}</p>
              </div>
            </div>
            <div className="profile-info-item">
              <div className="info-icon">
                <Phone size={16} />
              </div>
              <div className="info-text">
                <label>TÉLÉPHONE / FLOTTE INTERNE</label>
                <p>Non renseigné</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-section-card full-width">
        <h3>
          <ShieldCheck size={18} /> Habilitations & Permissions Applicatives
        </h3>
        <p className="permissions-text">
          Droits standards associés au rôle <strong>{roleName}</strong>. {appsCount} application(s) accessibles.
        </p>
      </div>
    </div>
  );
});

UserProfileView.displayName = 'UserProfileView';

export default UserProfileView;
