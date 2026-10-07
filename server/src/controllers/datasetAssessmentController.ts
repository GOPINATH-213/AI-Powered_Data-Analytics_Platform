import { Request, Response, NextFunction } from 'express';
import { datasetAssessmentRepository } from '../repositories/DatasetAssessmentRepository';
import { datasetRepository } from '../repositories/DatasetRepository';
import { combinedDatasetRepository } from '../repositories/CombinedDatasetRepository';
import { documentRepository } from '../repositories/DocumentRepository';
import { versionRepository } from '../repositories/VersionRepository';
import { analyticsService } from '../services/AnalyticsService';
import { datasetIntelligenceService } from '../services/DatasetIntelligenceService';
import { datasetLoaderService } from '../services/DatasetLoaderService';
import { dataCleaningService } from '../services/DataCleaningService';
import { datasetMergeService } from '../services/DatasetMergeService';
import { sendSuccess } from '../utils/response';
import { ValidationError, NotFoundError } from '../utils/errors';
import { Types } from 'mongoose';

export const getAssessment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    const { datasetId } = req.params;
    
    // Find latest assessment
    const assessment = await datasetAssessmentRepository.findLatestByDatasetId(datasetId);
    if (!assessment) {
      throw new NotFoundError('No assessment report found for this dataset.');
    }
    
    return sendSuccess(res, 'Dataset assessment loaded.', assessment);
  } catch (err) {
    next(err);
  }
};

export const recalculateAssessment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    const { datasetId } = req.body;
    if (!datasetId) {
      throw new ValidationError('Dataset ID is required.');
    }

    let dataset = await datasetRepository.findById(datasetId);
    let combinedDataset = null;
    if (!dataset) {
      combinedDataset = await combinedDatasetRepository.findById(datasetId);
    }
    const currentDataset = dataset || combinedDataset;
    if (!currentDataset) {
      throw new NotFoundError('Dataset not found.');
    }

    if (combinedDataset) {
      // Process using analyticsService pipeline which generates the assessment and processing artifact
      const result = await analyticsService.processDataset(datasetId, req.user.userId);
      const updated = await datasetAssessmentRepository.findLatestByDatasetId(datasetId);
      return sendSuccess(res, 'Dataset assessment recalculated successfully.', updated);
    }

    const datasetNonNull = dataset!;
    let originalFilename = '';
    let cleanedRows: any[] = [];
    let versionId: any = datasetId;

    if (datasetNonNull.isCombined) {
      const datasetsData: Array<{ datasetId: string; rows: any[] }> = [];
      const sourceDsList = datasetNonNull.sourceDatasets || [];

      for (const item of sourceDsList) {
        const ds = await datasetRepository.findById(item.datasetId);
        if (ds) {
          if (!ds.documentId) continue;
          const docItem = await documentRepository.findById(ds.documentId._id || ds.documentId);
          if (!docItem) continue;

          const loadRes = await datasetLoaderService.loadDataset(docItem._id.toString(), req.user.userId);
          const cleanRes = await dataCleaningService.cleanData(loadRes.rows);
          datasetsData.push({
            datasetId: ds._id.toString(),
            rows: cleanRes.cleanedRows,
          });
        }
      }

      const relations = datasetNonNull.combinedRelationships?.relationships || [];
      const strategy = datasetNonNull.combinedRelationships?.mergeStrategy || 'inner';

      cleanedRows = datasetMergeService.mergeRowArrays(datasetsData, relations, strategy);
      originalFilename = `Combined Dataset (${datasetsData.map((d) => d.datasetId).join(', ')})`;
    } else {
      if (!datasetNonNull.documentId) {
        throw new ValidationError('Dataset is not linked to any source document.');
      }
      const doc = await documentRepository.findById(datasetNonNull.documentId._id || datasetNonNull.documentId);
      if (!doc) {
        throw new NotFoundError('Linked document not found.');
      }

      const loadRes = await datasetLoaderService.loadDataset(doc._id.toString(), req.user.userId);
      const cleanRes = await dataCleaningService.cleanData(loadRes.rows);
      cleanedRows = cleanRes.cleanedRows;
      originalFilename = loadRes.originalFilename;

      const versions = await versionRepository.findByDocumentId(doc._id.toString());
      const latestVersionDoc = versions.find((v) => v.version === doc.currentVersion);
      versionId = latestVersionDoc ? latestVersionDoc._id : doc._id;
    }

    const assessment = datasetIntelligenceService.assessDataset(
      originalFilename,
      cleanedRows,
      cleanedRows.length > 0 ? Object.keys(cleanedRows[0]) : []
    );

    let combinedReadinessScore = assessment.analyticsReadinessScore;
    let combinedQualityScore = assessment.qualityScore;
    let contributions: any[] = [];

    if (datasetNonNull.isCombined) {
      const sourceDsList = datasetNonNull.sourceDatasets || [];
      let totalReadiness = 0;
      let totalQuality = 0;

      for (const item of sourceDsList) {
        const ds = await datasetRepository.findById(item.datasetId);
        if (ds) {
          let activeVersionId: any = ds._id;
          if (!ds.isCombined && ds.documentId) {
            const docItem = await documentRepository.findById(ds.documentId._id || ds.documentId);
            if (docItem) {
              const versions = await versionRepository.findByDocumentId(docItem._id.toString());
              const latestVersionDoc = versions.find((v) => v.version === docItem.currentVersion);
              activeVersionId = latestVersionDoc ? latestVersionDoc._id : docItem._id;
            }
          }

          const dsAss = await datasetAssessmentRepository.findByDatasetIdAndVersion(ds._id, activeVersionId);
          const rScore = dsAss ? dsAss.analyticsReadinessScore : 50;
          const qScore = dsAss ? dsAss.qualityScore : 50;

          totalReadiness += rScore;
          totalQuality += qScore;

          contributions.push({
            datasetId: ds._id.toString(),
            datasetName: ds.datasetName,
            readinessScore: rScore,
            qualityScore: qScore,
            contributionPercentage: Math.round(100 / sourceDsList.length),
            relationshipStatus: 'Joined'
          });
        }
      }

      if (sourceDsList.length > 0) {
        combinedReadinessScore = Math.round(totalReadiness / sourceDsList.length);
        combinedQualityScore = Math.round(totalQuality / sourceDsList.length);
      }
    }

    // Save
    let updated;
    const existing = await datasetAssessmentRepository.findByDatasetIdAndVersion(datasetId, versionId);
    
    const savePayload = {
      documentType: datasetNonNull.isCombined ? 'Combined Dataset' : assessment.documentType,
      datasetCategory: (combinedReadinessScore >= 50 ? 'Business Analytics' : 'Not Suitable') as any,
      analyticsReadinessScore: combinedReadinessScore,
      classificationConfidence: datasetNonNull.isCombined ? 95 : assessment.classificationConfidence,
      qualityScore: combinedQualityScore,
      scoreBreakdown: assessment.scoreBreakdown,
      businessDomain: assessment.businessDomain,
      detectedEntities: assessment.detectedEntities,
      strengths: assessment.strengths,
      weaknesses: assessment.weaknesses,
      recommendations: assessment.recommendations,
      aiMetadata: assessment.aiMetadata,
      assessmentLogs: assessment.assessmentLogs,
      isCombined: datasetNonNull.isCombined || false,
      sourceDatasetContributions: contributions,
      relationshipDetectionResults: datasetNonNull.isCombined ? datasetNonNull.combinedRelationships : {},
    };

    if (existing) {
      updated = await datasetAssessmentRepository.update(existing._id, savePayload);
    } else {
      updated = await datasetAssessmentRepository.create({
        datasetId: datasetNonNull._id as Types.ObjectId,
        documentVersionId: versionId as Types.ObjectId,
        ...savePayload,
      });
    }

    return sendSuccess(res, 'Dataset assessment recalculated successfully.', updated);
  } catch (err) {
    next(err);
  }
};

export const getAssessmentReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    const { datasetId } = req.params;
    const assessment = await datasetAssessmentRepository.findLatestByDatasetId(datasetId);
    if (!assessment) {
      throw new NotFoundError('No assessment report found for this dataset.');
    }

    // Generate plain-text/JSON formatted quality report
    const reportText = `
DATASET ANALYTICS READINESS REPORT
==================================
Document Type: ${assessment.documentType}
Category:      ${assessment.datasetCategory}
Domain:        ${assessment.businessDomain}
Readiness Score: ${assessment.analyticsReadinessScore}/100
Classification Confidence: ${assessment.classificationConfidence}%
Quality Score:   ${assessment.qualityScore}/100

STRENGTHS:
${assessment.strengths.map(s => `  * ${s}`).join('\n')}

WEAKNESSES:
${assessment.weaknesses.map(w => `  * ${w}`).join('\n')}

RECOMMENDATIONS:
${assessment.recommendations.map(r => `  * ${r}`).join('\n')}

AI METADATA:
  * Suggested Dashboard: ${assessment.aiMetadata.suggestedDashboardType}
  * Suggested KPIs:      ${assessment.aiMetadata.suggestedKPIs.join(', ')}
  * Forecast Targets:    ${assessment.aiMetadata.potentialForecastTargets.join(', ')}
    `;

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="Suitability_Report_${datasetId}.txt"`);
    return res.send(reportText);
  } catch (err) {
    next(err);
  }
};

export const getAssessmentHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    const { datasetId } = req.params;
    const history = await datasetAssessmentRepository.findHistoryByDatasetId(datasetId);
    return sendSuccess(res, 'Dataset assessment history loaded.', history);
  } catch (err) {
    next(err);
  }
};
