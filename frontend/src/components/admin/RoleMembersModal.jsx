import React from 'react';
import { Trash2 } from 'lucide-react';

/**
 * RoleMembersModal Component
 * Modal displaying Active Directory members assigned to a specific role.
 */
const RoleMembersModal = ({
  isOpen,
  role,
  onClose,
  onRevoke
}) => {
  if (!isOpen || !role) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="role-members-title">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3 id="role-members-title">Membres AD assignés au rôle : {role.name}</h3>
          <button className="btn-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>
        <div className="modal-body">
          <p style={{ color: '#64748b', marginBottom: '15px' }}>
            Liste des utilisateurs et groupes Active Directory qui ont reçu cette habilitation.
          </p>

          {(!role.LdapRoleMappings || role.LdapRoleMappings.length === 0) ? (
            <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
              Aucun membre AD n'est directement assigné à ce rôle via le Hub.
            </div>
          ) : (
            <table className="bcrg-table" style={{ marginTop: '0' }}>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Identifiant AD</th>
                  <th>Nom affiché</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {role.LdapRoleMappings.map((mapping) => (
                  <tr key={mapping.id}>
                    <td>
                      <span className={`badge-pill-type ${mapping.ldap_type === 'GROUP' ? 'badge-pill-purple' : 'badge-pill-blue'}`}>
                        {mapping.ldap_type === 'GROUP' ? 'Groupe' : 'Utilisateur'}
                      </span>
                    </td>
                    <td><code style={{ fontSize: '0.85rem' }}>{mapping.ldap_identifier}</code></td>
                    <td>{mapping.ldap_name || 'N/A'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-delete"
                        style={{ padding: '4px 8px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', border: 'none', background: 'none' }}
                        onClick={() => onRevoke(mapping.id)}
                      >
                        <Trash2 size={14} /> Révoquer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
};

export default RoleMembersModal;
