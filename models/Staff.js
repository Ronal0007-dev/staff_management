const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Staff = sequelize.define(
  "Staff",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: {
      type: DataTypes.ENUM("Mr", "Mrs", "Ms", "Miss"),
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "first_name",
    },
    middleName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "middle_name",
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "last_name",
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "date_of_birth",
    },
    dateOfEmployment: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "date_of_employment",
    },

    employmentType: {
      type: DataTypes.ENUM("Fixed", "Permanent", "Temporary"),
      allowNull: false,
      field: "employment_type",
    },
    employmentLength: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "employment_length",
      comment: "In months, for Fixed type",
    },
    contractStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "contract_start_date",
    },
    contractEndDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "contract_end_date",
    },

    // ── Contract status (Fixed contracts only) ───────────────
    // active     → contract is ongoing
    // expired    → past end date, no action taken yet
    // renewed    → admin renewed within 2-month grace window
    // terminated → admin confirmed termination within 2-month grace window
    // auto_removed → system hid after 3 months past end date
    contractStatus: {
      type: DataTypes.ENUM(
        "active",
        "expired",
        "renewed",
        "terminated",
        "auto_removed",
      ),
      allowNull: true,
      defaultValue: null,
      field: "contract_status",
    },

    // When the admin last changed the contract status
    contractStatusChangedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "contract_status_changed_at",
    },
    contractStatusNote: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "contract_status_note",
    },

    educationLevel: {
      type: DataTypes.ENUM(
        "Unskilled",
        "Certificate",
        "Diploma",
        "Degree",
        "Masters",
        "PHD",
      ),
      allowNull: false,
      field: "education_level",
    },
    nationality: { type: DataTypes.STRING(100), allowNull: false },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "department_id",
    },
    subDepartmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "sub_department_id",
    },
    unitId: { type: DataTypes.INTEGER, allowNull: true, field: "unit_id" },
    locationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "location_id",
    },
    staffNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
      field: "staff_number",
    },
    deletedAt: { type: DataTypes.DATE, allowNull: true, field: "deleted_at" },
  },
  {
    timestamps: true,
    tableName: "staff",
    paranoid: true,
    deletedAt: "deleted_at",
  },
);

// ── Helpers attached to model ────────────────────────────────

// Days since contract end (positive = expired, negative = still active)
Staff.daysSinceExpiry = function (contractEndDate) {
  if (!contractEndDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(contractEndDate);
  return Math.floor((today - end) / 86400000);
};

// Can admin still change contract status? (within 2 months = 60 days of expiry)
Staff.canChangeStatus = function (contractEndDate) {
  const days = Staff.daysSinceExpiry(contractEndDate);
  return days !== null && days > 0 && days <= 60;
};

// Should this staff be auto-hidden from lists? (3+ months = 90 days past end)
Staff.shouldAutoHide = function (contractEndDate, contractStatus) {
  const days = Staff.daysSinceExpiry(contractEndDate);
  if (days === null) return false;
  if (
    days >= 90 &&
    (contractStatus === "expired" ||
      contractStatus === "active" ||
      contractStatus === null)
  )
    return true;
  return false;
};

module.exports = Staff;
