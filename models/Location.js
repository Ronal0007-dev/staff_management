const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Location = sequelize.define('Location', {
  id:      { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:    { type: DataTypes.STRING(150), allowNull: false },
  address: { type: DataTypes.STRING(255), allowNull: true },
  region:  { type: DataTypes.STRING(100), allowNull: true },
  country: { type: DataTypes.STRING(100), allowNull: true, defaultValue: 'Tanzania' },
  isActive:{ type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' }
}, { timestamps: true, tableName: 'locations' });

module.exports = Location;
