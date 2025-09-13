// index.js
const sequelize = require("../config/db");
const Customer = require("../models/Customer")(sequelize, require("sequelize").DataTypes);
const Order = require("../models/Order")(sequelize, require("sequelize").DataTypes);
const Product = require("../models/Product")(sequelize, require("sequelize").DataTypes);
const Tenant = require("../models/Tenant")(sequelize, require("sequelize").DataTypes);
const User = require("../models/User")(sequelize, require("sequelize").DataTypes);

// Associations
Tenant.hasMany(User, { foreignKey: "tenantId" });
User.belongsTo(Tenant, { foreignKey: "tenantId" });

Tenant.hasMany(Customer, { foreignKey: "tenantId" });
Customer.belongsTo(Tenant, { foreignKey: "tenantId" });

Tenant.hasMany(Order, { foreignKey: "tenantId" });
Order.belongsTo(Tenant, { foreignKey: "tenantId" });

Customer.hasMany(Order, { foreignKey: "customerId" });
Order.belongsTo(Customer, { foreignKey: "customerId" });

Order.belongsToMany(Product, { through: "OrderProducts" });
Product.belongsToMany(Order, { through: "OrderProducts" });

module.exports = { sequelize, Customer, Order, Product, Tenant, User };
