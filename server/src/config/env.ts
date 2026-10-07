import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_development_jwt_secret_key_12345!',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/bi_analytics_platform',
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },
  // Future services configurations (placeholders)
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  email: {
    host: process.env.EMAIL_HOST || '',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },
  redis: {
    url: process.env.REDIS_URL || '',
  },
  pythonService: {
    url: process.env.PYTHON_SERVICE_URL || 'http://localhost:8000',
  },
};

// Simple validation warning in development
if (!process.env.MONGODB_URI) {
  console.warn('WARNING: MONGODB_URI environment variable is not defined. Using local fallback.');
}
if (!process.env.FIREBASE_PROJECT_ID && env.nodeEnv === 'production') {
  console.error('ERROR: FIREBASE_PROJECT_ID must be specified in production!');
}
