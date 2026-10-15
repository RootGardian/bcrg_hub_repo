const express = require('express');
const router = express.Router();
const { getMyApps, launchApp, receiveSloSignal, getActiveSessions } = require('../controllers/appsController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/apps/my-apps — returns apps the logged-in user is allowed to see
router.get('/my-apps', protect, getMyApps);

// GET /api/apps/active-sessions — returns user's active SSO sessions
router.get('/active-sessions', protect, getActiveSessions);

// POST /api/apps/:id/launch — generate secure ephemeral SSO launch token
router.post('/:id/launch', protect, launchApp);

// POST /api/apps/slo-receiver — Receiver endpoint for testing/validating SLO revocation signals
router.post('/slo-receiver', receiveSloSignal);

module.exports = router;
