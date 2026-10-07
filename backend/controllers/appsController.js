const { User, Role, Application, LdapRoleMapping } = require('../models');
const { Op } = require('sequelize');

// Get apps available to the logged-in user (based on their roles)
const getMyApps = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: Role,
          include: {
            model: Application,
            where: { status: 'Actif' },
            required: false
          }
        },
        {
          model: Application,
          where: { status: 'Actif' },
          required: false
        }
      ]
    });

    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    // Charger les rôles LDAP si l'utilisateur est concerné
    let ldapRoles = [];
    const baseEmail = user.email ? user.email.split('@')[0] : null;
    const baseMatricule = user.matricule ? user.matricule.split('@')[0] : null;
    const identifiers = [user.matricule, user.email, baseEmail, baseMatricule].filter(Boolean);
    
    if (identifiers.length > 0) {
      const mappings = await LdapRoleMapping.findAll({
        where: {
          ldap_identifier: {
            [Op.in]: identifiers
          }
        },
        include: {
          model: Role,
          include: {
            model: Application,
            where: { status: 'Actif' },
            required: false
          }
        }
      });
      ldapRoles = mappings.map(m => m.Role).filter(r => r != null);
    }

    const allRoles = [...(user.Roles || []), ...ldapRoles];

    // Vérifier si l'utilisateur a un rôle admin
    let hasAdminRole = allRoles.some(r => r.name.toLowerCase().includes('admin'));

    // Si l'utilisateur est un Administrateur (en DB ou via Rôle), il a accès à toutes les applications actives
    if (user.is_admin || hasAdminRole) {
      const allActiveApps = await Application.findAll({ where: { status: 'Actif' } });
      return res.json(allActiveApps);
    }

    // Utilisateur standard : Collecter les applications associées aux rôles ET directement à l'utilisateur
    const appsMap = new Map();

    allRoles.forEach(role => {
      if (role.Applications) {
        role.Applications.forEach(app => {
          appsMap.set(app.id, app);
        });
      }
    });

    if (user.Applications) {
      user.Applications.forEach(app => {
        appsMap.set(app.id, app);
      });
    }

    res.json(Array.from(appsMap.values()));
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

module.exports = { getMyApps };
