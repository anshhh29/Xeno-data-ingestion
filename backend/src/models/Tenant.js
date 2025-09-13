module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Tenant', {
    name: { type: DataTypes.STRING, allowNull: false },
    shopDomain: { type: DataTypes.STRING, allowNull: false, unique: true },
    shopAccessToken: { type: DataTypes.TEXT, allowNull: false },
  }, { tableName: 'tenants' });
};
