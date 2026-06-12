/**
 * create-super-admin.js
 * ---------------------
 * Run once to create the Super Admin account.
 * Usage:  node create-super-admin.js
 *
 * You can also pass custom credentials:
 *   node create-super-admin.js --username=admin --password=MyPass@123 --email=admin@school.com
 */

const path = require('path');

// ── Parse optional CLI args ─────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => { const [k, v] = a.slice(2).split('='); return [k, v]; })
);

const FULL_NAME = args.name     || 'Super Administrator';
const USERNAME  = args.username || 'superadmin';
const EMAIL     = args.email    || 'superadmin@school.ac.tz';
const PASSWORD  = args.password || 'Admin@1234';

// ── Load models ─────────────────────────────────────────────────────────────
const { sequelize, User } = require('./models');

async function run() {
  try {
    console.log('\n📦  Connecting to database...');
    await sequelize.authenticate();
    console.log('✔   Database connected.\n');

    // Sync only the users table (create if missing)
    await User.sync({ alter: true });
    console.log('✔   Users table ready.\n');

    // Check if superadmin already exists
    const existing = await User.findOne({ where: { username: USERNAME } });

    if (existing) {
      console.log(`⚠️   A user with username "${USERNAME}" already exists.`);
      console.log('    If you forgot the password, use Option 2: reset it via MySQL.\n');
      process.exit(0);
    }

    // Create the super admin
    const user = await User.create({
      fullName:          FULL_NAME,
      username:          USERNAME.toLowerCase(),
      email:             EMAIL.toLowerCase(),
      password:          PASSWORD,          // hashed by model hook
      role:              'super_admin',
      permissions:       User.defaultPermissions.super_admin,
      isActive:          true,
      mustChangePassword: true,             // force change on first login
    });

    console.log('✅  Super Admin created successfully!\n');
    console.log('┌─────────────────────────────────────────┐');
    console.log('│         LOGIN CREDENTIALS                │');
    console.log('├─────────────────────────────────────────┤');
    console.log(`│  Username : ${USERNAME.padEnd(28)}│`);
    console.log(`│  Password : ${PASSWORD.padEnd(28)}│`);
    console.log('├─────────────────────────────────────────┤');
    console.log('│  ⚠  You will be asked to change your    │');
    console.log('│     password on first login.             │');
    console.log('└─────────────────────────────────────────┘\n');
    console.log(`  → Open http://localhost:3000 and log in.\n`);

    process.exit(0);
  } catch (err) {
    if (err.name === 'SequelizeConnectionRefusedError' || err.name === 'SequelizeConnectionError') {
      console.error('\n❌  Cannot connect to MySQL.');
      console.error('    • Is MySQL running?');
      console.error('    • Check DB_HOST, DB_USER, DB_PASS, DB_NAME in your .env file.\n');
    } else {
      console.error('\n❌  Error:', err.message, '\n');
    }
    process.exit(1);
  }
}

run();
