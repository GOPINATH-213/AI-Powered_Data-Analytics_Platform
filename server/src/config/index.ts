import { env } from './env';
import { connectDB } from './mongodb';
import { getFirebaseAdmin, isFirebaseInitialized } from './firebase';
import { generateToken, verifyToken } from './jwt';

// Placeholders for future services configuration
const cloudinaryConfig = {
  cloudName: env.cloudinary.cloudName,
  apiKey: env.cloudinary.apiKey,
  apiSecret: env.cloudinary.apiSecret,
  isConfigured: !!(env.cloudinary.cloudName && env.cloudinary.apiKey),
};

const geminiConfig = {
  apiKey: env.gemini.apiKey,
  isConfigured: !!env.gemini.apiKey,
};

const emailConfig = {
  host: env.email.host,
  port: env.email.port,
  user: env.email.user,
  pass: env.email.pass,
  isConfigured: !!(env.email.host && env.email.user && env.email.pass),
};

const redisConfig = {
  url: env.redis.url,
  isConfigured: !!env.redis.url,
};

export {
  env,
  connectDB,
  getFirebaseAdmin,
  isFirebaseInitialized,
  generateToken,
  verifyToken,
  cloudinaryConfig as cloudinary,
  geminiConfig as gemini,
  emailConfig as email,
  redisConfig as redis,
};
