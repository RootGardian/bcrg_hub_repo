const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { User, Role } = require('../models');

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

const admin = (req, res, next) => {
  // Check if user is admin (DB flag or has 'admin' in role name)
  let hasAdminRole = false;
  if (req.user && req.user.Roles) {
    hasAdminRole = req.user.Roles.some(r => r.name.toLowerCase().includes('admin'));
  }
  
  // Note: For LDAP dynamic roles, we might need a more complex check, but for now
  // we'll rely on the DB roles. If the user logs in and gets 'is_admin' true, the frontend
  // will show the admin panel. If they are assigned an 'admin' role, this will let them pass.
  if (req.user && (req.user.is_admin || hasAdminRole)) {
    next();
  } else {
    res.status(403).json({ message: 'Non autorisé en tant qu\'administrateur' });
  }
};

module.exports = { protect, admin };
