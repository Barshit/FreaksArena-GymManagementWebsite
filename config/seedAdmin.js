const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');

const ensureAdminAccount = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Gym Owner';

  if (!adminEmail || !adminPassword) {
    console.warn('ADMIN_EMAIL and ADMIN_PASSWORD are required to seed the admin account. Skipping admin seed.');
    return;
  }

  const normalizedEmail = adminEmail.trim().toLowerCase();
  const existingAdmin = await Admin.findOne({ email: normalizedEmail });

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
