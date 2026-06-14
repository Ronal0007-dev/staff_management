const express = require('express');
const router  = express.Router();
const { Department, SubDepartment, Unit, Staff, Location } = require('../models');
const { requireAuth, requirePasswordChanged } = require('../middleware/auth');

router.use(requireAuth, requirePasswordChanged);

// ── GET / — list departments (grouped by location) ──────────
router.get('/', async (req, res) => {
  const locations = await Location.findAll({
    where: { isActive: true },
    include: [{
      model: Department,
      as: 'departments',
      include: [{
        model: SubDepartment,
        as: 'subDepartments',
        include: [
          { model: Unit, as: 'units' },
          { model: Staff, as: 'staffMembers' }
        ]
      }]
    }],
    order: [['name', 'ASC']]
  });
  res.render('departments/index', { locations, errors: [] });
});

// ── POST / — create department ───────────────────────────────
router.post('/', async (req, res) => {
  const { name, locationId } = req.body;
  if (!locationId) { req.flash('error', 'Please select a location first.'); return res.redirect('/departments'); }
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + locationId;
  try {
    await Department.create({ name, slug, locationId: parseInt(locationId) });
    req.flash('success', `Department "${name}" created.`);
  } catch (err) {
    req.flash('error', 'Department already exists or invalid name.');
  }
  res.redirect('/departments');
});

// ── POST /:id/delete ─────────────────────────────────────────
router.post('/:id/delete', async (req, res) => {
  const dept = await Department.findByPk(req.params.id);
  if (dept) await dept.destroy();
  req.flash('success', 'Department deleted.');
  res.redirect('/departments');
});

// ── POST /:id/subdepartments ─────────────────────────────────
router.post('/:id/subdepartments', async (req, res) => {
  const { name } = req.body;
  try {
    await SubDepartment.create({ name, departmentId: parseInt(req.params.id) });
    req.flash('success', 'Sub-department added.');
  } catch (err) {
    req.flash('error', err.message);
  }
  res.redirect('/departments');
});

// ── POST /subdepartments/:id/delete ──────────────────────────
router.post('/subdepartments/:id/delete', async (req, res) => {
  const sub = await SubDepartment.findByPk(req.params.id);
  if (sub) await sub.destroy();
  req.flash('success', 'Sub-department deleted.');
  res.redirect('/departments');
});

// ── POST /subdepartments/:id/units ───────────────────────────
router.post('/subdepartments/:id/units', async (req, res) => {
  const { name } = req.body;
  try {
    await Unit.create({ name, subDepartmentId: parseInt(req.params.id) });
    req.flash('success', 'Unit added.');
  } catch (err) {
    req.flash('error', err.message);
  }
  res.redirect('/departments');
});

// ── POST /units/:id/delete ────────────────────────────────────
router.post('/units/:id/delete', async (req, res) => {
  const unit = await Unit.findByPk(req.params.id);
  if (unit) await unit.destroy();
  req.flash('success', 'Unit deleted.');
  res.redirect('/departments');
});

// ── AJAX: subdepts by dept ───────────────────────────────────
router.get('/:id/subdepartments', async (req, res) => {
  const subs = await SubDepartment.findAll({
    where: { departmentId: req.params.id },
    include: [{ model: Unit, as: 'units' }]
  });
  res.json(subs);
});

// ── AJAX: units by subdept ───────────────────────────────────
router.get('/subdepartments/:id/units', async (req, res) => {
  const units = await Unit.findAll({ where: { subDepartmentId: req.params.id } });
  res.json(units);
});

module.exports = router;
