module.exports = (sequelize, DataTypes) =>
  sequelize.define('Order', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    shopifyId: { type: DataTypes.BIGINT, allowNull: true },
    tenantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    customerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    orderNumber: DataTypes.STRING,
    totalPrice: DataTypes.DECIMAL(10,2),
    status: DataTypes.STRING,
    createdAt: DataTypes.DATE,
  }, { tableName: 'orders', timestamps: false });
