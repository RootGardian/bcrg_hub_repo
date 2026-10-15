const express = require('express');
const router = express.Router();
const { updateApplication, deleteApplication, updateUser, deleteUser, updateRole, deleteRole, getDashboardStats, getUsers, getApplications, createApplication, getRoles, createRole, createUser, importUsers, assignAppToRole, assignAppToUser, assignAppToLdapGroup, assignLdapRole, removeLdapRoleMapping, revokeUserSessions } = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/stats', protect, admin, getDashboardStats);
router.get('/users', protect, admin, getUsers);
router.post('/users', protect, admin, createUser);
router.post('/users/import', protect, admin, importUsers);
router.post('/users/assign-app', protect, admin, assignAppToUser);
router.post('/users/:id/revoke-sessions', protect, admin, revokeUserSessions);
router.get('/applications', protect, admin, getApplications);
router.post('/applications', protect, admin, createApplication);
router.get('/roles', protect, admin, getRoles);
router.post('/roles', protect, admin, createRole);
router.post('/roles/assign-app', protect, admin, assignAppToRole);
router.post('/groups/assign-app', protect, admin, assignAppToLdapGroup);


router.put('/applications/:id', protect, admin, updateApplication);
router.delete('/applications/:id', protect, admin, deleteApplication);
router.put('/users/:id', protect, admin, updateUser);
router.delete('/users/:id', protect, admin, deleteUser);
router.put('/roles/:id', protect, admin, updateRole);
router.delete('/roles/:id', protect, admin, deleteRole);
router.post('/roles/assign-ldap', protect, admin, assignLdapRole);
router.delete('/roles/mapping/:id', protect, admin, removeLdapRoleMapping);

module.exports = router;


