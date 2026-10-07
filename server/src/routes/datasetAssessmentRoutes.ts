import { Router } from 'express';
import {
  getAssessment,
  recalculateAssessment,
  getAssessmentReport,
  getAssessmentHistory
} from '../controllers/datasetAssessmentController';
import { protect } from '../middleware/auth';

const router = Router();

// Apply auth protection middleware
router.use(protect);

router.post('/recalculate', recalculateAssessment);
router.get('/history/:datasetId', getAssessmentHistory);
router.get('/report/:datasetId', getAssessmentReport);
router.get('/:datasetId', getAssessment);

export default router;
