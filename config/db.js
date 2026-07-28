const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const mongoUri = process.env.MONGO_URI;
const nodeEnv = process.env.NODE_ENV || 'development';

if (!mongoUri) {
  const error = new Error('MONGO_URI environment variable is not set. Add it to your .env file.');
  console.error(error.message);
  throw error;
}

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
