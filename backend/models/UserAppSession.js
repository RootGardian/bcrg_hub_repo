const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const UserAppSession = sequelize.define('UserAppSession', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  application_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'applications',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  session_token: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'ACTIVE' // ACTIVE, REVOKED
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  revoked_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'user_app_sessions',
  timestamps: false
});

module.exports = UserAppSession;
