const { User, Role, Application } = require('../models');
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

    // Vérifier si l'utilisateur a un rôle admin
    let hasAdminRole = false;
    if (user.Roles) {
      hasAdminRole = user.Roles.some(r => r.name.toLowerCase().includes('admin'));
    }

    // Si l'utilisateur est un Administrateur (en DB ou via Rôle), il a accès à toutes les applications actives
    if (user.is_admin || hasAdminRole) {
      const allActiveApps = await Application.findAll({ where: { status: 'Actif' } });
      return res.json(allActiveApps);
    }

    // Utilisateur standard : Collecter les applications associées aux rôles ET directement à l'utilisateur
    const appsMap = new Map();

    if (user.Roles) {
      user.Roles.forEach(role => {
        if (role.Applications) {
          role.Applications.forEach(app => {
            appsMap.set(app.id, app);
          });
        }
      });
    }

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
