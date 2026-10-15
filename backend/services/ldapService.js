const { authenticate } = require('ldap-authentication');
const { LdapConfig } = require('../models');
const ldap = require('ldapjs');

const authenticateLdap = async (identifier, password) => {
  try {
    const config = await LdapConfig.findOne({ where: { is_active: true } });
    if (!config) {
      return { success: false, message: "Aucune configuration LDAP active." };
    }

    // ldap-authentication options
    let options = {
      ldapOpts: {
        url: `ldap://${config.server}:${config.port}`,
        connectTimeout: 15000,
        timeout: 15000
      },
      userPassword: password,
      userSearchBase: config.base_dn,
      username: identifier.includes('@') ? identifier.split('@')[0] : identifier,
      usernameFilter: `(|(${config.identifier_field || 'sAMAccountName'}={{username}})(mail={{username}})(employeeID={{username}}))`,
      attributes: ['dn', 'cn', 'sAMAccountName', 'mail', 'userPrincipalName', 'givenName', 'sn', 'department', 'employeeID', 'employeeNumber', 'memberOf', 'description']
    };

    if (config.use_bind && config.bind_dn && config.bind_password) {
      options.adminDn = config.bind_dn;
      options.adminPassword = config.bind_password;
    } else {
      // Pour les connexions directes sans admin bind
      options.userDn = identifier.includes('@') ? identifier : `${identifier}@${config.name}`;
    }

    const authenticatedUser = await authenticate(options);
    
    return { success: true, user: authenticatedUser };
  } catch (error) {
    console.error("LDAP Auth error:", error.message || error);
    return { success: false, message: error.message || "Échec de l'authentification LDAP." };
  }
};

const testLdapConnection = async (config) => {
  return new Promise((resolve) => {
    const client = ldap.createClient({
      url: `ldap://${config.server}:${config.port}`,
      connectTimeout: 15000,
      timeout: 15000
    });

    client.on('error', (err) => {
      resolve({ success: false, message: err.message || 'Erreur de connexion LDAP' });
    });

    if (config.use_bind && config.bind_dn && config.bind_password) {
      client.bind(config.bind_dn, config.bind_password, (err) => {
        if (err) {
          resolve({ success: false, message: err.message || "Échec de l'authentification (Bind DN ou Mot de passe incorrect)" });
        } else {
          client.unbind();
          resolve({ success: true, message: 'Connexion et authentification réussies' });
        }
      });
    } else {
      resolve({ success: false, message: "Le test anonyme n'est pas supporté par cet outil de test." });
    }
  });
};

const createLdapClient = async (config) => {
  return new Promise((resolve, reject) => {
    const client = ldap.createClient({
      url: `ldap://${config.server}:${config.port}`,
      connectTimeout: 15000,
      timeout: 15000
    });

    client.on('error', (err) => {
      reject(err);
    });

    if (config.use_bind && config.bind_dn && config.bind_password) {
      client.bind(config.bind_dn, config.bind_password, (err) => {
        if (err) return reject(err);
        resolve(client);
      });
    } else {
      resolve(client);
    }
  });
};

const searchLdap = async (config, filter, attributes) => {
  return new Promise(async (resolve, reject) => {
    try {
      const client = await createLdapClient(config);
      const opts = {
        filter: filter,
        scope: 'sub',
        attributes: attributes,
        paged: true,
        sizeLimit: 1000
      };

      client.search(config.base_dn, opts, (err, res) => {
        if (err) {
          client.unbind();
          return reject(err);
        }

        const entries = [];
        res.on('searchEntry', (entry) => {
          entries.push(entry.pojo);
        });
        res.on('error', (err) => {
          client.unbind();
          reject(err);
        });
        res.on('end', () => {
          client.unbind();
          resolve(entries);
        });
      });
    } catch (err) {
      reject(err);
    }
  });
};

const getLdapUsers = async () => {
  const config = await LdapConfig.findOne({ where: { is_active: true } });
  if (!config) throw new Error("Aucune configuration LDAP active.");
  // Filter for users (Active Directory standard)
  const filter = '(&(objectCategory=person)(objectClass=user))';
  const entries = await searchLdap(config, filter, ['cn', 'sAMAccountName', 'mail', 'givenName', 'sn', 'userPrincipalName', 'employeeID', 'employeeNumber', 'description', 'distinguishedName']);
  
  return entries.map(e => {
    const getAttr = (name) => {
      if (!e.attributes || !Array.isArray(e.attributes)) return '';
      const attr = e.attributes.find(a => (a.type || '').toLowerCase() === name.toLowerCase());
      return attr && attr.values && attr.values[0] ? attr.values[0] : '';
    };
    return {
      identifier: getAttr('sAMAccountName') || getAttr('cn'),
      name: getAttr('cn'),
      email: getAttr('mail') || getAttr('userPrincipalName'),
      matricule: getAttr('employeeID') || getAttr('employeeNumber') || getAttr('description'),
      first_name: getAttr('givenName') || '',
      last_name: getAttr('sn') || '',
      dn: getAttr('distinguishedName') || e.objectName || ''
    };
  });
};

const getLdapGroups = async () => {
  const config = await LdapConfig.findOne({ where: { is_active: true } });
  if (!config) throw new Error("Aucune configuration LDAP active.");
  // Filter for groups
  const filter = '(objectClass=group)';
  const entries = await searchLdap(config, filter, ['cn', 'sAMAccountName', 'description', 'distinguishedName']);
  
  return entries.map(e => {
    const getAttr = (name) => {
      if (!e.attributes || !Array.isArray(e.attributes)) return '';
      const attr = e.attributes.find(a => (a.type || '').toLowerCase() === name.toLowerCase());
      return attr && attr.values && attr.values[0] ? attr.values[0] : '';
    };
    return {
      identifier: getAttr('sAMAccountName') || getAttr('cn'),
      name: getAttr('cn'),
      description: getAttr('description'),
      dn: getAttr('distinguishedName') || e.objectName || ''
    };
  });
};

const getUserLdapGroups = async (identifier) => {
  if (!identifier) return [];
  try {
    const config = await LdapConfig.findOne({ where: { is_active: true } });
    if (!config) return [];
    const cleanId = identifier.includes('@') ? identifier.split('@')[0] : identifier;
    const filter = `(|(sAMAccountName=${cleanId})(mail=${cleanId})(mail=${identifier})(userPrincipalName=${identifier}))`;
    const entries = await searchLdap(config, filter, ['memberOf', 'cn', 'sAMAccountName']);
    if (!entries || entries.length === 0) return [];

    const entry = entries[0];
    const memberOfAttr = entry.attributes.find(a => a.type === 'memberOf');
    if (!memberOfAttr || !memberOfAttr.values) return [];

    const groups = [];
    memberOfAttr.values.forEach(g => {
      if (typeof g === 'string') {
        groups.push(g.trim());
        const cnMatch = g.match(/CN=([^,]+)/i);
        if (cnMatch) groups.push(cnMatch[1].trim());
      }
    });
    return Array.from(new Set(groups.filter(Boolean)));
  } catch (err) {
    console.warn("AD user group search bypassed:", err.message);
    return [];
  }
};

const getLdapOUs = async () => {
  const config = await LdapConfig.findOne({ where: { is_active: true } });
  if (!config) throw new Error("Aucune configuration LDAP active.");
  // Filter for Organizational Units and Containers
  const filter = '(|(objectClass=organizationalUnit)(objectClass=container)(objectCategory=builtinDomain))';
  try {
    const entries = await searchLdap(config, filter, ['ou', 'cn', 'name', 'distinguishedName', 'description']);
    return entries.map(e => {
      const getAttr = (name) => {
        const attr = e.attributes.find(a => a.type === name);
        return attr ? attr.values[0] : '';
      };
      return {
        name: getAttr('ou') || getAttr('name') || getAttr('cn'),
        dn: getAttr('distinguishedName') || e.objectName || '',
        type: getAttr('ou') ? 'OU' : 'CONTAINER',
        description: getAttr('description')
      };
    });
  } catch (err) {
    console.warn("AD OUs search bypassed:", err.message);
    return [];
  }
};

module.exports = {
  authenticateLdap,
  testLdapConnection,
  getLdapUsers,
  getLdapGroups,
  getUserLdapGroups,
  getLdapOUs
};
