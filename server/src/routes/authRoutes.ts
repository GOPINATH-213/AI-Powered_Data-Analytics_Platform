import { Router } from 'express';
import { login, logout, getProfile, validateToken } from '../controllers/authController';
import { protect } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);

// Protected routes
router.get('/profile', protect, getProfile);
router.get('/validate', protect, validateToken);

export default router;
