const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false // 'SSO', 'AUTH', 'ADMIN', 'ALERT'
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  user: {
    type: DataTypes.STRING,
    defaultValue: 'Anonyme'
  },
  ip: {
    type: DataTypes.STRING,
    defaultValue: '127.0.0.1'
  },
  app: {
    type: DataTypes.STRING,
    defaultValue: 'BCRG HUB'
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'SUCCÈS'
  }
}, {
  tableName: 'audit_logs',
  timestamps: true
});

module.exports = AuditLog;
