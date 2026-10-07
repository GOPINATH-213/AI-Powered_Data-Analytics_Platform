import { Router } from 'express';
import { protect } from '../middleware/auth';
import { reportExportService } from '../services/ReportExportService';
import { datasetRepository } from '../repositories/DatasetRepository';
import { NotFoundError } from '../utils/errors';

const router = Router();

router.use(protect);

router.get('/:datasetId/pdf', async (req, res, next) => {
  try {
    const { datasetId } = req.params;
    const dataset = await datasetRepository.findById(datasetId);
    if (!dataset) {
      throw new NotFoundError('Dataset not found.');
    }

    const origin = req.headers.origin || req.headers.referer || 'http://localhost:5173';
    let base = 'http://localhost:5173';
    try {
      const url = new URL(origin as string);
      base = `${url.protocol}//${url.host}`;
    } catch (e) {}

    return res.redirect(`${base}/dataset-assessment/${datasetId}?download=pdf`);
  } catch (err) {
    next(err);
  }
});

export default router;
