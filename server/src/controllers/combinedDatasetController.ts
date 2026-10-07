import { Request, Response, NextFunction } from 'express';
import { combinedDatasetRepository } from '../repositories/CombinedDatasetRepository';
import { processingArtifactRepository } from '../repositories/ProcessingArtifactRepository';
import { datasetRepository } from '../repositories/DatasetRepository';
import { getDatasetFreshness } from './datasetController';
import { datasetLoaderService } from '../services/DatasetLoaderService';
import { ValidationError, NotFoundError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { reportExportService } from '../services/ReportExportService';
import * as XLSX from 'xlsx';

export const exportCombinedDatasetCSV = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    const { id } = req.params;
    const { exportFileName } = req.query;

    const dataset = await combinedDatasetRepository.findById(id);
    if (!dataset) {
      throw new NotFoundError('Combined dataset not found.');
    }

    const freshness = await getDatasetFreshness(dataset);
    if (freshness.freshnessStatus !== 'up_to_date' || dataset.processingStatus !== 'Completed') {
      throw new ValidationError('Combined dataset is outdated or has pending changes. Please rerun the ingestion pipeline before exporting.');
    }

    const artifact = await processingArtifactRepository.findLatestByCombinedDatasetId(dataset._id);
    if (!artifact || !artifact.cleanedDatasetReference) {
      throw new NotFoundError('Canonical processing artifact not found. Please run the ingestion pipeline first.');
    }

    const loadRes = await datasetLoaderService.loadDatasetByFileId(artifact.cleanedDatasetReference);
    const rows = loadRes.rows;

    const sourceNamesList: string[] = [];
    for (const sourceId of dataset.sourceDatasetIds || []) {
      const ds = await datasetRepository.findById(sourceId.toString());
      if (ds) sourceNamesList.push(`${ds.datasetName} (v${ds.currentVersion || 1})`);
    }

    const metaRows = [
      `# Metadata:`,
      `# Combined Dataset Name: ${dataset.datasetName}`,
      `# Dashboard Name: ${dataset.dashboardName || 'N/A'}`,
      `# Dashboard Category: ${dataset.dashboardCategory || 'General'}`,
      `# Source Datasets: ${sourceNamesList.join(' | ')}`,
      `# Exported At: ${new Date().toISOString()}`,
      `#`
    ].join('\n');

    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const csvHeaders = headers.join(',');
    const csvRows = rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')).join('\n');
    const finalCSV = metaRows + '\n' + csvHeaders + '\n' + csvRows;

    let filename = (exportFileName as string || '').trim().replace(/\s+/g, '_');
    if (!filename) {
      const d = new Date();
      filename = `Combined_Dataset_${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, '0')}_${String(d.getDate()).padStart(2, '0')}`;
    }
    if (!filename.toLowerCase().endsWith('.csv')) {
      filename += '.csv';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(finalCSV);
  } catch (err) {
    next(err);
  }
};

export const exportCombinedDatasetExcel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    const { id } = req.params;
    const { exportFileName } = req.query;

    const dataset = await combinedDatasetRepository.findById(id);
    if (!dataset) {
      throw new NotFoundError('Combined dataset not found.');
    }

    const freshness = await getDatasetFreshness(dataset);
    if (freshness.freshnessStatus !== 'up_to_date' || dataset.processingStatus !== 'Completed') {
      throw new ValidationError('Combined dataset is outdated or has pending changes. Please rerun the ingestion pipeline before exporting.');
    }

    const artifact = await processingArtifactRepository.findLatestByCombinedDatasetId(dataset._id);
    if (!artifact || !artifact.cleanedDatasetReference) {
      throw new NotFoundError('Canonical processing artifact not found. Please run the ingestion pipeline first.');
    }

    const loadRes = await datasetLoaderService.loadDatasetByFileId(artifact.cleanedDatasetReference);
    const rows = loadRes.rows;

    const sourceNamesList: string[] = [];
    for (const sourceId of dataset.sourceDatasetIds || []) {
      const ds = await datasetRepository.findById(sourceId.toString());
      if (ds) sourceNamesList.push(`${ds.datasetName} (v${ds.currentVersion || 1})`);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Merged Data");

    const metaData = [
      { Property: "Export Date & Time", Value: new Date().toISOString() },
      { Property: "Combined Dataset Name", Value: dataset.datasetName },
      { Property: "Dashboard Name", Value: dataset.dashboardName || 'N/A' },
      { Property: "Dashboard Category", Value: dataset.dashboardCategory || 'General' },
      { Property: "Source Datasets", Value: sourceNamesList.join(', ') }
    ];
    const wsMeta = XLSX.utils.json_to_sheet(metaData);
    XLSX.utils.book_append_sheet(wb, wsMeta, "Metadata Info");

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    let filename = (exportFileName as string || '').trim().replace(/\s+/g, '_');
    if (!filename) {
      const d = new Date();
      filename = `Combined_Dataset_${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, '0')}_${String(d.getDate()).padStart(2, '0')}`;
    }
    if (!filename.toLowerCase().endsWith('.xlsx')) {
      filename += '.xlsx';
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buf);
  } catch (err) {
    next(err);
  }
};

export const exportCombinedReportCSV = async (req: Request, res: Response, next: NextFunction) => {
  try {
    throw new ValidationError('CSV format is not supported for Analytics Reports. Please download the PDF Report.');
  } catch (err) {
    next(err);
  }
};

export const exportCombinedReportExcel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    throw new ValidationError('Excel format is not supported for Analytics Reports. Please download the PDF Report.');
  } catch (err) {
    next(err);
  }
};

export const renameCombinedDataset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    const { id } = req.params;
    const { datasetName } = req.body;

    if (!datasetName || typeof datasetName !== 'string' || !datasetName.trim()) {
      throw new ValidationError('A non-empty string datasetName is required.');
    }

    const dataset = await combinedDatasetRepository.findById(id);
    if (!dataset) {
      throw new NotFoundError('Combined dataset not found.');
    }

    if (dataset.userId.toString() !== req.user.userId) {
      throw new ValidationError('Access denied: You do not own this combined dataset.');
    }

    dataset.datasetName = datasetName.trim();
    await dataset.save();

    return sendSuccess(res, 'Combined dataset renamed successfully.', dataset);
  } catch (err) {
    next(err);
  }
};

export const exportCombinedReportPDF = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    const { id } = req.params;

    const dataset = await combinedDatasetRepository.findById(id);
    if (!dataset) {
      throw new NotFoundError('Combined dataset not found.');
    }

    // Redirect to frontend page with download=pdf query parameter
    const origin = req.headers.origin || req.headers.referer || 'http://localhost:5173';
    let base = 'http://localhost:5173';
    try {
      const url = new URL(origin as string);
      base = `${url.protocol}//${url.host}`;
    } catch (e) {}

    return res.redirect(`${base}/dataset-assessment/${id}?download=pdf`);
  } catch (err) {
    next(err);
  }
};

export const exportCombinedDashboardPDF = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    const { id } = req.params;

    const dataset = await combinedDatasetRepository.findById(id);
    if (!dataset) {
      throw new NotFoundError('Combined dataset not found.');
    }

    if (!dataset.dashboardId) {
      throw new NotFoundError('Combined dashboard reference not found.');
    }

    // Redirect to frontend page with download=pdf query parameter
    const origin = req.headers.origin || req.headers.referer || 'http://localhost:5173';
    let base = 'http://localhost:5173';
    try {
      const url = new URL(origin as string);
      base = `${url.protocol}//${url.host}`;
    } catch (e) {}

    return res.redirect(`${base}/dashboard/${dataset.dashboardId}?download=pdf`);
  } catch (err) {
    next(err);
  }
};
