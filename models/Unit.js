const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Unit = sequelize.define('Unit', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  subDepartmentId: { type: DataTypes.INTEGER, allowNull: false, field: 'sub_department_id' }
}, { timestamps: true, tableName: 'units' });

module.exports = Unit;
