import React from 'react';
import { UserCheck, ShieldCheck } from 'lucide-react';

/**
 * UserModal Component
 * Modal to edit user profile, Active Directory association and admin privileges.
 */
const UserModal = ({
  isOpen,
  onClose,
  usersList = [],
  editingUserId,
  setEditingUserId,
  newUser,
  setNewUser,
  onSubmit
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
      <div className="modal-content" style={{ maxWidth: '640px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={20} />
            </div>
            <div>
              <h3 id="user-modal-title" style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                Modifier l'Utilisateur & ses Droits
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.6rem', lineHeight: '1', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
            title="Fermer"
            aria-label="Fermer la fenêtre"
          >
            ×
          </button>
        </div>

        {/* Note Authentification Active Directory */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', color: '#166534', fontSize: '0.82rem', marginBottom: '16px' }}>
          <ShieldCheck size={18} style={{ flexShrink: 0 }} />
          <span><strong>Compte Active Directory (AD) :</strong> L'authentification et le mot de passe sont gérés directement par votre annuaire d'entreprise.</span>
        </div>

        <form onSubmit={onSubmit}>
          {/* Sélection rapide de l'employé */}
          {usersList.length > 0 && (
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label htmlFor="user-select-quick" style={{ fontWeight: 700, color: '#0f172a' }}>Employé sélectionné (AD)</label>
              <select
                id="user-select-quick"
                value={editingUserId || ''}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const u = usersList.find((x) => String(x.id) === String(selectedId));
                  if (u) {
                    setEditingUserId(u.id);
                    setNewUser({
                      first_name: u.first_name || '',
                      last_name: u.last_name || '',
                      email: u.email || '',
                      matricule: u.matricule || '',
                      department: u.department || '',
                      role_id: (u.Roles && u.Roles[0]) ? u.Roles[0].id : '',
                      is_admin: Boolean(u.is_admin)
                    });
                  }
                }}
                style={{ background: '#f8fafc', fontWeight: 600, borderColor: '#cbd5e1' }}
              >
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} — {u.email || u.matricule} ({u.is_admin ? 'Admin' : 'Employé Standard'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Row 1: Prénom + Nom */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label htmlFor="user-first-name">Prénom</label>
              <input
                id="user-first-name"
                required
                value={newUser.first_name}
                onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                placeholder="Prénom"
              />
            </div>
            <div className="form-group">
              <label htmlFor="user-last-name">Nom</label>
              <input
                id="user-last-name"
                required
                value={newUser.last_name}
                onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                placeholder="Nom"
              />
            </div>
          </div>

          {/* Row 2: Email + Matricule */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label htmlFor="user-email">Email professionnel</label>
              <input
                id="user-email"
                required
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="agent@bcrg-guinee.org"
              />
            </div>
            <div className="form-group">
              <label htmlFor="user-matricule">Matricule</label>
              <input
                id="user-matricule"
                required
                value={newUser.matricule}
                onChange={(e) => setNewUser({ ...newUser, matricule: e.target.value })}
                placeholder="BCRG-0042"
              />
            </div>
          </div>

          {/* Row 3: Département */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
            <div className="form-group">
              <label htmlFor="user-dept">Département</label>
              <input
                id="user-dept"
                value={newUser.department}
                onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                placeholder="ex: DSI, Comptabilité"
              />
            </div>
          </div>

          {/* Row 4: Banner Privilèges Admin */}
          <div className="form-group" style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', margin: '4px 0 10px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', margin: 0 }}>
              <input
                type="checkbox"
                checked={Boolean(newUser.is_admin)}
                onChange={(e) => setNewUser({ ...newUser, is_admin: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--bcrg-green)', cursor: 'pointer' }}
              />
              <div>
                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>Privilèges Administrateur (Accès au Panneau)</span>
                <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                  Accorde l'accès complet au panneau d'administration, à la gestion des applications, utilisateurs, rôles et sécurité.
                </span>
              </div>
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary-action" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-primary-action">Enregistrer les modifications</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
