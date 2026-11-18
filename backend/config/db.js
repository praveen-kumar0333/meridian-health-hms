import mongoose from 'mongoose';

let connectionState = {
  isConnected: false,
  status: 'disconnected',
  message: 'MongoDB URI not configured yet.',
};

export const getDbStatus = () => ({
  isConnected: mongoose.connection.readyState === 1,
  readyState: mongoose.connection.readyState,
  status:
    mongoose.connection.readyState === 1
      ? 'connected'
      : mongoose.connection.readyState === 2
      ? 'connecting'
      : 'disconnected',
  message: connectionState.message,
});

export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri || mongoUri === 'YOUR_MONGODB_CONNECTION_STRING') {
    connectionState = {
      isConnected: false,
      status: 'unconfigured',
      message: 'Waiting for MONGO_URI environment variable.',
    };
    console.warn('[Database] MONGO_URI is not configured. Waiting for connection string.');
    return false;
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
    });
    connectionState = {
      isConnected: true,
      status: 'connected',
      message: `Connected to MongoDB (${conn.connection.name})`,
    };
    console.log(`[Database] Connected to MongoDB: ${conn.connection.host}`);
    return true;
  } catch (error) {
    connectionState = {
      isConnected: false,
      status: 'error',
      message: 'Failed to connect to MongoDB. Please verify MONGO_URI and network access.',
    };
    console.error('[Database] Connection error:', error.message);
    return false;
  }
};
