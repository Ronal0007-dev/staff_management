const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SubDepartment = sequelize.define('SubDepartment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  departmentId: { type: DataTypes.INTEGER, allowNull: false, field: 'department_id' }
}, { timestamps: true, tableName: 'sub_departments' });

module.exports = SubDepartment;
