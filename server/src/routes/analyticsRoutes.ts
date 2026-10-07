import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
  processDataset,
  getJobStatus,
  getDatasetMetadata,
  getDatasetKPIs,
} from '../controllers/analyticsController';

const router = Router();

router.use(protect);

router.post('/process', processDataset);
router.get('/status/:datasetId', getJobStatus);
router.get('/metadata/:datasetId', getDatasetMetadata);
router.get('/kpis/:datasetId', getDatasetKPIs);

export default router;
