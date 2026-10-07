import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { isFirebaseInitialized } from '../config/firebase';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.status(200).json({
    status: 'success',
    timestamp: new Date().toISOString(),
    services: {
      server: 'healthy',
      database: dbStatus,
      firebaseAuth: isFirebaseInitialized ? 'initialized' : 'mock_fallback_mode',
    },
  });
});

export default router;
