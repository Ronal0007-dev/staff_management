const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { requireAuth } = require('../middleware/auth');

// GET /auth/login
router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/staff');
  res.render('auth/login', { errors: [] });
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render('auth/login', { errors: ['Username and password are required.'] });
  }

  try {
    const user = await User.findOne({
      where: { username, isActive: true }
    });

    if (!user || !(await user.verifyPassword(password))) {
      return res.render('auth/login', { errors: ['Invalid username or password.'] });
    }

    // Set session
    req.session.userId          = user.id;
    req.session.username        = user.username;
    req.session.fullName        = user.fullName;
    req.session.userRole        = user.role;
    req.session.userPermissions = user.permissions;
    req.session.mustChangePassword = user.mustChangePassword;

    // Update last login
    await user.update({ lastLogin: new Date() });

    if (user.mustChangePassword) {
      req.flash('error', 'Welcome! Please change your password before continuing.');
      return res.redirect('/auth/change-password');
    }

    req.flash('success', `Welcome back, ${user.fullName}!`);
    res.redirect('/staff');

  } catch (err) {
    console.error(err);
    res.render('auth/login', { errors: ['An error occurred. Please try again.'] });
  }
});

// GET /auth/change-password
router.get('/change-password', requireAuth, (req, res) => {
  res.render('auth/change-password', { errors: [], isFirstLogin: req.session.mustChangePassword });
});

// POST /auth/change-password
router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const errors = [];

  if (!currentPassword || !newPassword || !confirmPassword) {
    errors.push('All fields are required.');
  }
  if (newPassword && newPassword.length < 8) {
    errors.push('New password must be at least 8 characters.');
  }
  if (newPassword !== confirmPassword) {
    errors.push('New password and confirmation do not match.');
  }

  if (errors.length) {
    return res.render('auth/change-password', { errors, isFirstLogin: req.session.mustChangePassword });
  }

  try {
    const user = await User.findByPk(req.session.userId);

    if (!(await user.verifyPassword(currentPassword))) {
      return res.render('auth/change-password', {
        errors: ['Current password is incorrect.'],
        isFirstLogin: req.session.mustChangePassword
      });
    }

    if (newPassword === currentPassword) {
      return res.render('auth/change-password', {
        errors: ['New password must be different from current password.'],
        isFirstLogin: req.session.mustChangePassword
      });
    }

    await user.update({ password: newPassword, mustChangePassword: false });
    req.session.mustChangePassword = false;

    req.flash('success', 'Password changed successfully.');
    res.redirect('/staff');

  } catch (err) {
    console.error(err);
    res.render('auth/change-password', { errors: ['An error occurred.'], isFirstLogin: req.session.mustChangePassword });
  }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
});

module.exports = router;
