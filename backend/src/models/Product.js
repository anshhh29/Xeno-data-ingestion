module.exports = (sequelize, DataTypes) =>
  sequelize.define('Product', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    shopifyId: { type: DataTypes.BIGINT, allowNull: true },
    tenantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    title: DataTypes.STRING,
    handle: DataTypes.STRING,
    price: DataTypes.DECIMAL(10,2),
    sku: DataTypes.STRING,
    metadata: DataTypes.JSON,
    createdAtShopify: DataTypes.DATE,
    updatedAtShopify: DataTypes.DATE,
  }, { tableName: 'products', timestamps: false });
