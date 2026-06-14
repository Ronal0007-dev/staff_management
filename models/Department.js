const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Department = sequelize.define('Department', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:       { type: DataTypes.STRING(100), allowNull: false },
  slug:       { type: DataTypes.STRING(100), allowNull: false, unique: true },
  locationId: { type: DataTypes.INTEGER, allowNull: true, field: 'location_id' }
}, { timestamps: true, tableName: 'departments' });

module.exports = Department;
