import { Request, Response, NextFunction } from 'express';
import { datasetRepository } from '../repositories/DatasetRepository';
import { documentRepository } from '../repositories/DocumentRepository';
import { versionRepository } from '../repositories/VersionRepository';
import { datasetAssessmentRepository } from '../repositories/DatasetAssessmentRepository';
import { DatasetModel } from '../models/Dataset';
import { CombinedDatasetModel } from '../models/CombinedDataset';
import { combinedDatasetRepository } from '../repositories/CombinedDatasetRepository';
import { processingArtifactRepository } from '../repositories/ProcessingArtifactRepository';
import { datasetMergeService } from '../services/DatasetMergeService';
import { datasetLoaderService } from '../services/DatasetLoaderService';
import { dataCleaningService } from '../services/DataCleaningService';
import { dashboardRepository } from '../repositories/DashboardRepository';
import * as XLSX from 'xlsx';
import { sendSuccess } from '../utils/response';
import { ValidationError, NotFoundError } from '../utils/errors';

export const getDatasetFreshness = async (dataset: any): Promise<{ freshnessStatus: string; reason?: string }> => {
  let activeVersionId: any = dataset._id;
  let doc: any = null;
  const isCombined = dataset.isCombined || dataset.sourceDatasetIds !== undefined;

  if (!isCombined) {
    doc = dataset.documentId ? await documentRepository.findById(dataset.documentId._id || dataset.documentId) : null;
    if (doc) {
      const versions = await versionRepository.findByDocumentId(doc._id.toString());
      const latestVersionDoc = versions.find((v) => v.version === doc.currentVersion);
      activeVersionId = latestVersionDoc ? latestVersionDoc._id : doc._id;
    }
  }

  // Check if active version has a suitability assessment and if it is blocked
  const activeAssessment = await datasetAssessmentRepository.findByDatasetIdAndVersion(dataset._id, activeVersionId);
  if (activeAssessment && activeAssessment.analyticsReadinessScore < 50) {
    return { freshnessStatus: 'blocked', reason: 'The active version of this dataset is classified as Not Suitable for Business Analytics.' };
  }

  // For combined datasets, propagate block state if any parent is blocked
  if (isCombined) {
    const sourceIds = dataset.sourceDatasetIds || [];
    for (const sourceId of sourceIds) {
      const ds = await datasetRepository.findById(sourceId);
      if (ds) {
        const subFresh = await getDatasetFreshness(ds);
        if (subFresh.freshnessStatus === 'blocked') {
          return { freshnessStatus: 'blocked', reason: `Consolidated source dataset "${ds.datasetName}" is blocked.` };
        }
      }
    }
  }

  if (dataset.processingStatus === 'failed' || dataset.ingestionStatus === 'failed') {
    return { freshnessStatus: 'blocked', reason: 'Ingestion pipeline execution failed.' };
  }

  if (
    dataset.processingStatus === 'pending' ||
    dataset.processingStatus === 'Combined Dataset Created' ||
    dataset.processingStatus === 'Ingestion Running' ||
    dataset.ingestionStatus === 'pending' ||
    dataset.ingestionStatus === 'running'
  ) {
    return { freshnessStatus: 'regeneration_required', reason: 'Ingestion pipeline is pending or running.' };
  }

  if (!activeAssessment) {
    return { freshnessStatus: 'regeneration_required', reason: 'No suitability assessment found. Please run the Ingestion Pipeline.' };
  }

  if (isCombined) {
    const savedVersions = dataset.sourceDatasetVersions || [];
    if (savedVersions.length > 0) {
      for (const saved of savedVersions) {
        const parentDs = await datasetRepository.findById(saved.datasetId);
        if (!parentDs) {
          return {
            freshnessStatus: 'regeneration_required',
            reason: `Source dataset reference was deleted or unlinked.`
          };
        }
        if (parentDs.currentVersion !== saved.version) {
          return {
            freshnessStatus: 'regeneration_required',
            reason: `Source dataset "${parentDs.datasetName}" has been updated from v${saved.version} to v${parentDs.currentVersion}.`
          };
        }
        const parentFresh = await getDatasetFreshness(parentDs);
        if (parentFresh.freshnessStatus === 'regeneration_required') {
          return {
            freshnessStatus: 'regeneration_required',
            reason: `Source dataset "${parentDs.datasetName}" requires regeneration.`
          };
        }
      }
    }
    return { freshnessStatus: 'up_to_date' };
  }

  if (doc) {
    const versionRecord = await versionRepository.findById(activeAssessment.documentVersionId);
    if (!versionRecord || versionRecord.version !== doc.currentVersion) {
      return {
        freshnessStatus: 'regeneration_required',
        reason: 'Active version mismatch. Reprocessing required.'
      };
    }
  }

  return { freshnessStatus: 'up_to_date' };
};

export const listDatasets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }

    const { page = '1', limit = '10', search } = req.query;

    const query: Record<string, any> = {
      userId: req.user.userId,
    };

    if (search) {
      query.datasetName = { $regex: search, $options: 'i' };
    }

    const skipValue = (parseInt(String(page), 10) - 1) * parseInt(String(limit), 10);
    const limitValue = parseInt(String(limit), 10);

    const [datasetResult, combinedResult] = await Promise.all([
      datasetRepository.find(query, { createdAt: -1 }, 0, 100),
      combinedDatasetRepository.find(query, { createdAt: -1 }, 0, 100)
    ]);

    const allItems = [
      ...datasetResult.items.map(item => {
        const obj = item.toObject();
        obj.isCombined = false;
        return obj;
      }),
      ...combinedResult.items.map(item => {
        const obj = item.toObject();
        obj.isCombined = true;
        return obj;
      })
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = datasetResult.total + combinedResult.total;
    const paginatedItems = allItems.slice(skipValue, skipValue + limitValue);

    const datasetsWithFreshness = await Promise.all(
      paginatedItems.map(async (ds: any) => {
        const fresh = await getDatasetFreshness(ds);
        ds.freshnessStatus = fresh.freshnessStatus;
        ds.freshnessReason = fresh.reason;
        return ds;
      })
    );

    return sendSuccess(res, 'Datasets retrieved successfully.', {
      datasets: datasetsWithFreshness,
      pagination: {
        page: parseInt(String(page), 10),
        limit: limitValue,
        total: total,
        pages: Math.ceil(total / limitValue),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getDatasetDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }

    const { id } = req.params;
    let dataset: any = await datasetRepository.findById(id);

    if (!dataset) {
      dataset = await combinedDatasetRepository.findById(id);
    }

    if (!dataset || dataset.userId !== req.user.userId) {
      throw new NotFoundError('Dataset not found.');
    }

    const freshness = await getDatasetFreshness(dataset);
    const datasetObj = dataset.toObject();
    datasetObj.freshnessStatus = freshness.freshnessStatus;
    datasetObj.freshnessReason = freshness.reason;
    datasetObj.isCombined = dataset.sourceDatasetIds !== undefined;

    return sendSuccess(res, 'Dataset details retrieved successfully.', datasetObj);
  } catch (err) {
    next(err);
  }
};

export const deleteDataset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }

    const { id } = req.params;
    let deleted = await datasetRepository.delete(id);
    if (!deleted) {
      deleted = await combinedDatasetRepository.delete(id);
    }

    return sendSuccess(res, 'Dataset logical reference removed successfully.');
  } catch (err) {
    next(err);
  }
};

function extractId(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  if (str.includes('_id')) {
    const match = str.match(/ObjectId\(['"]([a-f0-9]{24})['"]\)/i) || 
                  str.match(/_id:\s*['"]?([a-f0-9]{24})['"]?/i) ||
                  str.match(/['"]?_id['"]?:\s*['"]?([a-f0-9]{24})['"]?/i);
    if (match && match[1]) {
      return match[1];
    }
  }
  try {
    const parsed = JSON.parse(str);
    if (parsed && parsed._id) return String(parsed._id);
    if (parsed && parsed.id) return String(parsed.id);
  } catch (e) {}
  return str;
}

export const previewCombineDatasets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    const { datasetIds } = req.body;
    if (!datasetIds || !Array.isArray(datasetIds)) {
      throw new ValidationError('datasetIds list parameter is required.');
    }

    const normalizedIds = datasetIds.map(id => extractId(id));

    const preview = await datasetMergeService.detectRelationships(normalizedIds, req.user.userId);
    return sendSuccess(res, 'Combined dataset preview analyzed.', preview);
  } catch (err) {
    next(err);
  }
};

export const combineDatasets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    const { datasetIds, datasetName, dashboardName, dashboardCategory } = req.body;
    if (!datasetIds || !Array.isArray(datasetIds) || !datasetName) {
      throw new ValidationError('datasetIds list and datasetName parameter are required.');
    }

    const normalizedIds = datasetIds.map(id => extractId(id));

    const preview = await datasetMergeService.detectRelationships(normalizedIds, req.user.userId);
    if (!preview.valid) {
      throw new ValidationError(`Cannot combine datasets: ${preview.validationErrors.join(', ')}`);
    }

    // Load active versions of source datasets
    const sourceDatasets = await Promise.all(
      normalizedIds.map(async (id) => {
        const ds = await datasetRepository.findById(id);
        return {
          datasetId: id,
          version: ds?.currentVersion || 1,
        };
      })
    );

    const dashName = (dashboardName || '').trim() || 'Combined Business Dashboard';
    const dashCat = (dashboardCategory || '').trim() || 'General';

    const combinedDataset = await CombinedDatasetModel.create({
      userId: req.user.userId,
      datasetName,
      dashboardName: dashName,
      dashboardCategory: dashCat,
      sourceDatasetIds: normalizedIds,
      sourceDatasetVersions: sourceDatasets,
      relationshipMap: {
        relationships: preview.relationships,
        qualityScore: preview.relationships.reduce((acc, r) => acc + r.qualityScore, 0) / (preview.relationships.length || 1),
      },
      processingStatus: 'Combined Dataset Created',
      ingestionStatus: 'pending',
    });

    const dash = await dashboardRepository.create({
      userId: req.user.userId,
      datasetId: combinedDataset._id,
      datasetModel: 'CombinedDataset',
      dashboardName: dashName,
      dashboardCategory: dashCat,
      currentVersion: 1,
      layout: { columns: 12 },
    });

    combinedDataset.dashboardId = dash._id as any;
    await combinedDataset.save();

    return sendSuccess(res, 'Combined logical dataset created successfully.', combinedDataset);
  } catch (err) {
    next(err);
  }
};

export const checkDatasetDependencies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    const { id } = req.params;
    const dependents = await DatasetModel.find({
      isCombined: true,
      'sourceDatasets.datasetId': id,
    });
    return sendSuccess(res, 'Dependencies retrieved.', dependents);
  } catch (err) {
    next(err);
  }
};

export const loadAndMergeDatasetRows = async (dataset: any, userId: string): Promise<any[]> => {
  const isCombined = dataset.sourceDatasetIds !== undefined || dataset.isCombined;
  
  if (isCombined) {
    // 1. Fetch latest ProcessingArtifact
    const artifact = await processingArtifactRepository.findLatestByCombinedDatasetId(dataset._id);
    if (artifact && artifact.cleanedDatasetReference) {
      const loadRes = await datasetLoaderService.loadDatasetByFileId(artifact.cleanedDatasetReference);
      return loadRes.rows;
    }

    // Fallback: If no artifact is found, run the join (e.g. preview mode or first run)
    const datasetsData: Array<{ datasetId: string; rows: any[] }> = [];
    const sourceIds = dataset.sourceDatasetIds || dataset.sourceDatasets?.map((s: any) => s.datasetId) || [];

    for (const sourceId of sourceIds) {
      const ds = await datasetRepository.findById(sourceId);
      if (!ds) continue;

      if (!ds.documentId) continue;
      const docItem = await documentRepository.findById(ds.documentId._id || ds.documentId);
      if (!docItem) continue;

      const loadRes = await datasetLoaderService.loadDataset(docItem._id.toString(), userId, docItem.currentVersion);
      const cleanRes = await dataCleaningService.cleanData(loadRes.rows);
      datasetsData.push({
        datasetId: ds._id.toString(),
        rows: cleanRes.cleanedRows,
      });
    }

    const relations = dataset.relationshipMap?.relationships || dataset.combinedRelationships?.relationships || [];
    const strategy = dataset.relationshipMap?.mergeStrategy || dataset.combinedRelationships?.mergeStrategy || 'inner';
    return datasetMergeService.mergeRowArrays(datasetsData, relations, strategy);
  } else {
    if (!dataset.documentId) {
      throw new ValidationError('Dataset is not linked to any source document.');
    }
    const doc = await documentRepository.findById(dataset.documentId._id || dataset.documentId);
    if (!doc) {
      throw new NotFoundError('Linked document not found.');
    }

    const loadRes = await datasetLoaderService.loadDataset(doc._id.toString(), userId, doc.currentVersion);
    const cleanRes = await dataCleaningService.cleanData(loadRes.rows);
    return cleanRes.cleanedRows;
  }
};

export const getDatasetPreview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    const { id } = req.params;
    let dataset: any = await datasetRepository.findById(id);
    if (!dataset) {
      dataset = await combinedDatasetRepository.findById(id);
    }
    if (!dataset) {
      throw new NotFoundError('Dataset not found.');
    }

    const rows = await loadAndMergeDatasetRows(dataset, req.user.userId);
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

    return sendSuccess(res, 'Dataset preview loaded.', {
      headers,
      rows: rows.slice(0, 100), // limit preview to 100 rows for performance
      totalRows: rows.length
    });
  } catch (err) {
    next(err);
  }
};

export const exportDatasetCSV = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    const { id } = req.params;
    let dataset: any = await datasetRepository.findById(id);
    if (!dataset) {
      dataset = await combinedDatasetRepository.findById(id);
    }
    if (!dataset) {
      throw new NotFoundError('Dataset not found.');
    }

    const rows = await loadAndMergeDatasetRows(dataset, req.user.userId);
    const dashboard = await dashboardRepository.findOne({ datasetId: dataset._id, userId: req.user.userId });
    
    const sourceNamesList: string[] = [];
    if (dataset.isCombined) {
      for (const item of dataset.sourceDatasets || []) {
        const ds = await datasetRepository.findById(item.datasetId);
        if (ds) sourceNamesList.push(`${ds.datasetName} (v${item.version})`);
      }
    } else {
      sourceNamesList.push(dataset.datasetName);
    }

    const metaRows = [
      `# Metadata:`,
      `# Combined Dataset Name: ${dataset.datasetName}`,
      `# Dashboard Name: ${dashboard?.dashboardName || 'N/A'}`,
      `# Dashboard Category: ${dashboard?.dashboardCategory || 'General'}`,
      `# Dataset Version: ${dataset.currentVersion || 1}`,
      `# Source Datasets: ${sourceNamesList.join(' | ')}`,
      `# Exported At: ${new Date().toISOString()}`,
      `#`
    ].join('\n');

    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const csvHeaders = headers.join(',');
    const csvRows = rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')).join('\n');
    const finalCSV = metaRows + '\n' + csvHeaders + '\n' + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${dataset.datasetName.replace(/\s+/g, '_')}_export.csv"`);
    return res.send(finalCSV);
  } catch (err) {
    next(err);
  }
};

export const exportDatasetExcel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    const { id } = req.params;
    let dataset: any = await datasetRepository.findById(id);
    if (!dataset) {
      dataset = await combinedDatasetRepository.findById(id);
    }
    if (!dataset) {
      throw new NotFoundError('Dataset not found.');
    }

    const rows = await loadAndMergeDatasetRows(dataset, req.user.userId);
    const dashboard = await dashboardRepository.findOne({ datasetId: dataset._id, userId: req.user.userId });

    const sourceNamesList: string[] = [];
    if (dataset.isCombined) {
      for (const item of dataset.sourceDatasets || []) {
        const ds = await datasetRepository.findById(item.datasetId);
        if (ds) sourceNamesList.push(`${ds.datasetName} (v${item.version})`);
      }
    } else {
      sourceNamesList.push(dataset.datasetName);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Merged Data");

    const metaData = [
      { Property: "Export Date & Time", Value: new Date().toISOString() },
      { Property: "Combined Dataset Name", Value: dataset.datasetName },
      { Property: "Dashboard Name", Value: dashboard?.dashboardName || 'N/A' },
      { Property: "Dashboard Category", Value: dashboard?.dashboardCategory || 'General' },
      { Property: "Dataset Version", Value: dataset.currentVersion || 1 },
      { Property: "Source Datasets", Value: sourceNamesList.join(', ') }
    ];
    const wsMeta = XLSX.utils.json_to_sheet(metaData);
    XLSX.utils.book_append_sheet(wb, wsMeta, "Metadata Info");

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${dataset.datasetName.replace(/\s+/g, '_')}_export.xlsx"`);
    return res.send(buf);
  } catch (err) {
    next(err);
  }
};
