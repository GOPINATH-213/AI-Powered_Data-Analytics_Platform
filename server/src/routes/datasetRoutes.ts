import { Router } from 'express';
import { 
  listDatasets, 
  getDatasetDetails, 
  deleteDataset, 
  previewCombineDatasets, 
  combineDatasets, 
  checkDatasetDependencies,
  getDatasetPreview,
  exportDatasetCSV,
  exportDatasetExcel
} from '../controllers/datasetController';
import { protect } from '../middleware/auth';

const router = Router();

// Apply auth middleware
router.use(protect);

router.get('/', listDatasets);
router.post('/combine/preview', previewCombineDatasets);
router.post('/combine', combineDatasets);
router.get('/:id/dependencies', checkDatasetDependencies);
router.get('/:id/preview', getDatasetPreview);
router.get('/:id/export/csv', exportDatasetCSV);
router.get('/:id/export/excel', exportDatasetExcel);
router.get('/:id', getDatasetDetails);
router.delete('/:id', deleteDataset);

export default router;
