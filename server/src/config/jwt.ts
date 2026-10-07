import jwt from 'jsonwebtoken';
import { env } from './env';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  organizationId?: string;
}

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as any,
  });
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, env.jwt.secret) as JWTPayload;
};
