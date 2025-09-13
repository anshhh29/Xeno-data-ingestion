module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "Customer",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },

      shopifyId: { type: DataTypes.BIGINT, allowNull: false },
      tenantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },

      firstName: DataTypes.STRING,
      lastName: DataTypes.STRING,
      email: DataTypes.STRING,
      phone: DataTypes.STRING,

      totalSpent: { type: DataTypes.DECIMAL(10, 2) }, 
      ordersCount: { type: DataTypes.INTEGER }, 

      createdAtShopify: DataTypes.DATE,
      updatedAtShopify: DataTypes.DATE,

      metadata: DataTypes.JSON,
    },
    { tableName: "customers", timestamps: false }
  );
