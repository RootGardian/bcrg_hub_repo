const jwt = require('jsonwebtoken');
const { User, Role, LdapRoleMapping, RefreshToken } = require('../models');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');
const { getPublicKey, hasAsymmetricKeys } = require('../config/jwtKeys');

const protect = async (req, res, next) => {
  let token;

  // 1. Vérification en priorité du Cookie HttpOnly
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // 2. Repli vers l'en-tête Authorization Bearer (compatibilité API/SSO)
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const key = getPublicKey();
      const decoded = hasAsymmetricKeys()
        ? jwt.verify(token, key, { algorithms: ['RS256'] })
        : jwt.verify(token, key);
      
      const refreshTokenCookie = req.cookies?.refreshToken;

      // Parallélisation de la résolution du profil et de la session (divise le temps de réponse DB par 2)
      const [user, sessionRecord] = await Promise.all([
        User.findByPk(decoded.id, {
          attributes: { exclude: ['password_hash'] },
          include: Role
        }),
        refreshTokenCookie
          ? RefreshToken.findOne({ where: { token: refreshTokenCookie, user_id: decoded.id } })
          : Promise.resolve(null)
      ]);

      req.user = user;

      if (!req.user || !req.user.is_active) {
        return res.status(401).json({ message: 'Compte inactif ou utilisateur introuvable', revoked: true });
      }

      // Actualisation en direct de la présence temps réel (étranglement 20s)
      if (sessionRecord) {
        if (Date.now() - new Date(sessionRecord.updatedAt).getTime() > 20000) {
          sessionRecord.changed('updatedAt', true);
          sessionRecord.save().catch(() => {});
        }
      } else if (req.user) {
        RefreshToken.findOne({
          where: { user_id: req.user.id, revoked: false },
          order: [['updatedAt', 'DESC']]
        }).then(t => {
          if (t && (Date.now() - new Date(t.updatedAt).getTime() > 20000)) {
            t.changed('updatedAt', true);
            t.save().catch(() => {});
          }
        }).catch(() => {});
      }

      // Vérification immédiate de la validité de la session en base de données
      if (refreshTokenCookie) {
        if (!sessionRecord || sessionRecord.revoked || (sessionRecord.expires_at && new Date(sessionRecord.expires_at) < new Date())) {
          // Si cette session spécifique est révoquée ou introuvable, vérifier si l'utilisateur possède une session active valide (reconnexion récente)
          const hasActiveSession = await RefreshToken.findOne({
            where: {
              user_id: req.user.id,
              revoked: false,
              expires_at: { [Op.gt]: new Date() }
            }
          });
          if (!hasActiveSession) {
            return res.status(401).json({
              message: 'Votre session a été révoquée par un administrateur.',
              revoked: true
            });
          }
        }
      } else {
        // Si aucun cookie refreshToken, s'assurer que l'utilisateur possède au moins une session active non révoquée
        const hasActiveSession = await RefreshToken.findOne({
          where: {
            user_id: req.user.id,
            revoked: false,
            expires_at: { [Op.gt]: new Date() }
          }
        });
        if (!hasActiveSession) {
          return res.status(401).json({
            message: 'Votre session a été révoquée par un administrateur.',
            revoked: true
          });
        }
      }

      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Non autorisé, token échoué ou expiré' });
    }
  }

  return res.status(401).json({ message: 'Non autorisé, pas de token de session' });
};

const admin = async (req, res, next) => {
  try {
    // Check if user is admin (DB flag or has 'admin' in role name)
    let hasAdminRole = false;
    if (req.user && req.user.Roles) {
      hasAdminRole = req.user.Roles.some(r => r.name.toLowerCase().includes('admin'));
    }
    
    // Si pas admin localement, vérifier les rôles LDAP
    if (req.user && !hasAdminRole && !req.user.is_admin) {
      const baseEmail = req.user.email ? req.user.email.split('@')[0] : null;
      const baseMatricule = req.user.matricule ? req.user.matricule.split('@')[0] : null;
      const userGroups = Array.isArray(req.user.ldap_groups) ? req.user.ldap_groups : [];

      const expandedGroups = [];
      userGroups.forEach(g => {
        if (typeof g === 'string') {
          expandedGroups.push(g.trim());
          const cnMatch = g.match(/CN=([^,]+)/i);
          if (cnMatch) expandedGroups.push(cnMatch[1].trim());
        }
      });

      const identifiers = [
        req.user.matricule, 
        req.user.email,
        baseEmail,
        baseMatricule,
        ...expandedGroups
      ].filter(Boolean);

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
        include: Role
      });
      const dynamicRoles = mappings.map(m => m.Role).filter(r => r != null);
      hasAdminRole = dynamicRoles.some(r => r.name.toLowerCase().includes('admin'));
    }

    if (req.user && (req.user.is_admin || hasAdminRole)) {
      next();
    } else {
      res.status(403).json({ message: 'Non autorisé en tant qu\'administrateur' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erreur de vérification des droits', error: error.message });
  }
};

module.exports = { protect, admin };
