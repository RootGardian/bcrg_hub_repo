const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SecuritySetting = sequelize.define('SecuritySetting', {
  key: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'security_settings',
  timestamps: true
});

module.exports = SecuritySetting;
