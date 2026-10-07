import { Request, Response, NextFunction } from 'express';
import { getFirebaseAdmin, isFirebaseInitialized } from '../config/firebase';
import { generateToken } from '../config/jwt';
import { User } from '../models/User';
import { AppError } from '../middleware/error';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  const { idToken } = req.body;

  if (!idToken) {
    return next(new AppError('Firebase ID token is required.', 400));
  }

  let uid: string;
  let email: string;
  let name: string;
  let photoURL: string | undefined;

  // Check if Firebase is initialized. If not, support a developer fallback mode.
  if (!isFirebaseInitialized) {
    console.warn('Firebase is not initialized. Using developer fallback login mode.');
    // Simulated token decoding for development. In production, this would reject.
    if (idToken.startsWith('dev-token-')) {
      const parts = idToken.split('-');
      email = parts[2] || 'dev-user@example.com';
      name = parts[3] || 'Developer User';
      uid = 'dev-uid-' + email.replace(/[@.]/g, '');
      photoURL = 'https://lh3.googleusercontent.com/a/default-user';
    } else if (idToken.split('.').length === 3) {
      try {
        const payloadPart = idToken.split('.')[1];
        const decodedPayload = JSON.parse(Buffer.from(payloadPart, 'base64').toString('utf8'));
        uid = decodedPayload.sub || decodedPayload.user_id;
        email = decodedPayload.email || 'dev-user@example.com';
        name = decodedPayload.name || decodedPayload.email?.split('@')[0] || 'Google User';
        photoURL = decodedPayload.picture;
      } catch (err) {
        return next(new AppError('Invalid token format for developer mode decoding.', 400));
      }
    } else {
      return next(
        new AppError(
          'Firebase config missing and invalid developer token format. Use "dev-token-email-name" or pass a standard JWT token.',
          400
        )
      );
    }
  } else {
    try {
      const adminSDK = getFirebaseAdmin();
      if (!adminSDK) {
        throw new Error('Firebase Admin SDK is not active.');
      }
      const decodedToken = await adminSDK.auth().verifyIdToken(idToken);
      uid = decodedToken.uid;
      email = decodedToken.email || '';
      name = decodedToken.name || decodedToken.email?.split('@')[0] || 'Google User';
      photoURL = decodedToken.picture;
    } catch (error) {
      return next(new AppError('Invalid Firebase ID token.', 401));
    }
  }

  try {
    // Find or create user
    let user = await User.findOne({ firebaseUID: uid });

    if (!user) {
      // Check if user with same email exists
      user = await User.findOne({ email });

      if (user) {
        // Link firebaseUID to existing email record
        user.firebaseUID = uid;
        if (photoURL && !user.photoURL) user.photoURL = photoURL;
        user.lastLogin = new Date();
        await user.save();
      } else {
        // Create new user
        user = await User.create({
          firebaseUID: uid,
          name,
          email,
          photoURL,
          provider: 'google.com',
          role: 'user',
          isActive: true,
          lastLogin: new Date(),
        });
      }
    } else {
      user.lastLogin = new Date();
      await user.save();
    }

    // Generate local JWT token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    });

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user: {
          id: user._id,
          firebaseUID: user.firebaseUID,
          name: user.name,
          email: user.email,
          photoURL: user.photoURL,
          role: user.role,
          organizationId: user.organizationId,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const logout = (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'User logged out successfully.',
  });
};

export const validateToken = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication context missing.', 401));
  }

  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.isActive) {
      return next(new AppError('User not found or deactivated.', 401));
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          firebaseUID: user.firebaseUID,
          name: user.name,
          email: user.email,
          photoURL: user.photoURL,
          role: user.role,
          organizationId: user.organizationId,
          isActive: user.isActive,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  // GET /api/auth/profile can leverage the exact same logic as validateToken
  return validateToken(req, res, next);
};
