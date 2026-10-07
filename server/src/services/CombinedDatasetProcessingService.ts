import { datasetRepository } from '../repositories/DatasetRepository';
import { documentRepository } from '../repositories/DocumentRepository';
import { datasetLoaderService } from './DatasetLoaderService';
import { dataCleaningService } from './DataCleaningService';
import { datasetMergeService } from './DatasetMergeService';
import { gridFSProvider } from '../providers/GridFSProvider';
import { combinedDatasetRepository } from '../repositories/CombinedDatasetRepository';
import { ICombinedDataset } from '../models/CombinedDataset';
import { Types } from 'mongoose';
import { normalizeObjectId } from '../utils/objectId';
import * as xlsx from 'xlsx';

export class CombinedDatasetProcessingService {
  /**
   * Loads all dependency datasets, runs joins, cleans rows, and uploads the merged dataset to GridFS.
   */
  async processAndStoreCombinedDataset(
    combinedDataset: ICombinedDataset,
    userId: string
  ): Promise<{
    mergedRows: any[];
    cleanedRows: any[];
    mergedFileId: string;
    cleanedFileId: string;
  }> {
    const datasetsData: Array<{ datasetId: string; rows: any[] }> = [];
    const sourceDatasetVersions: Array<{ datasetId: any; version: number }> = [];

    // 1. Load raw rows for each source dataset
    for (const sourceItem of combinedDataset.sourceDatasetIds) {
      const cleanSourceId = normalizeObjectId(sourceItem, 'sourceDatasetId');
      const ds = await datasetRepository.findById(cleanSourceId);
      if (!ds) continue;

      sourceDatasetVersions.push({
        datasetId: ds._id as any,
        version: ds.currentVersion || 1
      });

      if (!ds.documentId) continue;
      const docItem = await documentRepository.findById(ds.documentId._id || ds.documentId);
      if (!docItem) continue;

      // Load active version
      const loadRes = await datasetLoaderService.loadDataset(
        docItem._id.toString(),
        userId,
        ds.currentVersion || docItem.currentVersion
      );
      
      // Clean each individual dataset's rows before joining
      const cleanRes = await dataCleaningService.cleanData(loadRes.rows);
      datasetsData.push({
        datasetId: ds._id.toString(),
        rows: cleanRes.cleanedRows,
      });
    }

    // 2. Perform joins across loaded datasetsData
    const relations = combinedDataset.relationshipMap?.relationships || [];
    const strategy = combinedDataset.relationshipMap?.mergeStrategy || 'inner';

    const mergedRows = datasetMergeService.mergeRowArrays(datasetsData, relations, strategy);

    // 3. Clean and normalize the overall combined dataset
    const mergedCleanRes = await dataCleaningService.cleanData(mergedRows);
    const cleanedRows = mergedCleanRes.cleanedRows;

    // 4. Save merged and cleaned datasets into GridFS
    const mergedBuffer = this.rowsToCSVBuffer(mergedRows);
    const cleanedBuffer = this.rowsToCSVBuffer(cleanedRows);

    const mergedUpload = await gridFSProvider.upload(
      mergedBuffer,
      `merged_${combinedDataset._id}.csv`,
      'text/csv'
    );

    const cleanedUpload = await gridFSProvider.upload(
      cleanedBuffer,
      `cleaned_${combinedDataset._id}.csv`,
      'text/csv'
    );

    // 5. Update CombinedDataset properties
    combinedDataset.mergedDatasetReference = mergedUpload.fileId;
    combinedDataset.mergedRowCount = cleanedRows.length;
    combinedDataset.mergedColumnCount = cleanedRows.length > 0 ? Object.keys(cleanedRows[0]).length : 0;
    combinedDataset.sourceDatasetVersions = sourceDatasetVersions;
    await combinedDataset.save();

    return {
      mergedRows,
      cleanedRows,
      mergedFileId: mergedUpload.fileId,
      cleanedFileId: cleanedUpload.fileId,
    };
  }

  private rowsToCSVBuffer(rows: any[]): Buffer {
    if (rows.length === 0) {
      return Buffer.from('');
    }
    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Data');
    return xlsx.write(workbook, { type: 'buffer', bookType: 'csv' });
  }
}

export const combinedDatasetProcessingService = new CombinedDatasetProcessingService();
export default combinedDatasetProcessingService;
