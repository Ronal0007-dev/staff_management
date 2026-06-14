const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Staff = sequelize.define('Staff', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.ENUM('Mr', 'Mrs', 'Ms', 'Miss'), allowNull: false },
  firstName: { type: DataTypes.STRING(100), allowNull: false, field: 'first_name' },
  middleName: { type: DataTypes.STRING(100), allowNull: true, field: 'middle_name' },
  lastName: { type: DataTypes.STRING(100), allowNull: false, field: 'last_name' },
  dateOfBirth: { type: DataTypes.DATEONLY, allowNull: false, field: 'date_of_birth' },
  dateOfEmployment: { type: DataTypes.DATEONLY, allowNull: false, field: 'date_of_employment' },
  employmentType: {
    type: DataTypes.ENUM('Fixed', 'Permanent', 'Temporary'),
    allowNull: false,
    field: 'employment_type'
  },
  employmentLength: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'employment_length',
    comment: 'In months, for Fixed type'
  },
  contractStartDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'contract_start_date',
    comment: 'Start date of fixed contract'
  },
  contractEndDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'contract_end_date',
    comment: 'Auto-calculated end date of fixed contract'
  },
  educationLevel: {
    type: DataTypes.ENUM('Unskilled', 'Certificate', 'Diploma', 'Degree', 'Masters', 'PHD'),
    allowNull: false,
    field: 'education_level'
  },
  nationality: { type: DataTypes.STRING(100), allowNull: false },
  departmentId: { type: DataTypes.INTEGER, allowNull: false, field: 'department_id' },
  subDepartmentId: { type: DataTypes.INTEGER, allowNull: true, field: 'sub_department_id' },
  unitId: { type: DataTypes.INTEGER, allowNull: true, field: 'unit_id' },
  locationId: { type: DataTypes.INTEGER, allowNull: true, field: 'location_id' },
  staffNumber: { type: DataTypes.STRING(20), allowNull: true, unique: true, field: 'staff_number' },
  deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' }
}, {
  timestamps: true,
  tableName: 'staff',
  paranoid: true,
  deletedAt: 'deleted_at'
});

module.exports = Staff;
