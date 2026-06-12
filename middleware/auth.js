// Ensure user is logged in
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    req.flash('error', 'Please log in to access this page.');
    return res.redirect('/auth/login');
  }
  next();
}

// Ensure user has completed first-login password change
function requirePasswordChanged(req, res, next) {
  if (req.session.mustChangePassword) {
    req.flash('error', 'You must change your password before continuing.');
    return res.redirect('/auth/change-password');
  }
  next();
}

// Ensure user is super_admin
function requireSuperAdmin(req, res, next) {
  if (!req.session.userId) {
    req.flash('error', 'Please log in.');
    return res.redirect('/auth/login');
  }
  if (req.session.userRole !== 'super_admin') {
    req.flash('error', 'Access denied. Super Admin only.');
    return res.redirect('/staff');
  }
  next();
}

// Check a specific permission string
function requirePermission(perm) {
  return (req, res, next) => {
    if (!req.session.userId) {
      req.flash('error', 'Please log in.');
      return res.redirect('/auth/login');
    }
    const perms = req.session.userPermissions || [];
    if (!perms.includes(perm)) {
      req.flash('error', `Access denied. You need the "${perm}" permission.`);
      return res.redirect('back');
    }
    next();
  };
}

module.exports = { requireAuth, requirePasswordChanged, requireSuperAdmin, requirePermission };
