const { sequelize } = require('../config/db');
const User = require('./User');
const Role = require('./Role');
const Application = require('./Application');
const LdapConfig = require('./LdapConfig');
const LdapRoleMapping = require('./LdapRoleMapping');
const SecuritySetting = require('./SecuritySetting');
const AuditLog = require('./AuditLog');
const RefreshToken = require('./RefreshToken');
const UserAppSession = require('./UserAppSession');

User.belongsToMany(Role, { through: 'user_roles', foreignKey: 'user_id', otherKey: 'role_id', timestamps: false });
Role.belongsToMany(User, { through: 'user_roles', foreignKey: 'role_id', otherKey: 'user_id', timestamps: false });

Application.belongsToMany(Role, { through: 'role_applications', foreignKey: 'application_id', otherKey: 'role_id', timestamps: false });
Role.belongsToMany(Application, { through: 'role_applications', foreignKey: 'role_id', otherKey: 'application_id', timestamps: false });

User.belongsToMany(Application, { through: 'user_applications', foreignKey: 'user_id', otherKey: 'application_id', timestamps: false });
Application.belongsToMany(User, { through: 'user_applications', foreignKey: 'application_id', otherKey: 'user_id', timestamps: false });

Role.hasMany(LdapRoleMapping, { foreignKey: 'role_id' });
LdapRoleMapping.belongsTo(Role, { foreignKey: 'role_id' });

User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refresh_tokens' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(UserAppSession, { foreignKey: 'user_id', as: 'app_sessions' });
UserAppSession.belongsTo(User, { foreignKey: 'user_id' });

Application.hasMany(UserAppSession, { foreignKey: 'application_id', as: 'user_sessions' });
UserAppSession.belongsTo(Application, { foreignKey: 'application_id' });

module.exports = {
  sequelize,
  User,
  Role,
  Application,
  LdapConfig,
  LdapRoleMapping,
  SecuritySetting,
  AuditLog,
  RefreshToken,
  UserAppSession
};
