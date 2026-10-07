import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { AppError } from '../middleware/error';

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401));
  }

  const { name, photoURL } = req.body;

  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (name !== undefined) user.name = name;
    if (photoURL !== undefined) user.photoURL = photoURL;

    await user.save();

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
