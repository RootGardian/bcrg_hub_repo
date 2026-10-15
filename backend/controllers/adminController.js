const { User, Role, Application, LdapRoleMapping, RefreshToken } = require('../models');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const { broadcastSingleLogout } = require('../services/sloService');

const getDashboardStats = async (req, res) => {
  try {
    const [userCount, appCount, roleCount] = await Promise.all([
      User.count(),
      Application.count(),
      Role.count()
    ]);
    res.json({ users: userCount, applications: appCount, roles: roleCount });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques' });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      include: Role,
      order: [['created_at', 'DESC']]
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des utilisateurs' });
  }
};

const getApplications = async (req, res) => {
  try {
    const apps = await Application.findAll({ order: [['created_at', 'DESC']] });
    res.json(apps);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des applications' });
  }
};

const createApplication = async (req, res) => {
  try {
    const { name, url, description, auth_type, status, icon_url, slo_url } = req.body;
    const newApp = await Application.create({
      name,
      url,
      description,
      auth_type: auth_type || 'SSO',
      status: status || 'Actif',
      icon_url,
      slo_url
    });
    res.status(201).json(newApp);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création de l\'application', error: error.message });
  }
};

const getRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({ 
      include: [
        { model: Application, through: { attributes: [] } },
        { model: LdapRoleMapping }
      ],
      order: [['id', 'ASC']] 
    });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des rôles' });
  }
};

const createRole = async (req, res) => {
  try {
    const { name, description } = req.body;
    const newRole = await Role.create({ name, description });
    res.status(201).json(newRole);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création du rôle', error: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { first_name, last_name, email, matricule, department, role_id, password } = req.body;
    let shouldBeAdmin = false;
    let roleToAssign = null;

    if (role_id) {
      roleToAssign = await Role.findByPk(role_id);
      if (roleToAssign && (roleToAssign.name || '').toLowerCase().includes('admin')) {
        shouldBeAdmin = true;
      }
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password || 'ChangeMe123!', salt);
    
    const newUser = await User.create({
      first_name, 
      last_name, 
      email, 
      matricule, 
      department, 
      password_hash, 
      is_active: true,
      is_admin: shouldBeAdmin
    });
    
    if (roleToAssign) {
      await newUser.addRole(roleToAssign);
    }
    
    const createdUser = await User.findByPk(newUser.id, {
      include: [Role],
      attributes: { exclude: ['password_hash'] }
    });

    res.status(201).json(createdUser);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      const fields = error.errors.map(e => e.path).join(', ');
      return res.status(409).json({ message: `Un utilisateur avec ce(s) champ(s) existe déjà : ${fields}. Vérifiez l'email et le matricule.` });
    }
    res.status(500).json({ message: 'Erreur création utilisateur', error: error.message });
  }
};

const importUsers = async (req, res) => {
  try {
    const users = req.body.users;
    let imported = 0;
    let errors = [];
    
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash('Welcome123!', salt);
    
    for (const u of users) {
      try {
        let shouldBeAdmin = false;
        let role = null;
        if (u.role_name) {
          role = await Role.findOne({ where: { name: u.role_name } });
          if (role && (role.name || '').toLowerCase().includes('admin')) {
            shouldBeAdmin = true;
          }
        }

        const newUser = await User.create({
          first_name: u.first_name,
          last_name: u.last_name,
          email: u.email,
          matricule: u.matricule,
          department: u.department,
          password_hash,
          is_active: true,
          is_admin: shouldBeAdmin
        });
        
        if (role) await newUser.addRole(role);
        imported++;
      } catch (err) {
        errors.push(`Erreur pour ${u.matricule}: ${err.message}`);
      }
    }
    res.json({ message: `Import terminé. ${imported} comptes créés.`, errors });
  } catch (error) {
    res.status(500).json({ message: 'Erreur globale import', error: error.message });
  }
};

const assignAppToRole = async (req, res) => {
  try {
    const { role_id, app_id } = req.body;
    const role = await Role.findByPk(role_id);
    const app = await Application.findByPk(app_id);
    if (!role || !app) return res.status(404).json({ message: 'Rôle ou application non trouvé' });
    await role.addApplication(app);
    res.json({ message: `Application "${app.name}" assignée au rôle "${role.name}"` });
  } catch (error) {
    res.status(500).json({ message: 'Erreur assignation', error: error.message });
  }
};

const assignAppToUser = async (req, res) => {
  try {
    const { user_id, app_id } = req.body;
    const user = await User.findByPk(user_id);
    const app = await Application.findByPk(app_id);
    if (!user || !app) return res.status(404).json({ message: 'Utilisateur ou application non trouvé' });
    await user.addApplication(app);
    res.json({ message: `Application "${app.name}" assignée avec succès à l'utilisateur ${user.first_name} ${user.last_name}` });
  } catch (error) {
    res.status(500).json({ message: 'Erreur assignation', error: error.message });
  }
};

const assignAppToLdapGroup = async (req, res) => {
  try {
    const { ldap_identifier, ldap_name, app_id } = req.body;
    if (!ldap_identifier || !app_id) {
      return res.status(400).json({ message: 'Identifiant du groupe AD et application requis' });
    }

    const app = await Application.findByPk(app_id);
    if (!app) return res.status(404).json({ message: 'Application introuvable' });

    // 1. Chercher si un LdapRoleMapping existe déjà pour ce groupe AD
    let mapping = await LdapRoleMapping.findOne({
      where: {
        [Op.or]: [
          { ldap_identifier },
          sequelize.where(
            sequelize.fn('LOWER', sequelize.col('ldap_identifier')),
            ldap_identifier.toLowerCase()
          )
        ]
      },
      include: Role
    });

    let role = mapping ? mapping.Role : null;

    // 2. Si aucun rôle n'est encore mappé à ce groupe AD, créer ou réutiliser un Rôle du même nom
    if (!role) {
      const roleName = ldap_name || ldap_identifier;
      role = await Role.findOne({
        where: sequelize.where(
          sequelize.fn('LOWER', sequelize.col('name')),
          roleName.toLowerCase()
        )
      });

      if (!role) {
        role = await Role.create({
          name: roleName,
          description: `Rôle synchronisé avec le groupe Active Directory "${roleName}"`
        });
      }

      mapping = await LdapRoleMapping.create({
        role_id: role.id,
        ldap_type: 'GROUP',
        ldap_identifier: ldap_identifier,
        ldap_name: roleName
      });
    }

    // 3. Assigner l'application au rôle
    await role.addApplication(app);

    // 4. Synchroniser immédiatement tous les utilisateurs actuellement en BD qui appartiennent à ce groupe AD
    try {
      const allUsers = await User.findAll();
      for (const u of allUsers) {
        if (Array.isArray(u.ldap_groups)) {
          const lowerGroups = u.ldap_groups.map(g => (typeof g === 'string' ? g.toLowerCase() : ''));
          const lowerTarget = ldap_identifier.toLowerCase();
          const isMember = lowerGroups.some(g => g === lowerTarget || g.includes(`cn=${lowerTarget}`));
          if (isMember) {
            await u.addRole(role);
          }
        }
      }
    } catch (syncErr) {
      console.warn("Notice: background user-role link sync:", syncErr.message);
    }

    res.json({
      message: `Application "${app.name}" assignée avec succès au groupe Active Directory "${ldap_name || ldap_identifier}"`,
      role_id: role.id
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de l\'assignation au groupe AD', error: error.message });
  }
};


const updateApplication = async (req, res) => {
  try {
    const { name, url, description, auth_type, status, icon_url, slo_url } = req.body;
    const app = await Application.findByPk(req.params.id);
    if (!app) return res.status(404).json({ message: 'App introuvable' });
    await app.update({ name, url, description, auth_type, status, icon_url, slo_url });
    res.json(app);
  } catch (error) { res.status(500).json({ message: 'Erreur update', error: error.message }); }
};

const deleteApplication = async (req, res) => {
  try {
    const app = await Application.findByPk(req.params.id);
    if (!app) return res.status(404).json({ message: 'App introuvable' });
    await app.destroy();
    res.json({ message: 'Application supprim�e' });
  } catch (error) { res.status(500).json({ message: 'Erreur delete', error: error.message }); }
};

const updateUser = async (req, res) => {
  try {
    const { first_name, last_name, email, matricule, department, role_id, is_admin, password } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User introuvable' });
    
    let shouldBeAdmin = typeof is_admin === 'boolean' ? is_admin : user.is_admin;

    if (role_id) {
      const role = await Role.findByPk(role_id);
      if (role) {
        await user.setRoles([role]);
        const roleName = (role.name || '').toLowerCase();
        if (roleName.includes('admin')) {
          shouldBeAdmin = true;
        } else if (typeof is_admin === 'boolean') {
          shouldBeAdmin = is_admin;
        }
      }
    } else if (role_id === '') {
      await user.setRoles([]);
    }

    const updateData = { 
      first_name, 
      last_name, 
      email, 
      matricule, 
      department,
      is_admin: shouldBeAdmin
    };

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(password, salt);
    }
    
    await user.update(updateData);
    
    const updatedUser = await User.findByPk(user.id, {
      include: [Role],
      attributes: { exclude: ['password_hash'] }
    });

    res.json(updatedUser);
  } catch (error) { res.status(500).json({ message: 'Erreur update user', error: error.message }); }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User introuvable' });
    await user.destroy();
    res.json({ message: 'Utilisateur supprim�' });
  } catch (error) { res.status(500).json({ message: 'Erreur delete user', error: error.message }); }
};

const updateRole = async (req, res) => {
  try {
    const { name, description } = req.body;
    const role = await Role.findByPk(req.params.id);
    if (!role) return res.status(404).json({ message: 'Role introuvable' });
    await role.update({ name, description });
    res.json(role);
  } catch (error) { res.status(500).json({ message: 'Erreur update role', error: error.message }); }
};

const deleteRole = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) return res.status(404).json({ message: 'Role introuvable' });
    await role.destroy();
    res.json({ message: 'R�le supprim�' });
  } catch (error) { res.status(500).json({ message: 'Erreur delete role', error: error.message }); }
};

const assignLdapRole = async (req, res) => {
  try {
    const { role_id, ldap_type, ldap_identifier, ldap_name } = req.body;
    
    if (!role_id || !ldap_type || !ldap_identifier) {
      return res.status(400).json({ message: 'Données manquantes' });
    }

    const mapping = await LdapRoleMapping.create({
      role_id,
      ldap_type,
      ldap_identifier,
      ldap_name
    });

    res.status(201).json({ message: 'Rôle assigné à l\'entité LDAP avec succès', mapping });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de l\'assignation LDAP', error: error.message });
  }
};

const removeLdapRoleMapping = async (req, res) => {
  try {
    const mapping = await LdapRoleMapping.findByPk(req.params.id);
    if (!mapping) return res.status(404).json({ message: 'Mapping introuvable' });
    await mapping.destroy();
    res.json({ message: 'Assignation LDAP révoquée' });
  } catch (error) { res.status(500).json({ message: 'Erreur revoke mapping', error: error.message }); }
};

// @desc    Révocation immédiate de toutes les sessions d'un utilisateur par un administrateur avec SLO
const revokeUserSessions = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    // 1. Invalidation immédiate de toutes les sessions actives en base de données
    await RefreshToken.update(
      { revoked: true, revoked_at: new Date(), revoked_by_ip: req.ip || '127.0.0.1' },
      { where: { user_id: id, revoked: false } }
    );

    // 2. Déclencher le Single Logout (SLO) en tâche de fond pour ne pas faire attendre l'administrateur
    broadcastSingleLogout({
      user,
      ip: req.ip || '127.0.0.1',
      initiator: 'ADMIN'
    }).catch(err => console.error("Erreur diffusion SLO en tâche de fond:", err));

    res.json({
      success: true,
      message: `Toutes les sessions de l'utilisateur ${user.first_name || ''} ${user.last_name || user.email} ont été révoquées avec succès en direct.`
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la révocation des sessions', error: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getUsers,
  getApplications,
  createApplication,
  getRoles,
  createRole,
  createUser,
  importUsers,
  assignAppToRole,
  assignAppToUser,
  assignAppToLdapGroup,
  updateApplication,
  deleteApplication,
  updateUser,
  deleteUser,
  updateRole,
  deleteRole,
  assignLdapRole,
  removeLdapRoleMapping,
  revokeUserSessions
};
