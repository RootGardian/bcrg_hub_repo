const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/securityController');
const { protect, admin } = require('../middleware/authMiddleware');

// Endpoint public pour la découverte de la clé de signature OIDC
router.get('/.well-known/jwks.json', getJwks);

// Endpoints sécurisés réservés aux administrateurs
router.get('/status', protect, admin, getSecurityStatus);
router.get('/settings', protect, admin, getSecuritySettings);
router.put('/settings', protect, admin, updateSecuritySettings);
router.get('/audit-logs', protect, admin, getAuditLogs);
router.delete('/audit-logs', protect, admin, clearAuditLogs);
router.delete('/audit-logs/:id', protect, admin, deleteAuditLog);
router.post('/test-slo', protect, admin, testSingleLogout);
router.post('/revoke-session/:id', protect, admin, revokeActiveSession);
router.post('/revoke-app-session/:id', protect, admin, revokeAppSession);

module.exports = router;
