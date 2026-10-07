import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
  listDashboards,
  getDashboardById,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  refreshDashboard,
} from '../controllers/dashboardController';

const router = Router();

router.use(protect);

router.route('/')
  .get(listDashboards)
  .post(createDashboard);

router.route('/:id')
  .get(getDashboardById)
  .put(updateDashboard)
  .delete(deleteDashboard);

import { reportExportService } from '../services/ReportExportService';

router.post('/:id/refresh', refreshDashboard);

router.get('/:id/pdf', async (req, res, next) => {
  try {
    const { id } = req.params;

    const origin = req.headers.origin || req.headers.referer || 'http://localhost:5173';
    let base = 'http://localhost:5173';
    try {
      const url = new URL(origin as string);
      base = `${url.protocol}//${url.host}`;
    } catch (e) {}

    return res.redirect(`${base}/dashboard/${id}?download=pdf`);
  } catch (err) {
    next(err);
  }
});

export default router;
