const express = require('express');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const { sequelize } = require('./models');
const { requireAuth, requirePasswordChanged } = require('./middleware/auth');

const app = express();

// View engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Method override
app.use(methodOverride('_method'));

// Session
app.use(session({
  secret: 'staff_mgmt_secret_2024_secure',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 3600000 * 8 } // 8 hours
}));

// Flash
app.use(flash());

// Global locals — inject session user into all views
app.use((req, res, next) => {
  res.locals.success        = req.flash('success');
  res.locals.error          = req.flash('error');
  res.locals.currentPath    = req.path;
  res.locals.sessionUser    = req.session.userId ? {
    id:          req.session.userId,
    username:    req.session.username,
    fullName:    req.session.fullName,
    role:        req.session.userRole,
    permissions: req.session.userPermissions || [],
    mustChange:  req.session.mustChangePassword
  } : null;
  next();
});

// Public routes (no auth)
app.use('/auth', require('./routes/auth'));

// Protected routes
app.use('/staff',       requireAuth, requirePasswordChanged, require('./routes/staff'));
app.use('/departments', requireAuth, requirePasswordChanged, require('./routes/departments'));
app.use('/users',       require('./routes/users'));
app.use('/locations',   require('./routes/locations'));

// Dashboard redirect
app.get('/', (req, res) => {
  if (!req.session.userId) return res.redirect('/auth/login');
  if (req.session.mustChangePassword) return res.redirect('/auth/change-password');
  res.redirect('/staff');
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { code: 404, message: 'Page not found' });
});

// Sync DB and start
const PORT = process.env.PORT || 3000;
sequelize.sync({ alter: false }).then(() => {
  console.log('Database synced.');
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
}).catch(err => {
  console.error('DB sync error:', err.message);
  app.listen(PORT, () => console.log(`Server at http://localhost:${PORT} (no DB)`));
});
