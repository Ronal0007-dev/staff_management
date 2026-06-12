const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  username: {
    type: DataTypes.STRING(80),
    allowNull: false,
    unique: true,
    validate: { len: [3, 80] }
  },

  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },

  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },

  fullName: {
    type: DataTypes.STRING(150),
    allowNull: false,
    field: 'full_name'
  },

  role: {
    type: DataTypes.ENUM('super_admin', 'hr_manager'),
    allowNull: false,
    defaultValue: 'hr_manager'
  },

  // Granular permissions (JSON array of permission strings)
  permissions: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const val = this.getDataValue('permissions');
      if (!val) return [];
      try { return JSON.parse(val); } catch { return []; }
    },
    set(val) {
      this.setDataValue('permissions', JSON.stringify(val || []));
    }
  },

  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },

  mustChangePassword: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'must_change_password'
  },

  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login'
  },

  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'created_by'
  }

}, {
  timestamps: true,
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    }
  }
});

User.prototype.verifyPassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Default permissions per role
User.defaultPermissions = {
  super_admin: [
    'staff.view', 'staff.create', 'staff.edit', 'staff.delete', 'staff.print',
    'department.view', 'department.create', 'department.edit', 'department.delete',
    'user.view', 'user.create', 'user.edit', 'user.delete', 'user.assign_roles'
  ],
  hr_manager: [
    'staff.view', 'staff.create', 'staff.edit', 'staff.print',
    'department.view'
  ]
};

module.exports = User;
