const express = require('express');
const router = express.Router();
const { Staff, Department, SubDepartment, Unit } = require('../models');
const { Op } = require('sequelize');
const nationalities = require('../config/nationalities');
const moment = require('moment');

// Helper: generate staff number
function generateStaffNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `STF-${year}-${rand}`;
}

// Helper: calculate contract end date from start date + months
function calcContractEndDate(startDate, months) {
  if (!startDate || !months) return null;
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + parseInt(months));
  return d.toISOString().slice(0, 10);
}

// List all staff
router.get('/', async (req, res) => {
  const { search, dept, deleted } = req.query;
  const where = {};
  if (deleted === 'true') where.deletedAt = { [require('sequelize').Op.ne]: null };

  const include = [
    { model: Department, as: 'department' },
    { model: SubDepartment, as: 'subDepartment' },
    { model: Unit, as: 'unit' }
  ];

  let staff = await Staff.findAll({
    where,
    include,
    paranoid: deleted !== 'true',
    order: [['createdAt', 'DESC']]
  });

  if (search) {
    const s = search.toLowerCase();
    staff = staff.filter(m =>
      m.firstName.toLowerCase().includes(s) ||
      m.lastName.toLowerCase().includes(s) ||
      (m.staffNumber && m.staffNumber.toLowerCase().includes(s))
    );
  }
  if (dept) {
    staff = staff.filter(m => m.department && m.department.slug === dept);
  }

  const departments = await Department.findAll({ order: [['name', 'ASC']] });

  // Find fixed-contract staff expiring within 3 months
  const today     = new Date();
  const in3Months = new Date();
  in3Months.setMonth(in3Months.getMonth() + 3);
  const expiringContracts = await Staff.findAll({
    where: {
      employmentType: 'Fixed',
      contractEndDate: { [Op.between]: [today.toISOString().slice(0,10), in3Months.toISOString().slice(0,10)] },
      deletedAt: null
    },
    include: [{ model: Department, as: 'department' }],
    order: [['contract_end_date', 'ASC']]
  });

  res.render('staff/index', {
    staff,
    departments,
    search: search || '',
    selectedDept: dept || '',
    showDeleted: deleted === 'true',
    expiringContracts,
    moment
  });
});

// New staff form
router.get('/new', async (req, res) => {
  const departments = await Department.findAll({
    include: [{ model: SubDepartment, as: 'subDepartments', include: [{ model: Unit, as: 'units' }] }],
    order: [['name', 'ASC']]
  });
  res.render('staff/new', { departments, nationalities, errors: [], old: {} });
});

// Create staff
router.post('/', async (req, res) => {
  const departments = await Department.findAll({
    include: [{ model: SubDepartment, as: 'subDepartments', include: [{ model: Unit, as: 'units' }] }],
    order: [['name', 'ASC']]
  });
  try {
    const data = req.body;
    const staffNumber = await generateStaffNumber();
    const isFixed = data.employmentType === 'Fixed';
    const contractStart = isFixed && data.contractStartDate ? data.contractStartDate : null;
    const contractEnd   = isFixed ? calcContractEndDate(contractStart, data.employmentLength) : null;
    await Staff.create({
      title: data.title,
      firstName: data.firstName,
      middleName: data.middleName || null,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      dateOfEmployment: data.dateOfEmployment,
      employmentType: data.employmentType,
      employmentLength: isFixed ? parseInt(data.employmentLength) : null,
      contractStartDate: contractStart,
      contractEndDate: contractEnd,
      educationLevel: data.educationLevel,
      nationality: data.nationality,
      departmentId: parseInt(data.departmentId),
      subDepartmentId: data.subDepartmentId ? parseInt(data.subDepartmentId) : null,
      unitId: data.unitId ? parseInt(data.unitId) : null,
      staffNumber
    });
    req.flash('success', 'Staff member added successfully.');
    res.redirect('/staff');
  } catch (err) {
    console.error(err);
    res.render('staff/new', { departments, nationalities, errors: [err.message], old: req.body });
  }
});

// Edit form
router.get('/:id/edit', async (req, res) => {
  const staff = await Staff.findByPk(req.params.id);
  if (!staff) return res.redirect('/staff');
  const departments = await Department.findAll({
    include: [{ model: SubDepartment, as: 'subDepartments', include: [{ model: Unit, as: 'units' }] }],
    order: [['name', 'ASC']]
  });
  res.render('staff/edit', { staff, departments, nationalities, errors: [], moment });
});

// Update
router.post('/:id', async (req, res) => {
  const staff = await Staff.findByPk(req.params.id);
  if (!staff) return res.redirect('/staff');
  const departments = await Department.findAll({
    include: [{ model: SubDepartment, as: 'subDepartments', include: [{ model: Unit, as: 'units' }] }],
    order: [['name', 'ASC']]
  });
  try {
    const data = req.body;
    const isFixed2 = data.employmentType === 'Fixed';
    const contractStart2 = isFixed2 && data.contractStartDate ? data.contractStartDate : null;
    const contractEnd2   = isFixed2 ? calcContractEndDate(contractStart2, data.employmentLength) : null;
    await staff.update({
      title: data.title,
      firstName: data.firstName,
      middleName: data.middleName || null,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      dateOfEmployment: data.dateOfEmployment,
      employmentType: data.employmentType,
      employmentLength: isFixed2 ? parseInt(data.employmentLength) : null,
      contractStartDate: contractStart2,
      contractEndDate: contractEnd2,
      educationLevel: data.educationLevel,
      nationality: data.nationality,
      departmentId: parseInt(data.departmentId),
      subDepartmentId: data.subDepartmentId ? parseInt(data.subDepartmentId) : null,
      unitId: data.unitId ? parseInt(data.unitId) : null
    });
    req.flash('success', 'Staff member updated successfully.');
    res.redirect('/staff');
  } catch (err) {
    console.error(err);
    res.render('staff/edit', { staff, departments, nationalities, errors: [err.message], moment });
  }
});

// Soft delete
router.post('/:id/delete', async (req, res) => {
  const staff = await Staff.findByPk(req.params.id);
  if (staff) await staff.destroy();
  req.flash('success', 'Staff member removed.');
  res.redirect('/staff');
});

// Restore
router.post('/:id/restore', async (req, res) => {
  const staff = await Staff.findOne({ where: { id: req.params.id }, paranoid: false });
  if (staff) await staff.restore();
  req.flash('success', 'Staff member restored.');
  res.redirect('/staff?deleted=true');
});

// View single (JSON for modal)
router.get('/:id/view', async (req, res) => {
  const staff = await Staff.findByPk(req.params.id, {
    include: [
      { model: Department, as: 'department' },
      { model: SubDepartment, as: 'subDepartment' },
      { model: Unit, as: 'unit' }
    ]
  });
  if (!staff) return res.status(404).json({ error: 'Not found' });

  res.json({
    id:               staff.id,
    staffNumber:      staff.staffNumber,
    title:            staff.title,
    firstName:        staff.firstName,
    middleName:       staff.middleName,
    lastName:         staff.lastName,
    dateOfBirth:      staff.dateOfBirth,
    nationality:      staff.nationality,
    dateOfEmployment: staff.dateOfEmployment,
    employmentType:   staff.employmentType,
    employmentLength:   staff.employmentLength,
    contractStartDate:  staff.contractStartDate,
    contractEndDate:    staff.contractEndDate,
    educationLevel:     staff.educationLevel,
    department:    staff.department    ? { name: staff.department.name }    : null,
    subDepartment: staff.subDepartment ? { name: staff.subDepartment.name } : null,
    unit:          staff.unit          ? { name: staff.unit.name }          : null,
  });
});

// Print individual
router.get('/:id/print', async (req, res) => {
  const staff = await Staff.findByPk(req.params.id, {
    include: [
      { model: Department, as: 'department' },
      { model: SubDepartment, as: 'subDepartment' },
      { model: Unit, as: 'unit' }
    ]
  });
  if (!staff) return res.redirect('/staff');
  res.render('staff/print-single', { staff, moment });
});

// Print list
router.get('/print/list', async (req, res) => {
  const { dept } = req.query;
  let staff = await Staff.findAll({
    include: [
      { model: Department, as: 'department' },
      { model: SubDepartment, as: 'subDepartment' },
      { model: Unit, as: 'unit' }
    ],
    order: [['lastName', 'ASC']]
  });
  if (dept) staff = staff.filter(m => m.department && m.department.slug === dept);
  const departments = await Department.findAll();
  const selectedDept = dept ? departments.find(d => d.slug === dept) : null;
  res.render('staff/print-list', { staff, selectedDept, moment });
});

module.exports = router;
