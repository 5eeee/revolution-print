const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CostEstimate = sequelize.define('CostEstimate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  extractedAmount: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  uploadedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'cost_estimates',
  timestamps: false,
});

module.exports = CostEstimate;
