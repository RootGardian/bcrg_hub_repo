const express = require('express');
const router = express.Router();
const {
  getLdapConfigs,
  getLdapConfigById,
  createLdapConfig,
  updateLdapConfig,
  deleteLdapConfig,
  testLdap,
  searchUsers,
  searchGroups
} = require('../controllers/ldapController');

router.get('/users', searchUsers);
router.get('/groups', searchGroups);
router.post('/test', testLdap);
router.get('/', getLdapConfigs);
router.get('/:id', getLdapConfigById);
router.post('/', createLdapConfig);
router.put('/:id', updateLdapConfig);
router.delete('/:id', deleteLdapConfig);

module.exports = router;
