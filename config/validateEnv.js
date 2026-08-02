const validateEnv = () => {
  const requiredVars = [
    'MONGO_URI',
    'SESSION_SECRET',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD',
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

  console.log('Environment variables validated successfully.');
};

module.exports = validateEnv;
