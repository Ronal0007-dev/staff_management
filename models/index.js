const sequelize  = require('../config/database');
const Department = require('./Department');
const SubDepartment = require('./SubDepartment');
const Unit       = require('./Unit');
const Staff      = require('./Staff');
const User       = require('./User');
const Location   = require('./Location');

// Location → Department
Location.hasMany(Department, { foreignKey: 'location_id', as: 'departments' });
Department.belongsTo(Location, { foreignKey: 'location_id', as: 'location' });

// Location → Staff (direct link for quick filtering)
Location.hasMany(Staff, { foreignKey: 'location_id', as: 'staffMembers' });
Staff.belongsTo(Location, { foreignKey: 'location_id', as: 'location' });

// Department hierarchy
Department.hasMany(SubDepartment, { foreignKey: 'department_id', as: 'subDepartments' });
SubDepartment.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

SubDepartment.hasMany(Unit, { foreignKey: 'sub_department_id', as: 'units' });
Unit.belongsTo(SubDepartment, { foreignKey: 'sub_department_id', as: 'subDepartment' });

// Staff → Department / SubDepartment / Unit
Staff.belongsTo(Department,    { foreignKey: 'department_id',     as: 'department' });
Staff.belongsTo(SubDepartment, { foreignKey: 'sub_department_id', as: 'subDepartment' });
Staff.belongsTo(Unit,          { foreignKey: 'unit_id',           as: 'unit' });

Department.hasMany(Staff,    { foreignKey: 'department_id',     as: 'staffMembers' });
SubDepartment.hasMany(Staff, { foreignKey: 'sub_department_id', as: 'staffMembers' });
Unit.hasMany(Staff,          { foreignKey: 'unit_id',           as: 'staffMembers' });

// User self-reference
User.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(User,   { foreignKey: 'created_by', as: 'createdUsers' });

module.exports = { sequelize, Department, SubDepartment, Unit, Staff, User, Location };
