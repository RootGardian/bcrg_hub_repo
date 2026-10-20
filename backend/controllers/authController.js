const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { User, Role, LdapRoleMapping, SecuritySetting, RefreshToken } = require('../models');
const { sequelize } = require('../config/db');
const { authenticateLdap } = require('../services/ldapService');
const { getPrivateKey, getPublicKey, hasAsymmetricKeys } = require('../config/jwtKeys');
const { generateMfaSecret, verifyMfaToken } = require('../services/mfaService');
const { logAuditEvent } = require('../services/auditService');
const { broadcastSingleLogout } = require('../services/sloService');
const { Op } = require('sequelize');
const crypto = require('crypto');

// Constantes de durée de vie des jetons
const ACCESS_TOKEN_EXPIRY = '15m'; // Access Token à durée de vie courte (15 minutes)
const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 min en millisecondes
const REFRESH_TOKEN_DAYS = 7;
const REFRESH_TOKEN_MAX_AGE = REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000; // 7 jours en millisecondes

// Génération du JWT Access Token à durée de vie courte (15 minutes)
const generateAccessToken = (id) => {
  const key = getPrivateKey();
  if (hasAsymmetricKeys()) {
    return jwt.sign({ id }, key, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      algorithm: 'RS256'
    });
  }
  return jwt.sign({ id }, key, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
};

// Alias de rétrocompatibilité
const generateToken = generateAccessToken;

// Options sécurisées du cookie Access Token
const getAccessTokenCookieOptions = () => {
  const isHttps = process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true';
  return {
    httpOnly: true, // Inaccessible en JS (protection XSS)
    secure: isHttps, // HTTPS uniquement si actif (compatible intranet HTTP)
    sameSite: isHttps ? 'none' : 'lax',
    maxAge: ACCESS_TOKEN_MAX_AGE,
    path: '/'
  };
};

// Options sécurisées du cookie Refresh Token
const getRefreshTokenCookieOptions = () => {
  const isHttps = process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true';
  return {
    httpOnly: true, // Inaccessible en JS
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    maxAge: REFRESH_TOKEN_MAX_AGE,
    path: '/'
  };
};

// Émission de la paire de jetons (Access Token 15m + Refresh Token en Base)
const issueSessionTokens = async (user, req, res) => {
  const accessToken = generateAccessToken(user.id);
  const rawRefreshToken = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE);

  // 1. Invalidation des anciennes sessions actives de cet utilisateur pour éviter les doublons
  await RefreshToken.update(
    { revoked: true, revoked_at: new Date() },
    { where: { user_id: user.id, revoked: false } }
  );

  // 2. Enregistrement de la nouvelle session active
  await RefreshToken.create({
    token: rawRefreshToken,
    user_id: user.id,
    expires_at: expiresAt,
    ip_address: req.ip || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'Unknown'
  });

  // Positionner les deux cookies HttpOnly
  res.cookie('token', accessToken, getAccessTokenCookieOptions());
  res.cookie('refreshToken', rawRefreshToken, getRefreshTokenCookieOptions());

  return { accessToken, refreshToken: rawRefreshToken };
};

// Helper to convert any LDAP attribute (Buffer, Array, String) to a clean string
const toCleanString = (val) => {
  if (val === null || val === undefined) return '';
  if (Array.isArray(val)) {
    return val.length > 0 ? toCleanString(val[0]) : '';
  }
  if (Buffer.isBuffer(val)) {
    return val.toString('utf8').trim();
  }
  return String(val).trim();
};

// Helper: Calculate roles and admin status
const resolveUserRolesAndAdmin = async (user, identifier, ldapResult = null) => {
  let dynamicRoles = [];
  const identifiers = [];

  const addIdentifier = (val) => {
    if (val === null || val === undefined) return;
    if (Array.isArray(val)) {
      val.forEach(v => addIdentifier(v));
      return;
    }
    const str = Buffer.isBuffer(val) ? val.toString('utf8').trim() : String(val).trim();
    if (str) {
      identifiers.push(str);
      if (str.includes('@')) {
        identifiers.push(str.split('@')[0]);
      }
    }
  };

  const addGroup = (g) => {
    if (g === null || g === undefined) return;
    if (Array.isArray(g)) {
      g.forEach(item => addGroup(item));
      return;
    }
    const str = Buffer.isBuffer(g) ? g.toString('utf8').trim() : String(g).trim();
    if (str) {
      identifiers.push(str);
      const cnMatch = str.match(/CN=([^,]+)/i);
      if (cnMatch && cnMatch[1]) identifiers.push(cnMatch[1].trim());
    }
  };

  addIdentifier(identifier);
  if (user) {
    addIdentifier(user.matricule);
    addIdentifier(user.email);
    if (Array.isArray(user.ldap_groups)) {
      user.ldap_groups.forEach(g => addGroup(g));
    }
  }

  if (ldapResult && ldapResult.success && ldapResult.user) {
    const ldapUser = ldapResult.user;
    addIdentifier(ldapUser.sAMAccountName || ldapUser.samaccountname);
    addIdentifier(ldapUser.userPrincipalName || ldapUser.userprincipalname);
    addIdentifier(ldapUser.mail);
    
    if (ldapUser.memberOf) {
      const groups = Array.isArray(ldapUser.memberOf) ? ldapUser.memberOf : [ldapUser.memberOf];
      groups.forEach(g => addGroup(g));
    }
  }

  const uniqueIdentifiers = Array.from(new Set(identifiers.filter(i => typeof i === 'string' && i.length > 0)));

  if (uniqueIdentifiers.length > 0) {
    const lowerIdentifiers = uniqueIdentifiers.map(i => i.toLowerCase());
    const mappings = await LdapRoleMapping.findAll({
      where: {
        [Op.or]: [
          { ldap_identifier: { [Op.in]: uniqueIdentifiers } },
          sequelize.where(
            sequelize.fn('LOWER', sequelize.col('ldap_identifier')),
            { [Op.in]: lowerIdentifiers }
          )
        ]
      },
      include: Role
    });
    dynamicRoles = mappings.map(m => m.Role).filter(r => r != null);
  }

  const localRoles = (user && user.Roles) || [];
  const allRolesMap = new Map();
  [...localRoles, ...dynamicRoles].forEach(r => {
    if (r && r.id) allRolesMap.set(r.id, r);
  });
  const combinedRoles = Array.from(allRolesMap.values());
  const hasAdminRole = combinedRoles.some(r => r && r.name && r.name.toLowerCase().includes('admin'));
  const finalIsAdmin = (user && user.is_admin) || hasAdminRole;

  return { combinedRoles, finalIsAdmin };
};

const formatAuthResponse = (user, combinedRoles, finalIsAdmin, token = null) => {
  const finalToken = token || generateToken(user.id);
  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    matricule: user.matricule,
    department: user.department,
    is_admin: finalIsAdmin,
    is_active: user.is_active,
    mfa_enabled: user.mfa_enabled,
    roles: combinedRoles,
    token: finalToken,
  };
};

// @desc    Auth user & get token (or prompt MFA)
const loginUser = async (req, res) => {
  const { identifier, password } = req.body; 

  try {
    let user = null;
    let isAuthenticated = false;
    let ldapResult = null;

    // 1. Tenter LDAP en premier (si une config active existe)
    try {
      ldapResult = await authenticateLdap(identifier, password);
    } catch (e) {
      console.log("LDAP bypass, trying local db");
    }

    if (ldapResult && ldapResult.success) {
      isAuthenticated = true;
      const sAMAccountName = toCleanString(ldapResult.user.sAMAccountName || ldapResult.user.samaccountname);
      const rawMail = toCleanString(ldapResult.user.mail || ldapResult.user.userPrincipalName || ldapResult.user.userprincipalname);
      const givenName = toCleanString(ldapResult.user.givenName || ldapResult.user.givenname);
      const sn = toCleanString(ldapResult.user.sn);
      const department = toCleanString(ldapResult.user.department) || 'LDAP';

      const userIdentifier = sAMAccountName || identifier;
      const mail = rawMail || (identifier.includes('@') ? identifier : `${identifier}@domain.local`);
      
      // Extraire tous les groupes AD (DN complet et CN court)
      let memberOfGroups = [];
      if (ldapResult.user.memberOf) {
        const rawGroups = Array.isArray(ldapResult.user.memberOf) ? ldapResult.user.memberOf : [ldapResult.user.memberOf];
        rawGroups.forEach(g => {
          const str = Buffer.isBuffer(g) ? g.toString('utf8').trim() : (typeof g === 'string' ? g.trim() : String(g).trim());
          if (str) {
            memberOfGroups.push(str);
            const cnMatch = str.match(/CN=([^,]+)/i);
            if (cnMatch && cnMatch[1]) memberOfGroups.push(cnMatch[1].trim());
          }
        });
      }
      const cleanGroups = Array.from(new Set(memberOfGroups.filter(Boolean)));

      // Chercher l'utilisateur avec son sAMAccountName ou mail (insensible à la casse via Op.iLike)
      const searchTerms = Array.from(new Set([userIdentifier, mail, identifier, sAMAccountName].filter(Boolean)));
      user = await User.findOne({
        where: {
          [Op.or]: [
            ...searchTerms.map(t => ({ matricule: { [Op.iLike]: t } })),
            ...searchTerms.map(t => ({ email: { [Op.iLike]: t } }))
          ]
        },
        include: Role
      });

      if (!user) {
        const salt = await bcrypt.genSalt(10);
        const dummyPassword = await bcrypt.hash(password || 'bcrg_ldap_default_pw', salt); 
        user = await User.create({
          first_name: givenName || identifier,
          last_name: sn || ' ',
          email: mail,
          matricule: userIdentifier,
          password_hash: dummyPassword,
          department: department,
          ldap_groups: cleanGroups,
          is_admin: false,
          is_active: true
        });
        user = await User.findByPk(user.id, { include: Role });
      } else {
        if (mail && user.email !== mail && user.email.includes('@domain.local')) {
          user.email = mail;
        }
        if (givenName) user.first_name = givenName;
        if (sn) user.last_name = sn;
        if (department) user.department = department;
        if (cleanGroups.length > 0) user.ldap_groups = cleanGroups;
        if (sAMAccountName && user.matricule.toLowerCase() !== sAMAccountName.toLowerCase()) {
           const existing = await User.findOne({ where: { matricule: { [Op.iLike]: sAMAccountName } } });
           if (!existing || existing.id === user.id) {
             user.matricule = sAMAccountName;
           }
        }
        await user.save();
      }
    } else {
      // 2. Vérification locale
      user = await User.findOne({ 
        where: {
          [Op.or]: [
            { matricule: identifier || '' },
            { email: identifier || '' }
          ]
        },
        include: Role
      });

      if (user && (await bcrypt.compare(password, user.password_hash))) {
        isAuthenticated = true;
      }
    }

    if (isAuthenticated) {
      // Vérifier si le MFA est obligatoire globalement ou activé pour cet utilisateur
      const mfaSetting = await SecuritySetting.findOne({ where: { key: 'mfa_enforced' } });
      const isMfaEnforcedGlobally = mfaSetting?.value === 'true';

      if (isMfaEnforcedGlobally || user.mfa_enabled) {
        const isSetupNeeded = !user.mfa_enabled || !user.mfa_secret;
        let qrCode = null;
        let secret = null;

        if (isSetupNeeded) {
          const mfaData = await generateMfaSecret(user.email || user.matricule);
          user.mfa_secret = mfaData.secret;
          await user.save();
          qrCode = mfaData.qr_code;
          secret = mfaData.secret;
        }

        const key = getPrivateKey();
        const tempToken = hasAsymmetricKeys()
          ? jwt.sign({ id: user.id, mfa_pending: true, mfa_setup: isSetupNeeded }, key, { algorithm: 'RS256', expiresIn: '10m' })
          : jwt.sign({ id: user.id, mfa_pending: true, mfa_setup: isSetupNeeded }, key, { expiresIn: '10m' });

        return res.json({
          mfa_required: true,
          mfa_setup: isSetupNeeded,
          temp_token: tempToken,
          qr_code: qrCode,
          secret: secret,
          message: isSetupNeeded
            ? "Configuration Microsoft Authenticator requise."
            : "Veuillez saisir le code à 6 chiffres depuis Microsoft Authenticator."
        });
      }

      // Connexion directe sans MFA
      const { combinedRoles, finalIsAdmin } = await resolveUserRolesAndAdmin(user, identifier, ldapResult);
      if (combinedRoles && combinedRoles.length > 0) {
        await user.setRoles(combinedRoles);
      }
      
      // Émission des tokens (Access Token 15m + Refresh Token en BD)
      const { accessToken } = await issueSessionTokens(user, req, res);

      await logAuditEvent({
        type: 'AUTH',
        action: 'Connexion directe réussie (Access Token 15m + Refresh Token en BD)',
        user: user.email || user.matricule,
        ip: req.ip || '127.0.0.1',
        app: 'BCRG HUB',
        status: 'SUCCÈS'
      });

      return res.json(formatAuthResponse(user, combinedRoles, finalIsAdmin, accessToken));
    } else {
      let msg = 'Identifiant ou mot de passe invalide';
      if (ldapResult && !ldapResult.success && ldapResult.message && ldapResult.message !== 'Aucune configuration LDAP active.') {
        msg = "Erreur LDAP : " + ldapResult.message;
      }

      await logAuditEvent({
        type: 'ALERT',
        action: 'Tentative de connexion échouée',
        user: identifier,
        ip: req.ip || '127.0.0.1',
        app: 'BCRG HUB Login',
        status: 'ÉCHEC'
      });

      res.status(401).json({ message: msg });
    }
  } catch (error) {
    console.error('❌ Erreur loginUser détaillée:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// @desc    Verify TOTP MFA code & get final JWT token
const verifyMfa = async (req, res) => {
  const { temp_token, code } = req.body;

  if (!temp_token || !code) {
    return res.status(400).json({ message: "Jeton de validation temporaire et code à 6 chiffres requis." });
  }

  try {
    const key = getPublicKey();
    const decoded = hasAsymmetricKeys()
      ? jwt.verify(temp_token, key, { algorithms: ['RS256'] })
      : jwt.verify(temp_token, key);

    if (!decoded || !decoded.mfa_pending || !decoded.id) {
      return res.status(401).json({ message: "Session de validation MFA expirée ou invalide." });
    }

    const user = await User.findByPk(decoded.id, { include: Role });
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const isValid = verifyMfaToken(code, user.mfa_secret);

    if (!isValid) {
      await logAuditEvent({
        type: 'ALERT',
        action: 'Échec validation TOTP Microsoft Authenticator',
        user: user.email || user.matricule,
        ip: req.ip || '127.0.0.1',
        app: 'MFA Verification',
        status: 'ÉCHEC'
      });
      return res.status(401).json({ message: "Code Microsoft Authenticator invalide ou expiré." });
    }

    // Si première configuration, activer le flag mfa_enabled
    if (decoded.mfa_setup) {
      user.mfa_enabled = true;
      await user.save();
    }

    const { combinedRoles, finalIsAdmin } = await resolveUserRolesAndAdmin(user, user.matricule || user.email);
    if (combinedRoles && combinedRoles.length > 0) {
      await user.setRoles(combinedRoles);
    }
    
    // Émission des tokens (Access Token 15m + Refresh Token en BD)
    const { accessToken } = await issueSessionTokens(user, req, res);

    await logAuditEvent({
      type: 'AUTH',
      action: decoded.mfa_setup ? 'Activation et validation TOTP réussie (Access Token 15m émis)' : 'Validation MFA réussie (Access Token 15m émis)',
      user: user.email || user.matricule,
      ip: req.ip || '127.0.0.1',
      app: 'BCRG HUB',
      status: 'SUCCÈS'
    });

    res.json(formatAuthResponse(user, combinedRoles, finalIsAdmin, accessToken));
  } catch (err) {
    res.status(401).json({ message: "Session MFA expirée. Veuillez vous reconnecter.", error: err.message });
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
      const { accessToken } = await issueSessionTokens(user, req, res);
      res.status(201).json({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        token: accessToken,
      });
    } else {
      res.status(400).json({ message: 'Données invalides' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
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

// @desc    Refresh session using rotating refresh token
const refreshSession = async (req, res) => {
  const currentRefreshToken = req.cookies?.refreshToken;
  const isHttps = process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true';

  if (!currentRefreshToken) {
    return res.status(401).json({ message: 'Refresh token manquant.' });
  }

  try {
    const tokenRecord = await RefreshToken.findOne({
      where: { token: currentRefreshToken }
    });

    // 1. DÉTECTION D'INTRUSION : Si le token est déjà révoqué (Tentative de rejeu / Token Reuse)
    if (tokenRecord && tokenRecord.revoked) {
      // Compromission suspectée : On révoque IMMÉDIATEMENT toutes les sessions de cet utilisateur !
      await RefreshToken.update(
        { revoked: true, revoked_at: new Date(), revoked_by_ip: req.ip || '127.0.0.1' },
        { where: { user_id: tokenRecord.user_id } }
      );

      await logAuditEvent({
        type: 'ALERT',
        action: 'Tentative de réutilisation d\'un Refresh Token révoqué (Token Reuse) - Révocation totale préventive',
        user: `User ID: ${tokenRecord.user_id}`,
        ip: req.ip || '127.0.0.1',
        app: 'BCRG HUB Auth',
        status: 'ÉCHEC'
      });

      res.clearCookie('token', { httpOnly: true, secure: isHttps, sameSite: isHttps ? 'none' : 'lax', path: '/' });
      res.clearCookie('refreshToken', { httpOnly: true, secure: isHttps, sameSite: isHttps ? 'none' : 'lax', path: '/' });
      return res.status(401).json({ message: 'Alerte de sécurité : réutilisation de jeton détectée. Session révoquée.' });
    }

    // 2. Si token introuvable ou expiré
    if (!tokenRecord || new Date() > new Date(tokenRecord.expires_at)) {
      res.clearCookie('token', { httpOnly: true, secure: isHttps, sameSite: isHttps ? 'none' : 'lax', path: '/' });
      res.clearCookie('refreshToken', { httpOnly: true, secure: isHttps, sameSite: isHttps ? 'none' : 'lax', path: '/' });
      return res.status(401).json({ message: 'Session expirée. Veuillez vous reconnecter.' });
    }

    // 3. Vérifier la validité du compte utilisateur
    const user = await User.findByPk(tokenRecord.user_id);
    if (!user || !user.is_active) {
      res.clearCookie('token', { httpOnly: true, secure: isHttps, sameSite: isHttps ? 'none' : 'lax', path: '/' });
      res.clearCookie('refreshToken', { httpOnly: true, secure: isHttps, sameSite: isHttps ? 'none' : 'lax', path: '/' });
      return res.status(401).json({ message: 'Compte utilisateur inactif ou révoqué.' });
    }

    // 4. ROTATION DU REFRESH TOKEN (Rotation à chaque rafraîchissement)
    const newRefreshToken = crypto.randomBytes(48).toString('hex');
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE);

    // Révocation de l'ancien token avec lien de rotation
    tokenRecord.revoked = true;
    tokenRecord.revoked_at = new Date();
    tokenRecord.replaced_by_token = newRefreshToken;
    await tokenRecord.save();

    // Insertion du nouveau refresh token
    await RefreshToken.create({
      token: newRefreshToken,
      user_id: user.id,
      expires_at: newExpiresAt,
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'Unknown'
    });

    // Génération du nouvel Access Token (durée courte 15 minutes)
    const newAccessToken = generateAccessToken(user.id);

    // Mise à jour des cookies HttpOnly
    res.cookie('token', newAccessToken, getAccessTokenCookieOptions());
    res.cookie('refreshToken', newRefreshToken, getRefreshTokenCookieOptions());

    return res.json({
      success: true,
      message: 'Session rafraîchie avec succès (Rotation effectuée)',
      token: newAccessToken
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors du rafraîchissement de la session', error: error.message });
  }
};

// @desc    Logout user, execute Single Logout (SLO) to revoke connected app sessions & purge cookies
const logoutUser = async (req, res) => {
  try {
    const isHttps = process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true';
    const currentRefreshToken = req.cookies?.refreshToken;

    // Résolution de l'utilisateur pour le Single Logout (SLO)
    let currentUser = req.user;

    // 1. Si req.user n'est pas déjà attaché, le retrouver via le jeton de session (cookie ou header)
    if (!currentUser) {
      const token = req.cookies?.token || (req.headers.authorization && req.headers.authorization.startsWith('Bearer') ? req.headers.authorization.split(' ')[1] : null);
      if (token) {
        try {
          const decoded = jwt.decode(token);
          if (decoded && decoded.id) {
            currentUser = await User.findByPk(decoded.id);
          }
        } catch (e) {
          // ignorer erreur de décodage
        }
      }
    }

    // 2. Si toujours pas trouvé, le retrouver via le refresh token actif en base
    if (!currentUser && currentRefreshToken) {
      try {
        const tokenRecord = await RefreshToken.findOne({
          where: { token: currentRefreshToken },
          include: [User]
        });
        if (tokenRecord && tokenRecord.User) {
          currentUser = tokenRecord.User;
        }
      } catch (e) {
        // ignorer erreur DB
      }
    }

    // 3. Déclenchement du Single Logout (SLO) en tâche de fond : envoi des signaux de révocation aux applications connectées
    if (currentUser) {
      broadcastSingleLogout({
        user: currentUser,
        ip: req.ip || '127.0.0.1',
        initiator: 'USER',
        currentRefreshToken
      }).catch(err => console.error("Erreur diffusion SLO en tâche de fond:", err));
    } else if (currentRefreshToken) {
      // Si aucun profil utilisateur n'a pu être identifié, au minimum invalider le refresh token
      await RefreshToken.update(
        { revoked: true, revoked_at: new Date() },
        { where: { token: currentRefreshToken } }
      );
    }

    // 4. Purge des cookies HttpOnly de session du HUB
    res.clearCookie('token', {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      path: '/'
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      path: '/'
    });

    res.json({
      success: true,
      message: 'Déconnexion globale réussie (Single Logout effectué)',
      slo: sloSummary
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur déconnexion', error: error.message });
  }
};

// @desc    Get current user profile via HttpOnly cookie session
const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    const freshUser = await User.findByPk(req.user.id, {
      include: [Role],
      attributes: { exclude: ['password_hash'] }
    });
    if (!freshUser) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }
    const { combinedRoles, finalIsAdmin } = await resolveUserRolesAndAdmin(freshUser, freshUser.matricule || freshUser.email);
    res.json({
      id: freshUser.id,
      first_name: freshUser.first_name,
      last_name: freshUser.last_name,
      email: freshUser.email,
      matricule: freshUser.matricule,
      department: freshUser.department,
      is_admin: finalIsAdmin,
      is_active: freshUser.is_active,
      mfa_enabled: freshUser.mfa_enabled,
      roles: combinedRoles
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération profil', error: error.message });
  }
};

module.exports = {
  loginUser,
  verifyMfa,
  registerUser,
  changePassword,
  logoutUser,
  getMe,
  refreshSession,
};
