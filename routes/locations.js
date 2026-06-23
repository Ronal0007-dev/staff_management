const express  = require('express');
const router   = express.Router();
const { Location, Department, Staff, SubDepartment, Unit } = require('../models');
const { Op } = require('sequelize');
const { requireAuth, requirePasswordChanged, requireSuperAdmin } = require('../middleware/auth');
const moment   = require('moment');

router.use(requireAuth, requirePasswordChanged);

// ── GET /locations — list all locations ─────────────────────
router.get('/', async (req, res) => {
  const locations = await Location.findAll({
    include: [{
      model: Department,
      as: 'departments',
      include: [{ model: SubDepartment, as: 'subDepartments' }]
    }],
    order: [['name', 'ASC']]
  });

  // Count staff per location
  const staffCounts = await Staff.findAll({
    attributes: ['location_id', [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']],
    group: ['location_id'],
    raw: true
  });
  const countMap = {};
  staffCounts.forEach(r => { countMap[r.location_id] = parseInt(r.count); });

  res.render('locations/index', { locations, countMap, errors: [] });
});

// ── GET /locations/:id/staff — view staff at location ────────
router.get('/:id/staff', async (req, res) => {
  const location = await Location.findByPk(req.params.id);
  if (!location) { req.flash('error', 'Location not found.'); return res.redirect('/locations'); }

  const { search, dept } = req.query;

  let staff = await Staff.findAll({
    where: { locationId: location.id },
    include: [
      { model: Department,    as: 'department' },
      { model: SubDepartment, as: 'subDepartment' },
      { model: Unit,          as: 'unit' }
    ],
    order: [['last_name', 'ASC']]
  });

  // Auto-hide Fixed staff whose contract ended 90+ days ago
  staff = staff.filter(m => !Staff.shouldAutoHide(m.contractEndDate, m.contractStatus));

  // Client-side filters
  if (search) {
    const s = search.toLowerCase();
    staff = staff.filter(m =>
      m.firstName.toLowerCase().includes(s) ||
      m.lastName.toLowerCase().includes(s)  ||
      (m.staffNumber && m.staffNumber.toLowerCase().includes(s))
    );
  }
  if (dept) {
    staff = staff.filter(m => m.department && m.department.id === parseInt(dept));
  }

  const departments = await Department.findAll({
    where: { locationId: location.id },
    order: [['name', 'ASC']]
  });

  res.render('locations/staff', {
    location, staff, departments,
    search: search || '', selectedDept: dept || '',
    moment
  });
});

// ── POST /locations — create ─────────────────────────────────
router.post('/', requireSuperAdmin, async (req, res) => {
  const { name, address, region, country } = req.body;
  try {
    await Location.create({ name, address, region, country });
    req.flash('success', `Location "${name}" created.`);
  } catch (err) {
    req.flash('error', err.message);
  }
  res.redirect('/locations');
});

// ── POST /locations/:id/edit — update ───────────────────────
router.post('/:id/edit', requireSuperAdmin, async (req, res) => {
  const loc = await Location.findByPk(req.params.id);
  if (!loc) { req.flash('error', 'Location not found.'); return res.redirect('/locations'); }
  const { name, address, region, country, isActive } = req.body;
  try {
    await loc.update({ name, address, region, country, isActive: isActive === 'true' });
    req.flash('success', `Location "${name}" updated.`);
  } catch (err) {
    req.flash('error', err.message);
  }
  res.redirect('/locations');
});

// ── POST /locations/:id/delete ────────────────────────────────
router.post('/:id/delete', requireSuperAdmin, async (req, res) => {
  const loc = await Location.findByPk(req.params.id);
  if (!loc) { req.flash('error', 'Location not found.'); return res.redirect('/locations'); }
  const deptCount = await Department.count({ where: { locationId: loc.id } });
  if (deptCount > 0) {
    req.flash('error', `Cannot delete — ${deptCount} department(s) are assigned to this location.`);
    return res.redirect('/locations');
  }
  await loc.destroy();
  req.flash('success', 'Location deleted.');
  res.redirect('/locations');
});

// ── GET /locations/:id/departments (AJAX) ────────────────────
router.get('/:id/departments', async (req, res) => {
  const depts = await Department.findAll({
    where: { locationId: req.params.id, ...(req.query.active ? {} : {}) },
    include: [{
      model: SubDepartment,
      as: 'subDepartments',
      include: [{ model: Unit, as: 'units' }]
    }],
    order: [['name', 'ASC']]
  });
  res.json(depts);
});

// ── Print staff at location ───────────────────────────────────
router.get('/:id/print', async (req, res) => {
  const location = await Location.findByPk(req.params.id);
  if (!location) return res.redirect('/locations');

  let staff = await Staff.findAll({
    where: { locationId: location.id },
    include: [
      { model: Department,    as: 'department' },
      { model: SubDepartment, as: 'subDepartment' },
      { model: Unit,          as: 'unit' }
    ],
    order: [['last_name', 'ASC']]
  });

  // Exclude auto-hidden staff from print too
  staff = staff.filter(m => !Staff.shouldAutoHide(m.contractEndDate, m.contractStatus));

  res.render('locations/print', { location, staff, moment });
});

module.exports = router;
