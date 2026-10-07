import { Request, Response, NextFunction } from 'express';
import { cloudinaryProvider } from '../providers/CloudinaryProvider';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';

export const uploadImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new ValidationError('No image file uploaded.');
    }

    const { originalname, mimetype, buffer } = req.file;

    // Check if it is an image mimetype
    if (!mimetype.startsWith('image/')) {
      throw new ValidationError('Only image file uploads are allowed on this endpoint.');
    }

    const result = await cloudinaryProvider.upload(buffer, originalname, mimetype);

    return sendSuccess(res, 'Image uploaded to media target successfully.', result, 201);
  } catch (err) {
    next(err);
  }
};

export const deleteImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new ValidationError('Cloudinary public resource ID is required.');
    }

    await cloudinaryProvider.delete(id);

    return sendSuccess(res, 'Media resource deleted successfully.');
  } catch (err) {
    next(err);
  }
};
export default uploadImage;
