const { AuditLog } = require('../models');

const logAuditEvent = async ({ type, action, user, ip, app, status }) => {
  try {
    await AuditLog.create({
      type: type || 'AUTH',
      action: action || 'Action système',
      user: user || 'Anonyme',
      ip: ip || '127.0.0.1',
      app: app || 'BCRG HUB',
      status: status || 'SUCCÈS'
    });
  } catch (error) {
    console.error('Erreur enregistrement audit log:', error.message);
  }
};

const getRecentAuditLogs = async (limit = 50) => {
  try {
    const logs = await AuditLog.findAll({
      order: [['id', 'DESC']],
      limit
    });
    return logs;
  } catch (error) {
    console.error('Erreur récupération audit logs:', error.message);
    return [];
  }
};

module.exports = {
  logAuditEvent,
  getRecentAuditLogs
};
