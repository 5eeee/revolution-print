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
User.hasMany(Client, { foreignKey: 'userId', onDelete: 'CASCADE' });
Client.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Order, { foreignKey: 'userId', onDelete: 'CASCADE' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'Creator' });

User.hasMany(Order, { foreignKey: 'assignedTo', as: 'AssignedOrders', constraints: false });
Order.belongsTo(User, { foreignKey: 'assignedTo', as: 'Assignee', constraints: false });

Client.hasMany(Order, { foreignKey: 'clientId', onDelete: 'CASCADE' });
Order.belongsTo(Client, { foreignKey: 'clientId' });

Order.hasMany(OrderCalculator, { foreignKey: 'orderId', onDelete: 'CASCADE' });
OrderCalculator.belongsTo(Order, { foreignKey: 'orderId' });

Order.hasMany(Design, { foreignKey: 'orderId', onDelete: 'CASCADE' });
Design.belongsTo(Order, { foreignKey: 'orderId' });

User.hasMany(Design, { foreignKey: 'uploadedBy', as: 'UploadedDesigns' });
Design.belongsTo(User, { foreignKey: 'uploadedBy', as: 'Uploader' });

Order.hasMany(CostEstimate, { foreignKey: 'orderId', onDelete: 'CASCADE' });
CostEstimate.belongsTo(Order, { foreignKey: 'orderId' });

Order.hasMany(ProductionBreakdown, { foreignKey: 'orderId', onDelete: 'CASCADE' });
ProductionBreakdown.belongsTo(Order, { foreignKey: 'orderId' });

ProductionCompany.hasMany(ProductionBreakdown, { foreignKey: 'productionId' });
ProductionBreakdown.belongsTo(ProductionCompany, { foreignKey: 'productionId' });

User.hasMany(ProductionCompany, { foreignKey: 'userId', onDelete: 'CASCADE' });
ProductionCompany.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Document, { foreignKey: 'userId', onDelete: 'CASCADE' });
Document.belongsTo(User, { foreignKey: 'userId' });

Client.hasMany(Document, { foreignKey: 'clientId', onDelete: 'SET NULL' });
Document.belongsTo(Client, { foreignKey: 'clientId' });

Order.hasMany(Document, { foreignKey: 'orderId', onDelete: 'SET NULL' });
Document.belongsTo(Order, { foreignKey: 'orderId' });

User.hasMany(Message, { foreignKey: 'userId' });
Message.belongsTo(User, { foreignKey: 'userId' });

Order.hasMany(Message, { foreignKey: 'orderId', onDelete: 'CASCADE' });
Message.belongsTo(Order, { foreignKey: 'orderId' });

Client.hasMany(Message, { foreignKey: 'clientId', onDelete: 'SET NULL' });
Message.belongsTo(Client, { foreignKey: 'clientId' });

User.hasOne(CompanySetting, { foreignKey: 'userId', onDelete: 'CASCADE' });
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
