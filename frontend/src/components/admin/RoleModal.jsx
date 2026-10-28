import React from 'react';

export const RoleModal = ({
  isOpen,
  editingRoleId,
  roleForm,
  onChangeRoleForm,
  onSubmit,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{editingRoleId ? "Modifier le Rôle" : "Ajouter un Rôle d'accès (RBAC)"}</h3>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Nom du rôle</label>
            <input
              required
              value={roleForm.name}
              onChange={(e) => onChangeRoleForm({ ...roleForm, name: e.target.value })}
              placeholder="ex: Finance, Opérations"
            />
          </div>
          <div className="form-group">
            <label>Description du rôle</label>
            <textarea
              value={roleForm.description}
              onChange={(e) => onChangeRoleForm({ ...roleForm, description: e.target.value })}
              placeholder="Droits associés..."
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary-action" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn-primary-action">
              {editingRoleId ? 'Sauvegarder' : 'Créer le rôle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleModal;
