import { Router } from 'express';
import { 
  exportCombinedDatasetCSV, 
  exportCombinedDatasetExcel, 
  exportCombinedReportCSV, 
  exportCombinedReportExcel,
  exportCombinedReportPDF,
  exportCombinedDashboardPDF,
  renameCombinedDataset
} from '../controllers/combinedDatasetController';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.patch('/:id/rename', renameCombinedDataset);
router.get('/:id/export/csv', exportCombinedDatasetCSV);
router.get('/:id/export/excel', exportCombinedDatasetExcel);
router.get('/:id/export/report/csv', exportCombinedReportCSV);
router.get('/:id/export/report/excel', exportCombinedReportExcel);
router.get('/:id/export/report/pdf', exportCombinedReportPDF);
router.get('/:id/export/dashboard/pdf', exportCombinedDashboardPDF);

export default router;
