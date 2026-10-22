const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { UserAppSession, Application, RefreshToken, User } = require('../models');
const { getPrivateKey, hasAsymmetricKeys } = require('../config/jwtKeys');
const { logAuditEvent } = require('./auditService');

/**
 * Generate a signed OIDC Back-Channel Logout Token (RFC 8693)
 */
const generateLogoutToken = (user, appUrl, initiator) => {
  const payload = {
    iss: 'BCRG_HUB',
    sub: String(user.id),
    aud: appUrl || 'BCRG_CONNECTED_APP',
    iat: Math.floor(Date.now() / 1000),
    jti: crypto.randomUUID ? crypto.randomUUID() : `slo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    events: {
      'http://schemas.openid.net/event/backchannel-logout': {}
    },
    user: {
      id: user.id,
      matricule: user.matricule,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      department: user.department
    },
    reason: initiator === 'ADMIN' ? 'ADMIN_FORCE_REVOCATION' : 'USER_SINGLE_LOGOUT'
  };

  const key = getPrivateKey();
  return hasAsymmetricKeys()
    ? jwt.sign(payload, key, { algorithm: 'RS256', expiresIn: '2m' })
    : jwt.sign(payload, key, { expiresIn: '2m' });
};

/**
 * Broadcast Single Logout (SLO) signal to all connected applications for a user
 * 
 * @param {Object} options
 * @param {Object} options.user - User instance or object with id, email, matricule
 * @param {string} options.ip - Client IP address
 * @param {string} [options.initiator='USER'] - 'USER' or 'ADMIN'
 * @param {string} [options.currentRefreshToken] - Refresh token to revoke specifically or null for all
 */
const broadcastSingleLogout = async ({ user, ip = '127.0.0.1', initiator = 'USER', currentRefreshToken = null }) => {
  if (!user || !user.id) {
    return {
      success: false,
      message: 'Utilisateur non spécifié pour le Single Logout',
      notified_count: 0,
      details: []
    };
  }

  try {
    // 1. Récupérer toutes les sessions applicatives actives enregistrées pour cet utilisateur
    const activeAppSessions = await UserAppSession.findAll({
      where: {
        user_id: user.id,
        status: 'ACTIVE'
      },
      include: [{ model: Application }]
    });

    // 2. Récupérer également les applications actives qui possèdent une URL de SLO configurée
    const appsWithSlo = await Application.findAll({
      where: {
        status: 'Actif',
        auth_type: 'SSO'
      }
    });

    // 3. Fusionner les applications cibles (déduplication par ID)
    const targetsMap = new Map();

    activeAppSessions.forEach(session => {
      if (session.Application) {
        targetsMap.set(session.Application.id, session.Application);
      }
    });

    appsWithSlo.forEach(app => {
      if (app.slo_url && app.slo_url.trim() !== '') {
        targetsMap.set(app.id, app);
      }
    });

    const targetApps = Array.from(targetsMap.values());

    // 4. Envoyer les signaux de révocation Back-Channel en parallèle avec timeout de protection
    const endpointsToNotify = [];
    const registeredUrls = new Set();
    targetApps.forEach(app => {
      if (app.slo_url && app.slo_url.trim()) {
        const u = app.slo_url.trim();
        if (!registeredUrls.has(u)) {
          registeredUrls.add(u);
          endpointsToNotify.push({ app_id: app.id, app_name: app.name, slo_url: u });
        }
      }
      const n = (app.name || '').toLowerCase();
      if (n.includes('med')) {
        const localMed = 'http://localhost:5000/api/auth/slo';
        if (!registeredUrls.has(localMed)) {
          registeredUrls.add(localMed);
          endpointsToNotify.push({ app_id: app.id + '_local', app_name: app.name + ' (Local)', slo_url: localMed });
        }
      } else if (n.includes('parking')) {
        const localPark = 'http://localhost:3000/api/auth/slo';
        if (!registeredUrls.has(localPark)) {
          registeredUrls.add(localPark);
          endpointsToNotify.push({ app_id: app.id + '_local', app_name: app.name + ' (Local)', slo_url: localPark });
        }
      }
    });

    const notificationPromises = endpointsToNotify.map(async (app) => {
      const sloUrl = app.slo_url ? app.slo_url.trim() : null;

      if (!sloUrl) {
        return {
          app_id: app.id,
          app_name: app.name,
          slo_url: null,
          status: 'SKIPPED_NO_ENDPOINT',
          message: 'Aucun endpoint SLO configuré pour cette application'
        };
      }

      const logoutToken = generateLogoutToken(user, sloUrl, initiator);

      try {
        const response = await fetch(sloUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'BCRG_HUB-SingleLogout/1.0',
            'Authorization': `Bearer ${logoutToken}`
          },
          body: JSON.stringify({
            logout_token: logoutToken,
            event: 'http://schemas.openid.net/event/backchannel-logout',
            user_id: user.id,
            matricule: user.matricule,
            email: user.email,
            reason: initiator === 'ADMIN' ? 'ADMIN_FORCE_REVOCATION' : 'USER_SINGLE_LOGOUT',
            timestamp: new Date().toISOString()
          }),
          signal: AbortSignal.timeout(5000)
        });

        return {
          app_id: app.id,
          app_name: app.name,
          slo_url: sloUrl,
          status: 'NOTIFIED',
          http_status: response.status,
          message: 'Signal de révocation transmis avec succès'
        };
      } catch (err) {
        return {
          app_id: app.id,
          app_name: app.name,
          slo_url: sloUrl,
          status: 'FAILED',
          error: err.name === 'TimeoutError' ? 'Délai d\'attente dépassé (3s)' : err.message || 'Hôte inaccessible'
        };
      }
    });

    const results = await Promise.all(notificationPromises);
    const notifiedCount = results.filter(r => r.status === 'NOTIFIED').length;

    // 5. Clôturer toutes les sessions applicatives en base de données
    await UserAppSession.update(
      {
        status: 'REVOKED',
        revoked_at: new Date()
      },
      {
        where: {
          user_id: user.id,
          status: 'ACTIVE'
        }
      }
    );

    // 6. Révoquer les Refresh Tokens en base de données
    if (currentRefreshToken) {
      await RefreshToken.update(
        { revoked: true, revoked_at: new Date(), revoked_by_ip: ip },
        { where: { token: currentRefreshToken } }
      );
    } else {
      await RefreshToken.update(
        { revoked: true, revoked_at: new Date(), revoked_by_ip: ip },
        { where: { user_id: user.id, revoked: false } }
      );
    }

    // 7. Enregistrer l'événement détaillé dans le journal d'audit SIEM
    await logAuditEvent({
      type: 'SLO',
      action: initiator === 'ADMIN'
        ? `Révocation Administrative SLO : ${notifiedCount} application(s) notifiée(s) sur ${targetApps.length}`
        : `Déconnexion Globale (Single Logout) : ${notifiedCount} application(s) révoquée(s) sur ${targetApps.length}`,
      user: user.email || user.matricule || 'Agent BCRG',
      ip: ip,
      app: 'BCRG HUB (SLO Centralisé)',
      status: 'SUCCÈS'
    });

    return {
      success: true,
      user_id: user.id,
      matricule: user.matricule,
      total_targets: targetApps.length,
      notified_count: notifiedCount,
      details: results
    };
  } catch (error) {
    console.error('Erreur lors du broadcast SLO:', error);
    return {
      success: false,
      message: error.message,
      notified_count: 0,
      details: []
    };
  }
};

module.exports = {
  broadcastSingleLogout,
  generateLogoutToken
};
