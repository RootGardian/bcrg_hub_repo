const { User, Role, Application, LdapRoleMapping, UserAppSession } = require('../models');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const { getPrivateKey, getPublicKey, hasAsymmetricKeys } = require('../config/jwtKeys');
const { logAuditEvent } = require('../services/auditService');
const { getUserLdapGroups } = require('../services/ldapService');

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

    // Si l'utilisateur n'a pas encore de groupes AD en cache, tenter de les récupérer depuis l'Active Directory
    let userGroups = Array.isArray(user.ldap_groups) ? [...user.ldap_groups] : [];
    if (userGroups.length === 0 && (user.matricule || user.email)) {
      try {
        const fetchedGroups = await getUserLdapGroups(user.matricule || user.email);
        if (fetchedGroups && fetchedGroups.length > 0) {
          userGroups = fetchedGroups;
          user.ldap_groups = userGroups;
          await user.save();
        }
      } catch (err) {
        // En cas d'indisponibilité LDAP, continuer avec les rôles locaux
      }
    }

    // Charger les rôles LDAP (par identifiant utilisateur OU par Groupe Active Directory)
    let ldapRoles = [];
    const baseEmail = user.email ? user.email.split('@')[0] : null;
    const baseMatricule = user.matricule ? user.matricule.split('@')[0] : null;

    // Décomposer tous les groupes en DNs complets et CNs courts
    const expandedGroups = [];
    userGroups.forEach(g => {
      if (typeof g === 'string') {
        expandedGroups.push(g.trim());
        const cnMatch = g.match(/CN=([^,]+)/i);
        if (cnMatch) expandedGroups.push(cnMatch[1].trim());
      }
    });

    const identifiers = [
      user.matricule,
      user.email,
      baseEmail,
      baseMatricule,
      ...expandedGroups
    ].filter(Boolean);
    
    if (identifiers.length > 0) {
      const lowerIdentifiers = identifiers.map(i => typeof i === 'string' ? i.toLowerCase() : i);
      const mappings = await LdapRoleMapping.findAll({
        where: {
          [Op.or]: [
            { ldap_identifier: { [Op.in]: identifiers } },
            sequelize.where(
              sequelize.fn('LOWER', sequelize.col('ldap_identifier')),
              { [Op.in]: lowerIdentifiers }
            )
          ]
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

    const allRolesMap = new Map();
    [...(user.Roles || []), ...ldapRoles].forEach(r => allRolesMap.set(r.id, r));
    const allRoles = Array.from(allRolesMap.values());

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

// POST /api/apps/:id/launch — generate dedicated ephemeral SSO launch token
const launchApp = async (req, res) => {
  try {
    const appId = req.params.id;
    const app = await Application.findByPk(appId);

    if (!app || app.status !== 'Actif') {
      return res.status(404).json({ message: 'Application non disponible ou inactive' });
    }

    if (app.auth_type !== 'SSO') {
      return res.json({ url: app.url, auth_type: app.auth_type });
    }

    const user = req.user;
    const ssoPayload = {
      sub: user.id,
      id: user.id,
      matricule: user.matricule,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      department: user.department,
      role: user.Roles?.[0]?.name || (user.is_admin ? 'Admin' : 'User'),
      aud: app.url,
      app_id: app.id,
      app_name: app.name,
      iss: 'BCRG_HUB'
    };

    const key = getPrivateKey();
    const ssoToken = hasAsymmetricKeys()
      ? jwt.sign(ssoPayload, key, { algorithm: 'RS256', expiresIn: '5m' })
      : jwt.sign(ssoPayload, key, { expiresIn: '5m' });

    // Enregistrement de la session active de l'application pour le Single Logout (SLO)
    try {
      await UserAppSession.update(
        { status: 'REVOKED', revoked_at: new Date() },
        { where: { user_id: user.id, application_id: app.id, status: 'ACTIVE' } }
      );
      await UserAppSession.create({
        user_id: user.id,
        application_id: app.id,
        status: 'ACTIVE',
        session_token: ssoToken.slice(-25),
        created_at: new Date()
      });
    } catch (sessionErr) {
      console.warn('Note: enregistrement session applicative:', sessionErr.message);
    }

    // Enregistrement dans l'audit trail
    await logAuditEvent({
      type: 'SSO',
      action: `Lancement SSO pour l'application ${app.name}`,
      user: user.email || user.matricule,
      ip: req.ip || req.connection?.remoteAddress || '127.0.0.1',
      app: app.name,
      status: 'SUCCÈS'
    });

    res.json({
      url: app.url,
      auth_type: 'SSO',
      sso_token: ssoToken
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du lancement SSO', error: error.message });
  }
};

// POST /api/apps/slo-receiver — Point de terminaison récepteur pour valider les signaux de déconnexion SLO
const receiveSloSignal = async (req, res) => {
  try {
    const { logout_token, event, user_id, matricule, email } = req.body;
    let decoded = null;

    if (logout_token) {
      try {
        const key = getPublicKey();
        decoded = hasAsymmetricKeys()
          ? jwt.verify(logout_token, key, { algorithms: ['RS256'] })
          : jwt.verify(logout_token, key);
      } catch (tokenErr) {
        return res.status(400).json({ message: 'Logout token invalide ou expiré', error: tokenErr.message });
      }
    }

    const targetUser = decoded?.user?.matricule || matricule || decoded?.sub || user_id || 'Inconnu';
    console.log(`[SLO Endpoint] Signal de révocation reçu avec succès pour l'agent: ${targetUser}`);

    return res.json({
      success: true,
      message: `Session locale clôturée avec succès via SLO pour l'agent ${targetUser}`,
      timestamp: new Date().toISOString(),
      decoded_claims: decoded
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors du traitement du signal SLO', error: error.message });
  }
};

// GET /api/apps/active-sessions — Liste des sessions applicatives actives pour l'utilisateur
const getActiveSessions = async (req, res) => {
  try {
    const sessions = await UserAppSession.findAll({
      where: {
        user_id: req.user.id,
        status: 'ACTIVE'
      },
      include: [{ model: Application }],
      order: [['created_at', 'DESC']]
    });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération sessions actives', error: error.message });
  }
};

module.exports = { getMyApps, launchApp, receiveSloSignal, getActiveSessions };

