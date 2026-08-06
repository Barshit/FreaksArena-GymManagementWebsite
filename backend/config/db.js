const mongoose = require('mongoose');

const mongoUri = process.env.MONGO_URI;
const nodeEnv = process.env.NODE_ENV || 'development';

mongoose.set('strictQuery', false);

// Enhanced MongoDB connection options for production
const connectOptions = {
  maxPoolSize: 10, // Maximum pool size for connection pooling
  minPoolSize: 2, // Minimum pool size to maintain
  serverSelectionTimeoutMS: 5000, // Timeout for server selection
  socketTimeoutMS: 45000, // Socket timeout
  family: 4, // Use IPv4, skip trying IPv6
  retryWrites: true, // Retry failed writes
  retryReads: true, // Retry failed reads
};

const connectDB = async () => {
  try {
    await mongoose.connect(mongoUri, connectOptions);

    console.log(`MongoDB connected (${nodeEnv})`);

    // Handle connection events
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to MongoDB');
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected.');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message || error);
    throw error;
  }
};

module.exports = connectDB;
