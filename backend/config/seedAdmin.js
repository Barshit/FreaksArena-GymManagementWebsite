const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');
const { validatePassword } = require('../utils/passwordValidator');

const ensureAdminAccount = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Gym Owner';

  // Validate password against policy
  const passwordValidation = validatePassword(adminPassword);
  if (!passwordValidation.isValid) {
    console.error(`Invalid admin password from environment: ${passwordValidation.message}`);
    console.error('Admin account seeding failed due to invalid password policy.');
    return;
  }

  const normalizedEmail = adminEmail.trim().toLowerCase();

// Check if ANY admin already exists
const existingAdmin = await Admin.findOne();

if (existingAdmin) {
  return;
}

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  await Admin.create({
    name: adminName,
    email: normalizedEmail,
    password: hashedPassword,
    role: 'superadmin',
    status: 'active',
  });

  console.log(`Admin account seeded for ${normalizedEmail}`);
};

module.exports = ensureAdminAccount;
