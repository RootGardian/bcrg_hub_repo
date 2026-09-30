const express = require('express');
const router = express.Router();
const { getMyApps } = require('../controllers/appsController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/apps/my-apps — returns apps the logged-in user is allowed to see
router.get('/my-apps', protect, getMyApps);

module.exports = router;
