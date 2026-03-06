const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  clientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Обработка', 'В работе', 'Готов', 'Отменен', 'В ожидании'),
    defaultValue: 'Обработка',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  deadline: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  paymentStatus: {
    type: DataTypes.ENUM('postpaid', '50%', 'paid'),
    defaultValue: 'postpaid',
  },
  marginPercent: {
    type: DataTypes.INTEGER,
    defaultValue: 20,
  },
  assignedTo: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },
  assignedName: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'orders',
  timestamps: true,
});

module.exports = Order;
