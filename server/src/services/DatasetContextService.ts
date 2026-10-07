import { Types } from 'mongoose';
import { datasetRepository } from '../repositories/DatasetRepository';
import { combinedDatasetRepository } from '../repositories/CombinedDatasetRepository';
import { datasetMetadataRepository } from '../repositories/DatasetMetadataRepository';
import { datasetAssessmentRepository } from '../repositories/DatasetAssessmentRepository';
import { ValidationError, NotFoundError } from '../utils/errors';

export interface DatasetContext {
  datasetId: string;
  datasetName: string;
  datasetType: 'single' | 'combined';
  isCombined: boolean;
  currentVersion: number;
  freshnessStatus: string;
  processingStatus: string;
  canonicalDatasetReference?: string;
  columns: string[];
  columnTypes: Record<string, string>;
  businessDomain: string;
  detectedEntities: string[];
  suggestedKPIs: string[];
  existingMetrics: string[];
  existingCharts: string[];
  readinessScore: number;
  qualityScore: number;
  relationshipMap: Record<string, any>;
}

export class DatasetContextService {
  async getDatasetContext(id: string, userId: string): Promise<DatasetContext> {
    // 1. Resolve dataset type and load model
    let dataset: any = await datasetRepository.findById(id);
    let isCombined = false;

    if (!dataset) {
      dataset = await combinedDatasetRepository.findById(id);
      if (dataset) isCombined = true;
    }

    if (!dataset) {
      throw new NotFoundError('Dataset reference not found.');
    }

    if (dataset.userId !== userId) {
      throw new ValidationError('Unauthorized dataset access.');
    }

    // 2. Fetch associated metadata and assessment details
    const metadata = await datasetMetadataRepository.findLatestByDatasetId(id);
    const assessment = await datasetAssessmentRepository.findLatestByDatasetId(id);

    // 3. Extract columns and their basic inferred types
    const columns: string[] = [];
    const columnTypes: Record<string, string> = {};

    if (metadata && metadata.detectedColumns) {
      metadata.detectedColumns.forEach((col: any) => {
        columns.push(col.name);
        columnTypes[col.name] = col.type || 'string';
      });
    }

    // Determine canonical dataset reference
    let canonicalRef = '';
    if (isCombined) {
      canonicalRef = dataset.mergedDatasetReference || '';
    } else {
      canonicalRef = dataset.documentId?.toString() || '';
    }

    // Compile dynamic suggested KPIs and insights from assessment
    const suggestedKPIs = assessment?.aiMetadata?.suggestedKPIs || [];
    const existingCharts = assessment?.aiMetadata?.suggestedVisualizations?.map((v: any) => v.chartType) || [];
    const existingMetrics = assessment?.aiMetadata?.suggestedVisualizations?.map((v: any) => v.metric) || [];

    return {
      datasetId: dataset._id.toString(),
      datasetName: dataset.datasetName,
      datasetType: isCombined ? 'combined' : 'single',
      isCombined,
      currentVersion: dataset.currentVersion || 1,
      freshnessStatus: (dataset as any).freshnessStatus || 'up_to_date',
      processingStatus: dataset.processingStatus,
      canonicalDatasetReference: canonicalRef,
      columns,
      columnTypes,
      businessDomain: assessment?.businessDomain || 'Generic Analytics',
      detectedEntities: assessment?.detectedEntities || [],
      suggestedKPIs,
      existingMetrics,
      existingCharts,
      readinessScore: assessment?.analyticsReadinessScore || 0,
      qualityScore: assessment?.qualityScore || 0,
      relationshipMap: isCombined ? (dataset.relationshipMap || {}) : {},
    };
  }
}

export const datasetContextService = new DatasetContextService();
export default datasetContextService;