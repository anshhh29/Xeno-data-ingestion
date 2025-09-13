module.exports = (sequelize, DataTypes) =>
  sequelize.define('User', {
    email: { type: DataTypes.STRING, unique: true },
    passwordHash: DataTypes.STRING,
    tenantId: DataTypes.INTEGER,
    role: { type: DataTypes.ENUM('admin','viewer'), defaultValue: 'viewer' }
  }, { tableName: 'users' });
