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
      usernameFilter: `(|(${config.identifier_field || 'sAMAccountName'}={{username}})(mail={{username}})(employeeID={{username}}))`
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
        sizeLimit: 100
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
  const entries = await searchLdap(config, filter, ['cn', 'sAMAccountName', 'mail', 'givenName', 'sn', 'userPrincipalName', 'employeeID', 'employeeNumber', 'description']);
  
  return entries.map(e => {
    const getAttr = (name) => {
      const attr = e.attributes.find(a => a.type === name);
      return attr ? attr.values[0] : '';
    };
    return {
      identifier: getAttr('sAMAccountName'),
      name: getAttr('cn'),
      email: getAttr('mail') || getAttr('userPrincipalName'),
      matricule: getAttr('employeeID') || getAttr('employeeNumber') || getAttr('description'),
      first_name: getAttr('givenName'),
      last_name: getAttr('sn')
    };
  });
};

const getLdapGroups = async () => {
  const config = await LdapConfig.findOne({ where: { is_active: true } });
  if (!config) throw new Error("Aucune configuration LDAP active.");
  // Filter for groups
  const filter = '(objectClass=group)';
  const entries = await searchLdap(config, filter, ['cn', 'sAMAccountName', 'description']);
  
  return entries.map(e => {
    const getAttr = (name) => {
      const attr = e.attributes.find(a => a.type === name);
      return attr ? attr.values[0] : '';
    };
    return {
      identifier: getAttr('sAMAccountName') || getAttr('cn'),
      name: getAttr('cn'),
      description: getAttr('description')
    };
  });
};

module.exports = {
  authenticateLdap,
  testLdapConnection,
  getLdapUsers,
  getLdapGroups
};
