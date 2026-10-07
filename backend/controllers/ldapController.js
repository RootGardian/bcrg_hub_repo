const { LdapConfig } = require('../models');
const { testLdapConnection, getLdapUsers, getLdapGroups } = require('../services/ldapService');

// GET all LDAP configurations
const getLdapConfigs = async (req, res) => {
  try {
    const configs = await LdapConfig.findAll();
    res.json(configs);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET single LDAP config by ID
const getLdapConfigById = async (req, res) => {
  try {
    const config = await LdapConfig.findByPk(req.params.id);
    if (!config) return res.status(404).json({ message: 'Configuration non trouvée' });
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// CREATE new LDAP config
const createLdapConfig = async (req, res) => {
  try {
    const config = await LdapConfig.create(req.body);
    res.status(201).json(config);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// UPDATE LDAP config
const updateLdapConfig = async (req, res) => {
  try {
    const config = await LdapConfig.findByPk(req.params.id);
    if (!config) return res.status(404).json({ message: 'Configuration non trouvée' });

    await config.update(req.body);
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// DELETE LDAP config
const deleteLdapConfig = async (req, res) => {
  try {
    const config = await LdapConfig.findByPk(req.params.id);
    if (!config) return res.status(404).json({ message: 'Configuration non trouvée' });

    await config.destroy();
    res.json({ message: 'Configuration supprimée' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// TEST LDAP config
const testLdap = async (req, res) => {
  try {
    // on teste la configuration envoyée depuis le frontend, même si elle n'est pas encore sauvée
    const result = await testLdapConnection(req.body);
    if (result.success) {
      res.json({ success: true, message: "Connexion réussie avec l'Active Directory." });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// GET AD users
const searchUsers = async (req, res) => {
  try {
    const users = await getLdapUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET AD groups
const searchGroups = async (req, res) => {
  try {
    const groups = await getLdapGroups();
    res.json(groups);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getLdapConfigs,
  getLdapConfigById,
  createLdapConfig,
  updateLdapConfig,
  deleteLdapConfig,
  testLdap,
  searchUsers,
  searchGroups
};
