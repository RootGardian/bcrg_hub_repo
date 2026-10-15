const { SecuritySetting, AuditLog, RefreshToken, UserAppSession, User, Application } = require('../models');
const { hasAsymmetricKeys, getPublicKey } = require('../config/jwtKeys');
const { logAuditEvent, getRecentAuditLogs } = require('../services/auditService');
const { broadcastSingleLogout } = require('../services/sloService');
const { Op } = require('sequelize');

// Defaults
const DEFAULT_SETTINGS = {
  sso_token_lifetime: '60',
  rate_limit_max: '5',
  rate_limit_window: '15',
  mfa_enforced: 'false'
};

// GET /api/security/status — Retourne 100% de données réelles en temps réel
const getSecurityStatus = async (req, res) => {
  try {
    const mfaSetting = await SecuritySetting.findOne({ where: { key: 'mfa_enforced' } });
    const isMfaEnforced = mfaSetting?.value === 'true';

    // 1. Détection des sessions actives en temps réel (activité dans les 10 dernières minutes)
    const REALTIME_WINDOW_MS = 10 * 60 * 1000;
    const activeSince = new Date(Date.now() - REALTIME_WINDOW_MS);

    // Récupérer les sessions actives non révoquées avec activité récente
    const rawActiveSessions = await RefreshToken.findAll({
      where: {
        revoked: false,
        expires_at: { [Op.gt]: new Date() },
        updatedAt: { [Op.gte]: activeSince }
      },
      include: [{
        model: User,
        attributes: ['id', 'first_name', 'last_name', 'email', 'matricule', 'department', 'is_admin']
      }],
      order: [['updatedAt', 'DESC']]
    });

    // Déduplication stricte par utilisateur : 1 seule session affichée par utilisateur connecté en temps réel
    const seenUsers = new Set();
    const activeSessionsList = [];

    for (const session of rawActiveSessions) {
      if (!session.User) continue;
      if (!seenUsers.has(session.user_id)) {
        seenUsers.add(session.user_id);
        activeSessionsList.push(session);
      }
    }

    const activeSessionsCount = activeSessionsList.length;

    // 2. Nettoyage automatique des sessions applicatives SSO orphelines :
    // Une session applicative SSO ne peut être considérée "ACTIVE EN TEMPS RÉEL"
    // QUE SI l'utilisateur qui l'a lancée est TOUJOURS connecté sur le HUB (présent dans seenUsers)
    // ET si la session applicative n'a pas dépassé la durée maximale d'inactivité (8 heures).
    const MAX_APP_SESSION_AGE_MS = 8 * 60 * 60 * 1000;
    const oldestAllowedSession = new Date(Date.now() - MAX_APP_SESSION_AGE_MS);

    try {
      const activeUserIds = Array.from(seenUsers);
      const orphanWhere = activeUserIds.length > 0
        ? {
            status: 'ACTIVE',
            [Op.or]: [
              { user_id: { [Op.notIn]: activeUserIds } },
              { created_at: { [Op.lt]: oldestAllowedSession } }
            ]
          }
        : {
            // Aucun utilisateur connecté sur le HUB : toute session applicative est orpheline
            status: 'ACTIVE'
          };

      await UserAppSession.update(
        { status: 'REVOKED', revoked_at: new Date() },
        { where: orphanWhere }
      );
    } catch (cleanupErr) {
      console.warn('Note: nettoyage sessions applicatives orphelines:', cleanupErr.message);
    }

    // 3. Sessions applicatives actives réelles (UserAppSession)
    // Uniquement pour les utilisateurs actuellement connectés en temps réel sur le HUB
    const activeAppSessionsList = [];
    if (seenUsers.size > 0) {
      const activeAppSessionsListRaw = await UserAppSession.findAll({
        where: {
          status: 'ACTIVE',
          user_id: { [Op.in]: Array.from(seenUsers) },
          created_at: { [Op.gte]: oldestAllowedSession }
        },
        include: [
          {
            model: User,
            attributes: ['id', 'first_name', 'last_name', 'email', 'matricule']
          },
          {
            model: Application,
            attributes: ['id', 'name', 'url', 'slo_url', 'auth_type']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      // Déduplication stricte par paire (utilisateur, application)
      const seenAppPairs = new Set();
      for (const appSession of activeAppSessionsListRaw) {
        if (!appSession.User || !appSession.Application) continue;
        const pairKey = `${appSession.user_id}_${appSession.application_id}`;
        if (!seenAppPairs.has(pairKey)) {
          seenAppPairs.add(pairKey);
          activeAppSessionsList.push(appSession);
        }
      }
    }

    const activeAppSessionsCount = activeAppSessionsList.length;

    // 4. Statistiques réelles des utilisateurs et applications
    const totalUsers = await User.count();
    const mfaEnrolledCount = await User.count({ where: { mfa_enabled: true } });
    const totalApps = await Application.count({ where: { is_active: true } });
    const sloAppsCount = await Application.count({
      where: {
        is_active: true,
        slo_url: { [Op.ne]: null }
      }
    });

    res.json({
      active_sessions: activeSessionsCount,
      active_app_sessions: activeAppSessionsCount,
      total_users: totalUsers,
      mfa_enrolled_users: mfaEnrolledCount,
      total_apps: totalApps,
      slo_apps_count: sloAppsCount,
      active_sessions_list: activeSessionsList,
      active_app_sessions_list: activeAppSessionsList,
      mfa_enforced: isMfaEnforced,
      jwks_url: `${req.protocol}://${req.get('host')}/api/security/.well-known/jwks.json`
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération statut sécurité', error: error.message });
  }
};

// GET /api/security/settings
const getSecuritySettings = async (req, res) => {
  try {
    const rows = await SecuritySetting.findAll();
    const settings = { ...DEFAULT_SETTINGS };

    rows.forEach(r => {
      settings[r.key] = r.value;
    });

    res.json({
      sso_token_lifetime: Number(settings.sso_token_lifetime) || 60,
      sso_mode: settings.sso_mode || 'CODE_EXCHANGE',
      ip_binding_enabled: settings.ip_binding_enabled === 'true',
      rate_limit_max: Number(settings.rate_limit_max) || 5,
      rate_limit_window: Number(settings.rate_limit_window) || 15,
      ip_whitelist: settings.ip_whitelist || '172.16.0.0/16, 10.0.0.0/8, 127.0.0.1',
      mfa_enforced: settings.mfa_enforced === 'true'
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération paramètres sécurité', error: error.message });
  }
};

// PUT /api/security/settings
const updateSecuritySettings = async (req, res) => {
  try {
    const {
      sso_token_lifetime,
      sso_mode,
      ip_binding_enabled,
      rate_limit_max,
      rate_limit_window,
      ip_whitelist,
      mfa_enforced
    } = req.body;

    const entries = [
      { key: 'sso_token_lifetime', value: String(sso_token_lifetime ?? 60) },
      { key: 'sso_mode', value: String(sso_mode ?? 'CODE_EXCHANGE') },
      { key: 'ip_binding_enabled', value: String(ip_binding_enabled ?? true) },
      { key: 'rate_limit_max', value: String(rate_limit_max ?? 5) },
      { key: 'rate_limit_window', value: String(rate_limit_window ?? 15) },
      { key: 'ip_whitelist', value: String(ip_whitelist ?? '') },
      { key: 'mfa_enforced', value: String(mfa_enforced ?? false) }
    ];

    for (const item of entries) {
      await SecuritySetting.upsert(item);
    }

    // Log the change in audit trail
    await logAuditEvent({
      type: 'ADMIN',
      action: 'Mise à jour des paramètres de sécurité RSSI',
      user: req.user?.email || 'Administrateur',
      ip: req.ip || '127.0.0.1',
      app: 'Sécurité & RSSI',
      status: 'SUCCÈS'
    });

    res.json({ success: true, message: 'Paramètres de sécurité enregistrés avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur sauvegarde paramètres sécurité', error: error.message });
  }
};

// GET /api/security/audit-logs
const getAuditLogs = async (req, res) => {
  try {
    const logs = await getRecentAuditLogs(100);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération logs d\'audit', error: error.message });
  }
};

// DELETE /api/security/audit-logs — Purge complète du journal d'audit
const clearAuditLogs = async (req, res) => {
  try {
    await AuditLog.destroy({ where: {} });
    res.json({ success: true, message: 'Journal d\'audit purgé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la purge du journal', error: error.message });
  }
};

// DELETE /api/security/audit-logs/:id — Suppression d'un événement d'audit spécifique
const deleteAuditLog = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await AuditLog.destroy({ where: { id } });
    if (!deleted) {
      return res.status(404).json({ message: 'Événement d\'audit introuvable' });
    }
    res.json({ success: true, message: 'Événement supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'événement', error: error.message });
  }
};

// GET /api/security/.well-known/jwks.json (OIDC Public Key Discovery)
const getJwks = async (req, res) => {
  try {
    const pubKey = getPublicKey();
    res.json({
      keys: [
        {
          kty: 'RSA',
          use: 'sig',
          alg: 'RS256',
          kid: 'bcrg-hub-signing-key-1',
          publicKeyPem: typeof pubKey === 'string' && pubKey.includes('PUBLIC KEY') ? pubKey : 'Clé symétrique active (JWT_SECRET)'
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur JWKS', error: error.message });
  }
};

// POST /api/security/test-slo
const testSingleLogout = async (req, res) => {
  try {
    const user = req.user || { id: 1, email: 'admin@bcrg.gn', matricule: 'ADMIN001', first_name: 'Super', last_name: 'Admin' };
    const sloResult = await broadcastSingleLogout({
      user,
      ip: req.ip || '127.0.0.1',
      initiator: 'TEST'
    });

    res.json({
      success: true,
      message: 'Test du Single Logout (SLO) exécuté avec succès',
      slo: sloResult
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du test SLO', error: error.message });
  }
};

// POST /api/security/revoke-session/:id — Révocation d'une session en temps réel
const revokeActiveSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await RefreshToken.findByPk(id, { include: [User] });
    if (!session) {
      return res.status(404).json({ message: 'Session introuvable ou déjà expirée' });
    }

    session.revoked = true;
    session.revoked_at = new Date();
    session.revoked_by_ip = req.ip || '127.0.0.1';
    await session.save();

    if (session.User) {
      broadcastSingleLogout({
        user: session.User,
        ip: req.ip || '127.0.0.1',
        initiator: 'ADMIN'
      }).catch(err => console.error("Erreur diffusion SLO en tâche de fond:", err));
    }

    await logAuditEvent({
      type: 'SECURITY',
      action: `Révocation immédiate en direct de la session de ${session.User?.email || session.User?.matricule || 'Inconnu'}`,
      user: req.user?.email || 'RSSI / Administrateur',
      ip: req.ip || '127.0.0.1',
      app: 'Sécurité HUB',
      status: 'SUCCÈS'
    });

    res.json({ success: true, message: 'Session fermée avec succès en direct' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la révocation', error: error.message });
  }
};

// POST /api/security/revoke-app-session/:id — Révocation d'une session applicative spécifique
const revokeAppSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await UserAppSession.findByPk(id, {
      include: [User, Application]
    });
    if (!session) {
      return res.status(404).json({ message: 'Session applicative introuvable' });
    }

    session.status = 'REVOKED';
    session.revoked_at = new Date();
    await session.save();

    // Signal de déconnexion Back-Channel vers l'application cible si configurée
    if (session.Application && session.Application.slo_url && session.User) {
      try {
        const axios = require('axios');
        await axios.post(session.Application.slo_url, {
          event: 'SINGLE_LOGOUT',
          user_id: session.User.id,
          matricule: session.User.matricule,
          email: session.User.email,
          timestamp: new Date().toISOString()
        }, { timeout: 3000 });
      } catch (err) {
        console.warn(`SLO direct vers ${session.Application.name} a échoué:`, err.message);
      }
    }

    await logAuditEvent({
      type: 'SECURITY',
      action: `Révocation immédiate en direct de l'accès applicatif ${session.Application?.name || ''} pour ${session.User?.email || ''}`,
      user: req.user?.email || 'RSSI / Administrateur',
      ip: req.ip || '127.0.0.1',
      app: session.Application?.name || 'SSO',
      status: 'SUCCÈS'
    });

    res.json({ success: true, message: `Session applicative "${session.Application?.name || ''}" fermée avec succès en direct` });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la révocation applicative', error: error.message });
  }
};

module.exports = {
  getSecurityStatus,
  getSecuritySettings,
  updateSecuritySettings,
  getAuditLogs,
  clearAuditLogs,
  deleteAuditLog,
  getJwks,
  testSingleLogout,
  revokeActiveSession,
  revokeAppSession
};
