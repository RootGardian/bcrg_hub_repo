const express = require('express');
const router = express.Router();
const { getMyApps, launchApp, ssoRedirect, receiveSloSignal, getActiveSessions } = require('../controllers/appsController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/apps/my-apps — returns apps the logged-in user is allowed to see
router.get('/my-apps', protect, getMyApps);

// GET /api/apps/active-sessions — returns user's active SSO sessions
router.get('/active-sessions', protect, getActiveSessions);

// GET /api/apps/:id/sso-redirect — direct 302 HTTP redirect with SSO token (zero async / zero popup blocker)
router.get('/:id/sso-redirect', protect, ssoRedirect);

// POST /api/apps/:id/launch — generate secure ephemeral SSO launch token
router.post('/:id/launch', protect, launchApp);

// POST /api/apps/slo-receiver — Receiver endpoint for testing/validating SLO revocation signals
router.post('/slo-receiver', receiveSloSignal);

module.exports = router;
