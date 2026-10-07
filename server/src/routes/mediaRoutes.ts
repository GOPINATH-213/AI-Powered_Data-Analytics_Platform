import { Router } from 'express';
import { uploadImage, deleteImage } from '../controllers/mediaController';
import { protect } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// Apply auth middleware to protect media resource uploads
router.use(protect);

router.post('/upload-image', upload.single('image'), uploadImage);
router.delete('/:id', deleteImage);

export default router;
