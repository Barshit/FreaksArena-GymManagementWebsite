const validateEnv = () => {
  const requiredVars = [
    'MONGO_URI',
    'SESSION_SECRET',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD',
  ];

  const optionalVars = [
    'FRONTEND_URL',
    'SESSION_MAX_AGE',
    'SESSION_TOUCH_AFTER',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('Environment variable validation failed:');
    missingVars.forEach(varName => {
      console.error(`  - ${varName} is required but not set`);
    });
    console.error('\nPlease set the required environment variables in your .env file and restart the application.');
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate session secret strength
  if (process.env.SESSION_SECRET) {
    if (process.env.SESSION_SECRET.length < 32) {
      console.warn('⚠️  WARNING: SESSION_SECRET should be at least 32 characters long for security');
      console.warn('   Current length:', process.env.SESSION_SECRET.length);
    }
    if (process.env.SESSION_SECRET === 'your-random-secret-key-at-least-32-characters-long') {
      console.warn('⚠️  WARNING: SESSION_SECRET is using a default value. Please change it for production!');
    }
  }

  // Validate admin password strength
  if (process.env.ADMIN_PASSWORD) {
    if (process.env.ADMIN_PASSWORD.length < 8) {
      console.warn('⚠️  WARNING: ADMIN_PASSWORD should be at least 8 characters long for security');
    }
    if (process.env.ADMIN_PASSWORD === 'your-secure-password') {
      console.warn('⚠️  WARNING: ADMIN_PASSWORD is using a default value. Please change it for production!');
    }
  }

  // Validate email format
  if (process.env.ADMIN_EMAIL) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(process.env.ADMIN_EMAIL)) {
      console.warn('⚠️  WARNING: ADMIN_EMAIL format appears invalid');
    }
  }

  // Warn about optional variables in production
  if (process.env.NODE_ENV === 'production') {
    const missingOptional = optionalVars.filter(varName => !process.env[varName]);
    if (missingOptional.length > 0) {
      console.warn('Warning: Recommended environment variables not set in production:');
      missingOptional.forEach(varName => {
        console.warn(`  - ${varName} is recommended for production`);
      });
    }
    
    // Security warnings for production
    if (!process.env.FRONTEND_URL) {
      console.warn('⚠️  WARNING: FRONTEND_URL not set in production. CORS may not work correctly.');
    }
  }

  console.log('✅ Environment variables validated successfully.');
};

module.exports = validateEnv;
