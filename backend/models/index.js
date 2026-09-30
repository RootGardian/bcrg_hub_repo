const { sequelize } = require('../config/db');
const User = require('./User');
const Role = require('./Role');
const Application = require('./Application');

User.belongsToMany(Role, { through: 'user_roles', foreignKey: 'user_id', otherKey: 'role_id', timestamps: false });
Role.belongsToMany(User, { through: 'user_roles', foreignKey: 'role_id', otherKey: 'user_id', timestamps: false });

Application.belongsToMany(Role, { through: 'role_applications', foreignKey: 'application_id', otherKey: 'role_id', timestamps: false });
Role.belongsToMany(Application, { through: 'role_applications', foreignKey: 'role_id', otherKey: 'application_id', timestamps: false });

User.belongsToMany(Application, { through: 'user_applications', foreignKey: 'user_id', otherKey: 'application_id', timestamps: false });
Application.belongsToMany(User, { through: 'user_applications', foreignKey: 'application_id', otherKey: 'user_id', timestamps: false });

module.exports = {
  sequelize,
  User,
  Role,
  Application
};
