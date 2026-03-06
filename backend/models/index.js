const sequelize = require('../config/database');
const User = require('./User');
const Client = require('./Client');
const Order = require('./Order');
const OrderCalculator = require('./OrderCalculator');
const Design = require('./Design');
const CostEstimate = require('./CostEstimate');
const ProductionBreakdown = require('./ProductionBreakdown');
const ProductionCompany = require('./ProductionCompany');
const Document = require('./Document');
const Message = require('./Message');
const CompanySetting = require('./CompanySetting');

// Определение связей
User.hasMany(Client, { foreignKey: 'userId' });
Client.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Order, { foreignKey: 'userId' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'Creator' });

Client.hasMany(Order, { foreignKey: 'clientId' });
Order.belongsTo(Client, { foreignKey: 'clientId' });

Order.hasMany(OrderCalculator, { foreignKey: 'orderId' });
OrderCalculator.belongsTo(Order, { foreignKey: 'orderId' });

Order.hasMany(Design, { foreignKey: 'orderId' });
Design.belongsTo(Order, { foreignKey: 'orderId' });

Order.hasMany(CostEstimate, { foreignKey: 'orderId' });
CostEstimate.belongsTo(Order, { foreignKey: 'orderId' });

Order.hasMany(ProductionBreakdown, { foreignKey: 'orderId' });
ProductionBreakdown.belongsTo(Order, { foreignKey: 'orderId' });

ProductionCompany.hasMany(ProductionBreakdown, { foreignKey: 'productionId' });
ProductionBreakdown.belongsTo(ProductionCompany, { foreignKey: 'productionId' });

User.hasMany(ProductionCompany, { foreignKey: 'userId' });
ProductionCompany.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Document, { foreignKey: 'userId' });
Document.belongsTo(User, { foreignKey: 'userId' });

Client.hasMany(Document, { foreignKey: 'clientId' });
Document.belongsTo(Client, { foreignKey: 'clientId' });

Order.hasMany(Document, { foreignKey: 'orderId' });
Document.belongsTo(Order, { foreignKey: 'orderId' });

User.hasMany(Message, { foreignKey: 'userId' });
Message.belongsTo(User, { foreignKey: 'userId' });

Order.hasMany(Message, { foreignKey: 'orderId' });
Message.belongsTo(Order, { foreignKey: 'orderId' });

Client.hasMany(Message, { foreignKey: 'clientId' });
Message.belongsTo(Client, { foreignKey: 'clientId' });

User.hasOne(CompanySetting, { foreignKey: 'userId' });
CompanySetting.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  sequelize,
  User,
  Client,
  Order,
  OrderCalculator,
  Design,
  CostEstimate,
  ProductionBreakdown,
  ProductionCompany,
  Document,
  Message,
  CompanySetting,
};
