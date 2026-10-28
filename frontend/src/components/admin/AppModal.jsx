import React from 'react';

export const AppModal = ({
  isOpen,
  editingAppId,
  appForm,
  onChangeAppForm,
  onSubmit,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{editingAppId ? "Modifier l'Application" : "Ajouter une Application"}</h3>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Nom de l'application</label>
            <input
              required
              value={appForm.name}
              onChange={(e) => onChangeAppForm({ ...appForm, name: e.target.value })}
              placeholder="ex: SIRH, Core Banking"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              required
              value={appForm.description}
              onChange={(e) => onChangeAppForm({ ...appForm, description: e.target.value })}
              placeholder="Description et usage..."
            />
          </div>

          <div className="form-group">
            <label>URL de lancement / redirection SSO</label>
            <input
              required
              type="url"
              value={appForm.url}
              onChange={(e) => onChangeAppForm({ ...appForm, url: e.target.value })}
              placeholder="https://sirh.bcrg.gn"
            />
          </div>

          <div className="form-group">
            <label>URL du Logo / Icône PWA (optionnel)</label>
            <input
              type="url"
              value={appForm.icon_url || ''}
              onChange={(e) => onChangeAppForm({ ...appForm, icon_url: e.target.value })}
              placeholder="https://domain.com/logo.png (détecté automatiquement si vide)"
            />
          </div>

          <div className="form-group">
            <label>URL de Single Logout (SLO - Endpoint de Révocation) (Optionnel)</label>
            <input
              type="url"
              value={appForm.slo_url || ''}
              onChange={(e) => onChangeAppForm({ ...appForm, slo_url: e.target.value })}
              placeholder="https://app.bcrg.gn/api/sso/logout ou http://localhost:5001/api/apps/slo-receiver"
            />
            <small style={{ color: '#64748b', fontSize: '0.8rem', display: 'block', marginTop: '4px' }}>
              Point de terminaison vers lequel le HUB envoie la notification Back-Channel (Jeton RS256) lors du clic sur "Déconnexion".
            </small>
          </div>

          <div className="form-group">
            <label>Mode de connexion</label>
            <select
              value={appForm.auth_type}
              onChange={(e) => onChangeAppForm({ ...appForm, auth_type: e.target.value })}
            >
              <option value="SSO">SSO Sécurisé (Jeton JWT éphémère)</option>
              <option value="NONE">Redirection simple (Sans jeton)</option>
            </select>
            <small style={{ color: '#64748b', fontSize: '0.8rem', display: 'block', marginTop: '4px' }}>
              {appForm.auth_type === 'SSO'
                ? "Le HUB transmettra un jeton SSO temporaire sécurisé à l'application cible."
                : "Le HUB ouvrira l'application telle quelle, l'utilisateur devra se connecter."}
            </small>
          </div>

          <div className="form-group">
            <label>Statut</label>
            <select
              value={appForm.status}
              onChange={(e) => onChangeAppForm({ ...appForm, status: e.target.value })}
            >
              <option value="Actif">Actif</option>
              <option value="En maintenance">En maintenance</option>
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary-action" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn-primary-action">
              {editingAppId ? 'Sauvegarder' : "Créer l'application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppModal;
