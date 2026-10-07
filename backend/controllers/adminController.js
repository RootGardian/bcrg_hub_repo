const { User, Role, Application, LdapRoleMapping } = require('../models');
const bcrypt = require('bcryptjs');

const getDashboardStats = async (req, res) => {
  try {
    const userCount = await User.count();
    const appCount = await Application.count();
    const roleCount = await Role.count();
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
    const { name, url, description, auth_type, status, icon_url } = req.body;
    const newApp = await Application.create({
      name,
      url,
      description,
      auth_type: auth_type || 'SSO',
      status: status || 'Actif',
      icon_url
    });
    res.status(201).json(newApp);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création de l\'application', error: error.message });
  }
};

const getRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({ order: [['id', 'ASC']] });
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
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password || 'ChangeMe123!', salt);
    
    const newUser = await User.create({
      first_name, last_name, email, matricule, department, password_hash, is_active: true
    });
    
    if (role_id) {
       const role = await Role.findByPk(role_id);
       if (role) await newUser.addRole(role);
    }
    res.status(201).json(newUser);
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
        const newUser = await User.create({
          first_name: u.first_name,
          last_name: u.last_name,
          email: u.email,
          matricule: u.matricule,
          department: u.department,
          password_hash,
          is_active: true
        });
        
        if (u.role_name) {
          const role = await Role.findOne({ where: { name: u.role_name } });
          if (role) await newUser.addRole(role);
        }
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


const updateApplication = async (req, res) => {
  try {
    const { name, url, description, auth_type, status, icon_url } = req.body;
    const app = await Application.findByPk(req.params.id);
    if (!app) return res.status(404).json({ message: 'App introuvable' });
    await app.update({ name, url, description, auth_type, status, icon_url });
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
    const { first_name, last_name, email, matricule, department, role_id, password } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User introuvable' });
    
    const updateData = { first_name, last_name, email, matricule, department };
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(password, salt);
    }
    
    await user.update(updateData);
    
    if (role_id) {
      const role = await Role.findByPk(role_id);
      if (role) await user.setRoles([role]); // Replace roles
    }
    res.json(user);
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

// Export overrides will be replaced by multi_replace_file_content



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
  updateApplication,
  deleteApplication,
  updateUser,
  deleteUser,
  updateRole,
  deleteRole,
  assignLdapRole
};
