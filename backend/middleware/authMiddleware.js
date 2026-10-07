const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { User, Role, LdapRoleMapping } = require('../models');
const { Op } = require('sequelize');

const publicKeyPath = path.join(__dirname, '../public.pem');
const publicKey = fs.existsSync(publicKeyPath) ? fs.readFileSync(publicKeyPath, 'utf8') : process.env.JWT_SECRET;

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      const decoded = fs.existsSync(publicKeyPath) 
        ? jwt.verify(token, publicKey, { algorithms: ['RS256'] })
        : jwt.verify(token, process.env.JWT_SECRET);
      
      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password_hash'] },
        include: Role
      });
      next();
    } catch (error) {
      res.status(401).json({ message: 'Non autorisé, token échoué' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Non autorisé, pas de token' });
  }
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
      const identifiers = [req.user.matricule, req.user.email].filter(Boolean);
      const mappings = await LdapRoleMapping.findAll({
        where: {
          ldap_identifier: {
            [Op.in]: identifiers
          }
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
