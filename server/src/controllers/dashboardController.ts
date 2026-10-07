import { Request, Response, NextFunction } from 'express';
import { dashboardRepository } from '../repositories/DashboardRepository';
import { widgetRepository } from '../repositories/WidgetRepository';
import { datasetRepository } from '../repositories/DatasetRepository';
import { combinedDatasetRepository } from '../repositories/CombinedDatasetRepository';
import { documentRepository } from '../repositories/DocumentRepository';
import { versionRepository } from '../repositories/VersionRepository';
import { datasetMetadataRepository } from '../repositories/DatasetMetadataRepository';
import { analyticsService } from '../services/AnalyticsService';
import { sendSuccess } from '../utils/response';
import { ValidationError, NotFoundError } from '../utils/errors';
import { datasetAssessmentRepository } from '../repositories/DatasetAssessmentRepository';
import { Types } from 'mongoose';

export const listDashboards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    const dashboards = await dashboardRepository.findByUserId(req.user.userId);
    return sendSuccess(res, 'Dashboards loaded successfully.', dashboards);
  } catch (err) {
    next(err);
  }
};

export const getDashboardById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    const { id } = req.params;
    const dashboard = await dashboardRepository.findById(id);
    if (!dashboard || dashboard.userId !== req.user.userId) {
      throw new NotFoundError('Dashboard not found or access denied.');
    }

    let finalDashboard = dashboard;

    // Automatic In-Sync recalculation checks
    if (dashboard.datasetId) {
      const datasetIdObj = (dashboard.datasetId as any)._id || dashboard.datasetId;
      let dataset = await datasetRepository.findById(datasetIdObj.toString());
      let combinedDataset = null;
      if (!dataset) {
        combinedDataset = await combinedDatasetRepository.findById(datasetIdObj.toString());
      }
      const currentDataset = dataset || combinedDataset;

      if (currentDataset && dataset && dataset.documentId) {
        const docId = (dataset.documentId as any)._id || dataset.documentId;
        const doc = await documentRepository.findById(docId.toString());
        if (doc) {
          const versions = await versionRepository.findByDocumentId(doc._id.toString());
          const latestVersionDoc = versions.find((v) => v.version === doc.currentVersion);
          if (latestVersionDoc && dashboard.currentVersion !== doc.currentVersion) {
            console.log(`[Auto Recalculate] Auto-refreshing out-of-sync KPIs from v${dashboard.currentVersion} to v${doc.currentVersion}`);
            await analyticsService.processDataset(dataset._id.toString(), req.user.userId);
            // Reload updated dashboard
            const freshDash = await dashboardRepository.findById(id);
            if (freshDash) {
              finalDashboard = freshDash;
            }
          }
        }
      }
    }

    // Validate that the active version of this dataset is suitable (Readiness Score >= 50)
    if (dashboard.datasetId) {
      const datasetIdObj = (dashboard.datasetId as any)._id || dashboard.datasetId;
      let dataset = await datasetRepository.findById(datasetIdObj.toString());
      let combinedDataset = null;
      if (!dataset) {
        combinedDataset = await combinedDatasetRepository.findById(datasetIdObj.toString());
      }
      const currentDataset = dataset || combinedDataset;

      if (currentDataset) {
        let activeVersionId: any = currentDataset._id;
        const isCombined = combinedDataset !== null || dataset?.isCombined;
        if (!isCombined && dataset && dataset.documentId) {
          const docId = (dataset.documentId as any)._id || dataset.documentId;
          const doc = await documentRepository.findById(docId.toString());
          if (doc) {
            const versions = await versionRepository.findByDocumentId(doc._id.toString());
            const latestVersionDoc = versions.find((v) => v.version === doc.currentVersion);
            activeVersionId = latestVersionDoc ? latestVersionDoc._id : doc._id;
          }
        }

        const assessment = await datasetAssessmentRepository.findByDatasetIdAndVersion(currentDataset._id, activeVersionId);
        if (assessment && assessment.analyticsReadinessScore < 50) {
          throw new ValidationError(`Access Blocked: The active version of this dataset is classified as Not Suitable for Business Analytics. DatasetId:${currentDataset._id.toString()}`);
        }
      }
    }

    // Load separate widgets
    const widgets = await widgetRepository.findByDashboardId(finalDashboard._id);

    return sendSuccess(res, 'Dashboard details loaded.', {
      dashboard: finalDashboard,
      widgets,
    });
  } catch (err) {
    next(err);
  }
};

export const createDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    const { datasetId, name, category } = req.body;
    if (!datasetId || !name) {
      throw new ValidationError('datasetId and name parameters are required.');
    }

    const dashboard = await dashboardRepository.create({
      userId: req.user.userId,
      datasetId: new Types.ObjectId(datasetId),
      dashboardName: name,
      dashboardCategory: category || 'General',
      layout: { columns: 12 },
    });

    return sendSuccess(res, 'Dashboard created successfully.', dashboard);
  } catch (err) {
    next(err);
  }
};

export const updateDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    const { id } = req.params;
    const { dashboardName, dashboardCategory, layout, filters } = req.body;

    const dashboard = await dashboardRepository.findById(id);
    if (!dashboard || dashboard.userId !== req.user.userId) {
      throw new NotFoundError('Dashboard not found or access denied.');
    }

    const updated = await dashboardRepository.update(id, {
      dashboardName: dashboardName || dashboard.dashboardName,
      dashboardCategory: dashboardCategory || dashboard.dashboardCategory,
      layout: layout || dashboard.layout,
      filters: filters || dashboard.filters,
    });

    return sendSuccess(res, 'Dashboard details updated successfully.', updated);
  } catch (err) {
    next(err);
  }
};

export const deleteDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    const { id } = req.params;
    const dashboard = await dashboardRepository.findById(id);

    if (!dashboard || dashboard.userId !== req.user.userId) {
      throw new NotFoundError('Dashboard not found or access denied.');
    }

    // Reset dataset status to allow re-ingestion
    if (dashboard.datasetId) {
      const datasetIdObj = (dashboard.datasetId as any)._id || dashboard.datasetId;
      const dataset = await datasetRepository.findById(datasetIdObj.toString());
      if (dataset) {
        dataset.processingStatus = 'pending';
        dataset.schemaStatus = 'pending';
        await dataset.save();
      }
    }

    // Delete widgets and dashboard
    await widgetRepository.deleteByDashboardId(dashboard._id);
    await dashboardRepository.delete(id);

    return sendSuccess(res, 'Dashboard and widgets permanently deleted.', null);
  } catch (err) {
    next(err);
  }
};

export const refreshDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    const { id } = req.params;
    const dashboard = await dashboardRepository.findById(id);

    if (!dashboard || dashboard.userId !== req.user.userId) {
      throw new NotFoundError('Dashboard not found or access denied.');
    }

    // Trigger full orchestrator re-processing on the source dataset
    const result = await analyticsService.processDataset(dashboard.datasetId.toString(), req.user.userId);
    return sendSuccess(res, 'Dashboard data refreshed successfully.', result);
  } catch (err) {
    next(err);
  }
};
