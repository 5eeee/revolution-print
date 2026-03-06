const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Client = sequelize.define('Client', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Новый', 'В работе', 'В ожидании', 'Отказ', 'Закрыт'),
    defaultValue: 'Новый',
  },
  owner: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  firstCall: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastCall: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
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
  tableName: 'clients',
  timestamps: true,
});

module.exports = Client;
