const mongoose = require('mongoose');

const mongoUri = process.env.MONGO_URI;
const nodeEnv = process.env.NODE_ENV || 'development';

mongoose.set('strictQuery', false);

const connectDB = async () => {
  try {
    await mongoose.connect(mongoUri);

    console.log(`MongoDB connected (${nodeEnv})`);

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected.');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message || error);
    throw error;
  }
};

module.exports = connectDB;
