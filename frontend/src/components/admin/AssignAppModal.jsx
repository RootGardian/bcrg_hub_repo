import React from 'react';
import { RefreshCw } from 'lucide-react';
import AdEntityPicker from './AdEntityPicker';

/**
 * AssignAppModal Component
 * Assign an application to an AD Group, Application Role, or specific User.
 */
const AssignAppModal = ({
  isOpen,
  onClose,
  assignForm,
  setAssignForm,
  ldapGroups = [],
  loadingLdap = false,
  fetchLdapEntities,
  roles = [],
  usersList = [],
  apps = [],
  assignResult,
  onSubmit
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="assign-app-modal-title">
      <div className="modal-content" style={{ maxWidth: '720px', width: '100%' }}>
        <h3 id="assign-app-modal-title">Assigner une Application</h3>
        <form onSubmit={onSubmit}>
          {/* Choix du type de cible */}
          <div className="form-group">
            <label>Type d'attribution</label>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 500 }}>
                <input
                  type="radio"
                  name="assign_targetType"
                  value="group"
                  checked={assignForm.targetType === 'group'}
                  onChange={() => {
                    setAssignForm({
                      ...assignForm,
                      targetType: 'group',
                      role_id: '',
                      user_id: '',
                      ldap_identifier: '',
                      ldap_name: ''
                    });
                  }}
                />
                Groupe Active Directory (AD)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 500 }}>
                <input
                  type="radio"
                  name="assign_targetType"
                  value="role"
                  checked={assignForm.targetType === 'role'}
                  onChange={() => {
                    setAssignForm({
                      ...assignForm,
                      targetType: 'role',
                      ldap_identifier: '',
                      ldap_name: '',
                      user_id: ''
                    });
                  }}
                />
                Rôle Applicatif BCRG
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 500 }}>
                <input
                  type="radio"
                  name="assign_targetType"
                  value="user"
                  checked={assignForm.targetType === 'user'}
                  onChange={() => {
                    setAssignForm({
                      ...assignForm,
                      targetType: 'user',
                      role_id: '',
                      ldap_identifier: '',
                      ldap_name: ''
                    });
                  }}
                />
                Utilisateur spécifique
              </label>
            </div>
          </div>

          {/* Cas 1: Groupe AD */}
          {assignForm.targetType === 'group' && (
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ margin: 0 }}>Groupe Active Directory</label>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {ldapGroups.length} groupe(s)
                  <button
                    type="button"
                    onClick={fetchLdapEntities}
                    style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', marginLeft: '6px', fontSize: '12px', fontWeight: 600, textDecoration: 'underline' }}
                  >
                    Rafraîchir
                  </button>
                </span>
              </div>

              {loadingLdap ? (
                <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  <RefreshCw size={18} className="spin-icon" style={{ marginBottom: '6px' }} />
                  <div>Chargement des groupes Active Directory...</div>
                </div>
              ) : (
                <AdEntityPicker
                  items={ldapGroups}
                  selectedId={assignForm.ldap_identifier}
                  selectedName={assignForm.ldap_name}
                  entityType="GROUP"
                  onSelect={(item) => {
                    setAssignForm({
                      ...assignForm,
                      ldap_identifier: item.identifier,
                      ldap_name: item.name || item.identifier
                    });
                  }}
                  onClear={() => {
                    setAssignForm({
                      ...assignForm,
                      ldap_identifier: '',
                      ldap_name: ''
                    });
                  }}
                />
              )}
            </div>
          )}

          {/* Cas 2: Rôle BCRG */}
          {assignForm.targetType === 'role' && (
            <div className="form-group">
              <label htmlFor="assign-role-select">Sélectionner le Rôle Applicatif</label>
              <select
                id="assign-role-select"
                required
                value={assignForm.role_id}
                onChange={(e) => setAssignForm({ ...assignForm, role_id: e.target.value })}
              >
                <option value="">Choisir un rôle...</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Cas 3: Utilisateur Spécifique */}
          {assignForm.targetType === 'user' && (
            <div className="form-group">
              <label htmlFor="assign-user-select">Sélectionner l'Utilisateur</label>
              <select
                id="assign-user-select"
                required
                value={assignForm.user_id}
                onChange={(e) => setAssignForm({ ...assignForm, user_id: e.target.value })}
              >
                <option value="">Choisir un utilisateur...</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} ({u.matricule || u.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sélection Application */}
          <div className="form-group">
            <label htmlFor="assign-app-select">Sélectionner l'Application</label>
            <select
              id="assign-app-select"
              required
              value={assignForm.app_id}
              onChange={(e) => setAssignForm({ ...assignForm, app_id: e.target.value })}
            >
              <option value="">Choisir une application...</option>
              {apps.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {assignResult && (
            <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '8px', color: '#166534', marginBottom: '15px', fontSize: '0.85rem' }}>
              {assignResult}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary-action"
              onClick={onClose}
            >
              Fermer
            </button>
            <button type="submit" className="btn-primary-action">
              Valider l'habilitation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignAppModal;
