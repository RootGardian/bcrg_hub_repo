const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { User, Role, LdapRoleMapping } = require('../models');
const { authenticateLdap } = require('../services/ldapService');

const privateKeyPath = path.join(__dirname, '../private.pem');
const privateKey = fs.existsSync(privateKeyPath) ? fs.readFileSync(privateKeyPath, 'utf8') : process.env.JWT_SECRET;


const { Op } = require('sequelize');

// @desc    Auth user & get token
const loginUser = async (req, res) => {
  const { identifier, password } = req.body; // we'll pass 'identifier' from frontend instead of just matricule

  try {
    // 1. Essayer de trouver l'utilisateur localement
    let user = await User.findOne({ 
      where: {
        [Op.or]: [
          { matricule: identifier || '' },
          { email: identifier || '' }
        ]
      },
      include: Role
    });

    let isAuthenticated = false;

    // 2. Tenter LDAP en premier si une config active existe
    const ldapResult = await authenticateLdap(identifier, password);
    
    if (ldapResult.success) {
      isAuthenticated = true;
      // Si l'utilisateur n'existe pas localement, on le crée
      if (!user) {
        const salt = await bcrypt.genSalt(10);
        const dummyPassword = await bcrypt.hash(password, salt); // Juste pour remplir la contrainte DB
        user = await User.create({
          first_name: ldapResult.user.givenName || identifier,
          last_name: ldapResult.user.sn || '',
          email: ldapResult.user.mail || `${identifier}@domain.local`,
          matricule: identifier,
          password_hash: dummyPassword,
          department: ldapResult.user.department || 'LDAP',
          is_admin: false,
          is_active: true
        });
        // Recharge avec les rôles (vide par défaut)
        user = await User.findByPk(user.id, { include: Role });
      }
    } 
    // 3. Sinon, on vérifie localement
    else if (user && (await bcrypt.compare(password, user.password_hash))) {
      isAuthenticated = true;
    }

    if (isAuthenticated) {
      // 4. Charger les rôles depuis LdapRoleMapping
      let dynamicRoles = [];
      if (ldapResult && ldapResult.success) {
        // Collecter les identifiants LDAP (nom d'utilisateur + les DN ou CN des groupes)
        const ldapUser = ldapResult.user;
        const identifiers = [identifier]; // sAMAccountName ou autre identifiant utilisé pour la connexion
        
        // Ajouter les groupes de l'utilisateur (memberOf peut être un string ou un tableau de strings)
        if (ldapUser.memberOf) {
          const groups = Array.isArray(ldapUser.memberOf) ? ldapUser.memberOf : [ldapUser.memberOf];
          groups.forEach(g => {
            // Extraire le CN du DN du groupe, ou garder le DN entier selon comment on a configuré le LdapRoleMapping
            const cnMatch = g.match(/CN=([^,]+)/i);
            if (cnMatch) identifiers.push(cnMatch[1]);
            identifiers.push(g);
          });
        }

        // Trouver tous les mappings correspondant à ces identifiants
        const mappings = await LdapRoleMapping.findAll({
          where: {
            ldap_identifier: {
              [Op.in]: identifiers
            }
          },
          include: Role
        });
        
        dynamicRoles = mappings.map(m => m.Role).filter(r => r != null);
      }
      
      // Combiner rôles locaux + rôles dynamiques LDAP
      const localRoles = user.Roles || [];
      const allRolesMap = new Map();
      [...localRoles, ...dynamicRoles].forEach(r => allRolesMap.set(r.id, r));
      const combinedRoles = Array.from(allRolesMap.values());
      res.json({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        matricule: user.matricule,
        department: user.department,
        is_admin: user.is_admin,
        is_active: user.is_active,
        roles: combinedRoles,
        token: generateToken(user.id),
      });
    } else {
      let msg = 'Identifiant ou mot de passe invalide';
      if (ldapResult && !ldapResult.success && ldapResult.message) {
        msg = "Erreur LDAP : " + ldapResult.message;
      }
      res.status(401).json({ message: msg });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// @desc    Register a new user
const registerUser = async (req, res) => {
  const { first_name, last_name, email, password, matricule, department, is_admin } = req.body;

  try {
    const userExists = await User.findOne({ where: { matricule } });

    if (userExists) {
      return res.status(400).json({ message: 'Utilisateur existe déjà avec ce matricule' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const user = await User.create({
      first_name,
      last_name,
      email,
      matricule,
      password_hash,
      department,
      is_admin: is_admin || false
    });

    if (user) {
      res.status(201).json({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        token: generateToken(user.id),
      });
    } else {
      res.status(400).json({ message: 'Données invalides' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

const generateToken = (id) => {
  if (fs.existsSync(privateKeyPath)) {
    return jwt.sign({ id }, privateKey, {
      expiresIn: '30d',
      algorithm: 'RS256'
    });
  }
  // Fallback to symmetric if no key exists
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Mot de passe actuel et nouveau mot de passe requis.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    await user.update({ password_hash: newHash });

    res.json({ message: 'Mot de passe modifié avec succès.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

module.exports = {
  loginUser,
  registerUser,
  changePassword,
};


