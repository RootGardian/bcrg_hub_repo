import React from 'react';
import { RefreshCw } from 'lucide-react';
import AdEntityPicker from './AdEntityPicker';

/**
 * AssignRoleModal Component
 * Modal to assign an Active Directory user or group to a Hub role.
 */
const AssignRoleModal = ({
  isOpen,
  onClose,
  assignRoleForm,
  setAssignRoleForm,
  ldapUsers = [],
  ldapGroups = [],
  loadingLdap = false,
  ldapError = null,
  fetchLdapEntities,
  modalSearchTerm = '',
  setModalSearchTerm,
  isLdapDropdownOpen = false,
  setIsLdapDropdownOpen,
  roles = [],
  assignRoleResult = null,
  onSubmit
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="assign-role-modal-title">
      <div className="modal-content" style={{ maxWidth: '720px', width: '100%' }}>
        <h3 id="assign-role-modal-title">Assigner un rôle à l'Active Directory</h3>

        {ldapError && (
          <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', fontSize: '13px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span>⚠️ {ldapError}</span>
            <button
              type="button"
              onClick={fetchLdapEntities}
              style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}
            >
              Réessayer
            </button>
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Type d'entité</label>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="ldap_type"
                  value="USER"
                  checked={assignRoleForm.ldap_type === 'USER'}
                  onChange={(e) => {
                    setAssignRoleForm({ ...assignRoleForm, ldap_type: e.target.value, ldap_identifier: '', ldap_name: '' });
                    setModalSearchTerm('');
                    setIsLdapDropdownOpen(true);
                  }}
                />
                Utilisateur AD
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="ldap_type"
                  value="GROUP"
                  checked={assignRoleForm.ldap_type === 'GROUP'}
                  onChange={(e) => {
                    setAssignRoleForm({ ...assignRoleForm, ldap_type: e.target.value, ldap_identifier: '', ldap_name: '' });
                    setModalSearchTerm('');
                  }}
                />
                Groupe AD
              </label>
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ margin: 0 }}>
                {assignRoleForm.ldap_type === 'USER' ? 'Utilisateur Active Directory' : 'Groupe Active Directory'}
              </label>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {assignRoleForm.ldap_type === 'USER' ? `${ldapUsers.length} utilisateur(s)` : `${ldapGroups.length} groupe(s)`}
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
                <div>Chargement depuis l'Active Directory (172.16.100.3)...</div>
              </div>
            ) : assignRoleForm.ldap_type === 'USER' ? (
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Tapez un nom pour rechercher un utilisateur..."
                  value={modalSearchTerm}
                  onChange={(e) => {
                    setModalSearchTerm(e.target.value);
                    setAssignRoleForm({ ...assignRoleForm, ldap_identifier: '', ldap_name: '' });
                    setIsLdapDropdownOpen(true);
                  }}
                  onFocus={() => setIsLdapDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIsLdapDropdownOpen(false), 250)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />

                {isLdapDropdownOpen && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    maxHeight: '220px', overflowY: 'auto', backgroundColor: 'white',
                    border: '1px solid #cbd5e1', borderRadius: '6px', zIndex: 1000,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)', marginTop: '4px'
                  }}>
                    {(() => {
                      const q = (modalSearchTerm || '').toLowerCase();
                      const matches = ldapUsers.filter((u) =>
                        (u.identifier || '').toLowerCase().includes(q) ||
                        (u.name || '').toLowerCase().includes(q) ||
                        ((u.first_name || '') + ' ' + (u.last_name || '')).toLowerCase().includes(q)
                      );

                      if (matches.length === 0) {
                        return (
                          <div style={{ padding: '12px', color: '#64748b', fontSize: '13px', textAlign: 'center' }}>
                            {ldapUsers.length === 0 ? 'Aucun utilisateur synchronisé. Cliquez sur Rafraîchir.' : 'Aucun utilisateur trouvé pour cette recherche'}
                          </div>
                        );
                      }

                      return matches.map((u) => {
                        const displayName = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.identifier;
                        return (
                          <div
                            key={u.identifier}
                            style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                            onMouseDown={() => {
                              setAssignRoleForm({ ...assignRoleForm, ldap_identifier: u.identifier, ldap_name: displayName });
                              setModalSearchTerm(`${displayName} (${u.identifier})`);
                              setIsLdapDropdownOpen(false);
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <span style={{ fontWeight: 600 }}>{displayName}</span>{' '}
                            <span style={{ color: '#64748b', fontSize: '0.88em' }}>({u.identifier})</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <AdEntityPicker
                items={ldapGroups}
                selectedId={assignRoleForm.ldap_identifier}
                selectedName={assignRoleForm.ldap_name}
                entityType="GROUP"
                onSelect={(item) => {
                  setAssignRoleForm({
                    ...assignRoleForm,
                    ldap_identifier: item.identifier,
                    ldap_name: item.name || item.identifier
                  });
                }}
                onClear={() => {
                  setAssignRoleForm({
                    ...assignRoleForm,
                    ldap_identifier: '',
                    ldap_name: ''
                  });
                }}
              />
            )}
          </div>

          <div className="form-group">
            <label htmlFor="assign-role-group-select">Groupe de rôle</label>
            <select
              id="assign-role-group-select"
              required
              value={assignRoleForm.role_id}
              onChange={(e) => setAssignRoleForm({ ...assignRoleForm, role_id: e.target.value })}
            >
              <option value="">Choisir un rôle...</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {assignRoleResult && (
            <div className="alert" style={{ marginTop: '10px', padding: '10px', borderRadius: '8px', backgroundColor: assignRoleResult.success ? '#e8f5e9' : '#ffebee', color: assignRoleResult.success ? '#2e7d32' : '#c62828' }}>
              {assignRoleResult.message}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
            >
              Annuler
            </button>
            <button type="submit" className="btn-primary-action">
              Confirmer l'ajout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignRoleModal;
