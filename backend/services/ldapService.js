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

    let authenticatedUser;
    try {
      authenticatedUser = await authenticate(options);
    } catch (authErr) {
      const errMsg = authErr.message || '';
      const isReferral = errMsg.includes('RefErr') || errMsg.includes('0000202B') || errMsg.includes('Referral') || authErr.code === 10;
      
      if (isReferral) {
        console.warn("⚠️ AD Referral détecté sur port 389. Tentative automatique via Catalogue Global (port 3268)...");
        // Tentative 1 : Port 3268 (Catalogue Global Active Directory qui ne produit pas de referrals)
        try {
          const gcOptions = {
            ...options,
            ldapOpts: {
              ...options.ldapOpts,
              url: `ldap://${config.server}:3268`
            }
          };
          authenticatedUser = await authenticate(gcOptions);
        } catch (gcErr) {
          console.warn("Échec GC 3268, tentative de Bind direct:", gcErr.message);
          // Tentative 2 : Authentification par Bind direct avec UPN
          const domain = config.base_dn
            ? config.base_dn.split(',').filter(p => p.toUpperCase().startsWith('DC=')).map(p => p.split('=')[1]).join('.')
            : 'bcrg.guinee.org';
          const upn = identifier.includes('@') ? identifier : `${identifier}@${domain}`;
          const directOptions = {
            ldapOpts: options.ldapOpts,
            userDn: upn,
            userPassword: password
          };
          const directRes = await authenticate(directOptions);
          authenticatedUser = directRes || { sAMAccountName: identifier, mail: upn };
        }
      } else {
        throw authErr;
      }
    }
    
    return { success: true, user: authenticatedUser };
  } catch (error) {
    const friendlyMessage = formatLdapErrorMessage(error.message || error);
    console.error("LDAP Auth error:", error.message || error, "->", friendlyMessage);
    return { success: false, message: friendlyMessage, rawError: error.message };
  }
};

const formatLdapErrorMessage = (rawError) => {
  const msg = typeof rawError === 'string' ? rawError : (rawError?.message || '');

  // Codes d'erreur Active Directory (AcceptSecurityContext / Win32 error)
  if (/data 52e/i.test(msg) || /data 525/i.test(msg) || /InvalidCredentials/i.test(msg) || /80090308/i.test(msg)) {
    return "Matricule, email ou mot de passe Active Directory incorrect.";
  }
  if (/data 530/i.test(msg)) {
    return "Connexion non autorisée sur cette plage horaire (politique horaire Active Directory).";
  }
  if (/data 531/i.test(msg)) {
    return "Connexion non autorisée depuis ce poste de travail.";
  }
  if (/data 532/i.test(msg)) {
    return "Votre mot de passe Active Directory a expiré. Veuillez le renouveler.";
  }
  if (/data 533/i.test(msg)) {
    return "Votre compte Active Directory est désactivé. Veuillez contacter le support informatique de la BCRG.";
  }
  if (/data 701/i.test(msg)) {
    return "Votre compte Active Directory a expiré. Veuillez contacter le support informatique de la BCRG.";
  }
  if (/data 773/i.test(msg)) {
    return "Vous devez réinitialiser votre mot de passe Active Directory avant de pouvoir vous connecter.";
  }
  if (/data 775/i.test(msg)) {
    return "Compte verrouillé suite à plusieurs tentatives infructueuses. Veuillez patienter ou contacter le support informatique.";
  }

  // Erreurs réseau / d'infrastructure
  if (/ECONNREFUSED/i.test(msg) || /ETIMEDOUT/i.test(msg) || /ENOTFOUND/i.test(msg) || /connect ECONN/i.test(msg)) {
    return "Le serveur Active Directory est temporairement inaccessible. Veuillez vérifier la connexion au réseau interne de la Banque Centrale.";
  }
  if (/RefErr|0000202B|Referral/i.test(msg)) {
    return "Erreur d'aiguillage de partition Active Directory (Referral).";
  }

  return msg || "Échec de l'authentification Active Directory.";
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
        res.on('searchReference', (referral) => {
          // Ignorer les referrals AD pour éviter les blocages de partition DNS
        });
        res.on('error', (err) => {
          const isRef = err.name === 'ReferralError' || err.code === 10 || (err.message && err.message.includes('Referral'));
          if (isRef) {
            // Ne pas planter sur un referral, renvoyer les entrées collectées
            client.unbind();
            return resolve(entries);
          }
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
  formatLdapErrorMessage,
  getLdapUsers,
  getLdapGroups,
  getUserLdapGroups,
  getLdapOUs
};
