import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/AnalyticsService';
import { processingJobRepository } from '../repositories/ProcessingJobRepository';
import { datasetMetadataRepository } from '../repositories/DatasetMetadataRepository';
import { dashboardRepository } from '../repositories/DashboardRepository';
import { dashboardMetricRepository } from '../repositories/DashboardMetricRepository';
import { sendSuccess } from '../utils/response';
import { ValidationError, NotFoundError } from '../utils/errors';

export const processDataset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    const { datasetId } = req.body;
    if (!datasetId) {
      throw new ValidationError('datasetId parameter is required.');
    }

    // Run pipeline (currently synchronous for simple integration)
    const result = await analyticsService.processDataset(datasetId, req.user.userId);
    return sendSuccess(res, 'Dataset pipeline executed successfully.', result);
  } catch (err) {
    next(err);
  }
};

export const getJobStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    const { datasetId } = req.params;
    const job = await processingJobRepository.findLatestByDatasetId(datasetId);

    if (!job) {
      return sendSuccess(res, 'No processing jobs registered for this dataset.', { status: 'idle' });
    }

    return sendSuccess(res, 'Job status retrieved successfully.', job);
  } catch (err) {
    next(err);
  }
};

export const getDatasetMetadata = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    const { datasetId } = req.params;
    const metadata = await datasetMetadataRepository.findLatestByDatasetId(datasetId);

    if (!metadata) {
      throw new NotFoundError('No metadata registered for this dataset. Please run ingestion first.');
    }

    return sendSuccess(res, 'Dataset metadata loaded.', metadata);
  } catch (err) {
    next(err);
  }
};

export const getDatasetKPIs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    const { datasetId } = req.params;
    const dash = await dashboardRepository.findOne({ datasetId, userId: req.user.userId });
    if (!dash) {
      throw new NotFoundError('No dashboard associated with this dataset.');
    }

    const metrics = await dashboardMetricRepository.findByDashboardId(dash._id);
    return sendSuccess(res, 'Precomputed KPIs retrieved successfully.', metrics);
  } catch (err) {
    next(err);
  }
};
