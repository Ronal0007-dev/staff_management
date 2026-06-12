const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { requireAuth, requirePasswordChanged, requireSuperAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const ALL_PERMISSIONS = [
  { key: 'staff.view',        label: 'View Staff',          group: 'Staff' },
  { key: 'staff.create',      label: 'Add Staff',           group: 'Staff' },
  { key: 'staff.edit',        label: 'Edit Staff',          group: 'Staff' },
  { key: 'staff.delete',      label: 'Archive/Delete Staff',group: 'Staff' },
  { key: 'staff.print',       label: 'Print Staff',         group: 'Staff' },
  { key: 'department.view',   label: 'View Departments',    group: 'Departments' },
  { key: 'department.create', label: 'Add Departments',     group: 'Departments' },
  { key: 'department.edit',   label: 'Edit Departments',    group: 'Departments' },
  { key: 'department.delete', label: 'Delete Departments',  group: 'Departments' },
  { key: 'user.view',         label: 'View Users',          group: 'Users' },
  { key: 'user.create',       label: 'Create Users',        group: 'Users' },
  { key: 'user.edit',         label: 'Edit Users',          group: 'Users' },
  { key: 'user.delete',       label: 'Deactivate Users',    group: 'Users' },
  { key: 'user.assign_roles', label: 'Assign/Revoke Roles', group: 'Users' },
];

// Apply auth to all user-management routes
router.use(requireAuth, requirePasswordChanged, requireSuperAdmin);

// GET /users — list all users
router.get('/', async (req, res) => {
  const users = await User.findAll({
    include: [{ model: User, as: 'creator', attributes: ['fullName', 'username'] }],
    order: [['createdAt', 'DESC']]
  });
  res.render('users/index', { users, currentUserId: req.session.userId });
});

// GET /users/new — create user form
router.get('/new', (req, res) => {
  res.render('users/new', {
    errors: [],
    old: {},
    roles: ['super_admin', 'hr_manager'],
    allPermissions: ALL_PERMISSIONS,
    defaultPermissions: User.defaultPermissions
  });
});

// POST /users — create user
router.post('/', async (req, res) => {
  const { fullName, username, email, role, password, confirmPassword, permissions } = req.body;
  const errors = [];

  if (!fullName || !username || !email || !role || !password) errors.push('All required fields must be filled.');
  if (password && password.length < 8) errors.push('Password must be at least 8 characters.');
  if (password !== confirmPassword) errors.push('Passwords do not match.');

  if (errors.length) {
    return res.render('users/new', {
      errors, old: req.body,
      roles: ['super_admin', 'hr_manager'],
      allPermissions: ALL_PERMISSIONS,
      defaultPermissions: User.defaultPermissions
    });
  }

  try {
    // Build permissions: from checkbox array or default for role
    let perms = Array.isArray(permissions) ? permissions : (permissions ? [permissions] : []);
    if (!perms.length) perms = User.defaultPermissions[role] || [];

    await User.create({
      fullName,
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      role,
      password,
      permissions: perms,
      mustChangePassword: true,
      isActive: true,
      createdBy: req.session.userId
    });

    req.flash('success', `User "${username}" created successfully. They must change their password on first login.`);
    res.redirect('/users');
  } catch (err) {
    const msg = err.name === 'SequelizeUniqueConstraintError'
      ? 'Username or email already exists.'
      : err.message;
    res.render('users/new', {
      errors: [msg], old: req.body,
      roles: ['super_admin', 'hr_manager'],
      allPermissions: ALL_PERMISSIONS,
      defaultPermissions: User.defaultPermissions
    });
  }
});

// GET /users/:id/edit
router.get('/:id/edit', async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) { req.flash('error', 'User not found.'); return res.redirect('/users'); }

  res.render('users/edit', {
    user, errors: [],
    roles: ['super_admin', 'hr_manager'],
    allPermissions: ALL_PERMISSIONS,
    defaultPermissions: User.defaultPermissions
  });
});

// POST /users/:id/edit
router.post('/:id/edit', async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) { req.flash('error', 'User not found.'); return res.redirect('/users'); }

  const { fullName, username, email, role, isActive, permissions } = req.body;
  const errors = [];
  if (!fullName || !username || !email || !role) errors.push('All required fields must be filled.');

  if (errors.length) {
    return res.render('users/edit', {
      user, errors,
      roles: ['super_admin', 'hr_manager'],
      allPermissions: ALL_PERMISSIONS,
      defaultPermissions: User.defaultPermissions
    });
  }

  try {
    let perms = Array.isArray(permissions) ? permissions : (permissions ? [permissions] : []);
    if (!perms.length) perms = user.permissions; // Keep existing if none checked

    await user.update({
      fullName,
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      role,
      isActive: isActive === 'true' || isActive === true,
      permissions: perms
    });

    req.flash('success', `User "${user.username}" updated.`);
    res.redirect('/users');
  } catch (err) {
    const msg = err.name === 'SequelizeUniqueConstraintError'
      ? 'Username or email already taken.'
      : err.message;
    res.render('users/edit', {
      user, errors: [msg],
      roles: ['super_admin', 'hr_manager'],
      allPermissions: ALL_PERMISSIONS,
      defaultPermissions: User.defaultPermissions
    });
  }
});

// POST /users/:id/toggle-active — activate / deactivate
router.post('/:id/toggle-active', async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) { req.flash('error', 'User not found.'); return res.redirect('/users'); }
  if (user.id === req.session.userId) {
    req.flash('error', 'You cannot deactivate your own account.');
    return res.redirect('/users');
  }
  await user.update({ isActive: !user.isActive });
  req.flash('success', `User "${user.username}" ${user.isActive ? 'activated' : 'deactivated'}.`);
  res.redirect('/users');
});

// POST /users/:id/assign-role
router.post('/:id/assign-role', async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) { req.flash('error', 'User not found.'); return res.redirect('/users'); }
  if (user.id === req.session.userId) {
    req.flash('error', 'You cannot change your own role.');
    return res.redirect('/users');
  }

  const { role } = req.body;
  if (!['super_admin', 'hr_manager'].includes(role)) {
    req.flash('error', 'Invalid role.');
    return res.redirect('/users');
  }

  // When assigning role, reset permissions to role defaults
  const perms = User.defaultPermissions[role] || [];
  await user.update({ role, permissions: perms });
  req.flash('success', `Role updated to "${role}" for "${user.username}".`);
  res.redirect('/users');
});

// POST /users/:id/reset-password — admin resets another user's password
router.post('/:id/reset-password', async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) { req.flash('error', 'User not found.'); return res.redirect('/users'); }

  const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
  await user.update({ password: tempPassword, mustChangePassword: true });
  req.flash('success', `Password reset for "${user.username}". Temporary password: ${tempPassword} — share this securely.`);
  res.redirect('/users');
});

// POST /users/:id/delete — permanent delete (only if not self)
router.post('/:id/delete', async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) { req.flash('error', 'User not found.'); return res.redirect('/users'); }
  if (user.id === req.session.userId) {
    req.flash('error', 'You cannot delete your own account.');
    return res.redirect('/users');
  }
  const name = user.username;
  await user.destroy();
  req.flash('success', `User "${name}" permanently deleted.`);
  res.redirect('/users');
});

module.exports = router;
