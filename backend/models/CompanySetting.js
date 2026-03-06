const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CompanySetting = sequelize.define('CompanySetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  companyName: {
    type: DataTypes.STRING,
    defaultValue: 'Revolution Print',
  },
  inn: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  kpp: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bankDetails: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  bankName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bik: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  corrAccount: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  accountNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  signerName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  signerTitle: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  legalForm: {
    type: DataTypes.STRING,
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
  tableName: 'company_settings',
  timestamps: true,
});

module.exports = CompanySetting;
