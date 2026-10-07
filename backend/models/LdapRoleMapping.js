const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const LdapRoleMapping = sequelize.define('LdapRoleMapping', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  ldap_type: {
    type: DataTypes.ENUM('USER', 'GROUP'),
    allowNull: false
  },
  ldap_identifier: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'sAMAccountName ou DN du groupe'
  },
  ldap_name: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Nom d\'affichage (ex: John Doe ou Groupe Admin)'
  }
}, {
  tableName: 'ldap_role_mappings',
  timestamps: true
});

module.exports = LdapRoleMapping;
