import { Router } from 'express';
import { getMe, updateProfile } from '../controllers/userController';
import { protect } from '../middleware/auth';

const router = Router();

// Apply auth middleware to protect user routes
router.use(protect);

router.get('/me', getMe);
router.put('/profile', updateProfile);

export default router;
