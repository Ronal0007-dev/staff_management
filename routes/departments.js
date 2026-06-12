const express = require('express');
const router = express.Router();
const { Department, SubDepartment, Unit, Staff } = require('../models');

// List departments
router.get('/', async (req, res) => {
  const departments = await Department.findAll({
    include: [{
      model: SubDepartment,
      as: 'subDepartments',
      include: [
        { model: Unit, as: 'units' },
        { model: Staff, as: 'staffMembers' }
      ]
    }],
    order: [['name', 'ASC']]
  });
  res.render('departments/index', { departments, errors: [] });
});

// Create department
router.post('/', async (req, res) => {
  const { name } = req.body;
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  try {
    await Department.create({ name, slug });
    req.flash('success', 'Department created.');
  } catch (err) {
    req.flash('error', 'Department already exists or invalid.');
  }
  res.redirect('/departments');
});

// Delete department
router.post('/:id/delete', async (req, res) => {
  const dept = await Department.findByPk(req.params.id);
  if (dept) await dept.destroy();
  req.flash('success', 'Department deleted.');
  res.redirect('/departments');
});

// Create sub-department
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

// Delete sub-department
router.post('/subdepartments/:id/delete', async (req, res) => {
  const sub = await SubDepartment.findByPk(req.params.id);
  if (sub) await sub.destroy();
  req.flash('success', 'Sub-department deleted.');
  res.redirect('/departments');
});

// Create unit
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

// Delete unit
router.post('/units/:id/delete', async (req, res) => {
  const unit = await Unit.findByPk(req.params.id);
  if (unit) await unit.destroy();
  req.flash('success', 'Unit deleted.');
  res.redirect('/departments');
});

// AJAX: get subdepts by dept
router.get('/:id/subdepartments', async (req, res) => {
  const subs = await SubDepartment.findAll({
    where: { departmentId: req.params.id },
    include: [{ model: Unit, as: 'units' }]
  });
  res.json(subs);
});

// AJAX: get units by subdept
router.get('/subdepartments/:id/units', async (req, res) => {
  const units = await Unit.findAll({ where: { subDepartmentId: req.params.id } });
  res.json(units);
});

module.exports = router;
