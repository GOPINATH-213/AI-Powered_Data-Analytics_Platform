import { datasetRepository } from '../repositories/DatasetRepository';
import { documentRepository } from '../repositories/DocumentRepository';
import { versionRepository } from '../repositories/VersionRepository';
import { processingJobRepository } from '../repositories/ProcessingJobRepository';
import { datasetMetadataRepository } from '../repositories/DatasetMetadataRepository';
import { dashboardRepository } from '../repositories/DashboardRepository';
import { datasetAssessmentRepository } from '../repositories/DatasetAssessmentRepository';
import { combinedDatasetRepository } from '../repositories/CombinedDatasetRepository';
import { processingArtifactRepository } from '../repositories/ProcessingArtifactRepository';
import { combinedDatasetProcessingService } from './CombinedDatasetProcessingService';
import { datasetIntelligenceService } from './DatasetIntelligenceService';
import { datasetLoaderService } from './DatasetLoaderService';
import { dataCleaningService } from './DataCleaningService';
import { schemaDetectionService } from './SchemaDetectionService';
import { relationshipDetectionService } from './RelationshipDetectionService';
import { kpiEngineService } from './KPIEngineService';
import { visualizationRecommendationService } from './VisualizationRecommendationService';
import { dashboardGenerationService } from './DashboardGenerationService';
import { datasetMergeService } from './DatasetMergeService';
import { widgetRepository } from '../repositories/WidgetRepository';
import { dashboardMetricRepository } from '../repositories/DashboardMetricRepository';
import { ValidationError, NotFoundError } from '../utils/errors';
import { Types } from 'mongoose';

export class AnalyticsService {
  /**
   * Orchestrates the entire multi-stage data analytics and KPI pipeline.
   */
  async processDataset(datasetId: string, userId: string): Promise<any> {
    console.log(`[DEBUG LOG] AnalyticsService.processDataset()`);
    console.log(`- Function name: AnalyticsService.processDataset`);
    console.log(`- Parameter type of datasetId: ${typeof datasetId}`);
    console.log(`- Parameter value of datasetId:`, datasetId);

    let dataset = await datasetRepository.findById(datasetId);
    let combinedDataset: any = null;
    if (!dataset) {
      combinedDataset = await combinedDatasetRepository.findById(datasetId);
    }

    if (!dataset && !combinedDataset) {
      throw new NotFoundError('Dataset reference not found.');
    }

    const currentDataset = dataset || combinedDataset;
    console.log(`- Dataset ID: ${currentDataset._id}`);
    console.log(`- Current Version: ${currentDataset.currentVersion || 1}`);
    console.log(`- Processing Status: ${currentDataset.processingStatus}`);
    console.log(`- Processing Stage: Ingestion Starting`);
    if (currentDataset.userId.toString() !== userId) {
      throw new ValidationError('Access denied: You do not own this dataset.');
    }

    // 1. Initialize Processing Job
    const job = await processingJobRepository.create({
      datasetId: currentDataset._id as Types.ObjectId,
      status: 'running',
      progress: 5,
      currentStep: 'Job Started',
      logs: ['Initialized analytics job in database.'],
      startedAt: new Date(),
    });

    const addLog = async (msg: string, progress: number, stepName: string) => {
      job.logs.push(`[${new Date().toISOString()}] ${msg}`);
      job.progress = progress;
      job.currentStep = stepName;
      await job.save();
    };

    try {
      let originalFilename = '';
      let cleanedRows: any[] = [];
      let doc: any = null;

      if (combinedDataset) {
        combinedDataset.processingStatus = 'Ingestion Running';
        combinedDataset.ingestionStatus = 'running';
        await combinedDataset.save();

        await addLog('Loading combined datasets dependencies and relationships...', 15, 'Loading');
        
        // Process merge & store in GridFS canonical references
        const mergeResult = await combinedDatasetProcessingService.processAndStoreCombinedDataset(
          combinedDataset,
          userId
        );

        originalFilename = combinedDataset.datasetName;
        cleanedRows = mergeResult.cleanedRows;
        await addLog(`Merged canonical dataset successfully. Produced ${cleanedRows.length} relational rows.`, 45, 'Merging');
      } else {
        if (!dataset!.documentId) {
          throw new ValidationError('Dataset is not linked to any source document.');
        }
        doc = await documentRepository.findById(dataset!.documentId._id || dataset!.documentId);
        if (!doc) {
          throw new NotFoundError('Linked document file not found.');
        }

        // 2. Load Raw File Data
        await addLog('Loading raw document contents from storage...', 20, 'Loading');
        const loadRes = await datasetLoaderService.loadDataset(doc._id.toString(), userId);
        await addLog(`Successfully parsed file containing ${loadRes.rows.length} raw data rows.`, 30, 'Loading');

        // 3. Clean Data
        await addLog('Executing data cleaning and normalizations rules...', 45, 'Cleaning');
        const cleanRes = await dataCleaningService.cleanData(loadRes.rows);
        for (const log of cleanRes.logs) {
          job.logs.push(`[Cleaning] ${log}`);
        }
        await job.save();

        originalFilename = loadRes.originalFilename;
        cleanedRows = cleanRes.cleanedRows;
      }

      // 3.5. Dataset Intelligence & Analytics Readiness Assessment
      await addLog('Running Dataset Intelligence & Suitability Assessment Engine...', 50, 'Assessment');
      const assessment = datasetIntelligenceService.assessDataset(
        originalFilename,
        cleanedRows,
        cleanedRows.length > 0 ? Object.keys(cleanedRows[0]) : []
      );

      let combinedReadinessScore = assessment.analyticsReadinessScore;
      let combinedQualityScore = assessment.qualityScore;
      let contributions: any[] = [];
      const isCombined = combinedDataset !== null || (dataset && dataset.isCombined);

      if (isCombined) {
        const sourceIds = combinedDataset ? combinedDataset.sourceDatasetIds : (dataset?.sourceDatasets?.map((s: any) => s.datasetId) || []);
        let totalReadiness = 0;
        let totalQuality = 0;

        for (const sourceId of sourceIds) {
          const ds = await datasetRepository.findById(sourceId.toString());
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
              contributionPercentage: Math.round(100 / sourceIds.length),
              relationshipStatus: 'Joined'
            });
          }
        }

        if (sourceIds.length > 0) {
          combinedReadinessScore = Math.round(totalReadiness / sourceIds.length);
          combinedQualityScore = Math.round(totalQuality / sourceIds.length);
        }
      }

      // Save Assessment to Database (History support)
      let assessmentVersionId: any = currentDataset._id;
      if (!isCombined && dataset) {
        const docObj = dataset.documentId ? await documentRepository.findById(dataset.documentId._id || dataset.documentId) : null;
        if (docObj) {
          const assessmentVersions = await versionRepository.findByDocumentId(docObj._id.toString());
          const assessmentLatestVersionDoc = assessmentVersions.find((v) => v.version === docObj.currentVersion);
          assessmentVersionId = assessmentLatestVersionDoc ? assessmentLatestVersionDoc._id : docObj._id;
        }
      }

      // Upsert or Create Assessment
      const existingAssessment = await datasetAssessmentRepository.findByDatasetIdAndVersion(
        currentDataset._id,
        assessmentVersionId
      );
      let savedAssessmentObj: any;
      if (existingAssessment) {
        savedAssessmentObj = await datasetAssessmentRepository.update(existingAssessment._id, {
          documentType: isCombined ? 'Combined Dataset' : assessment.documentType,
          datasetCategory: combinedReadinessScore >= 50 ? 'Business Analytics' : 'Not Suitable',
          analyticsReadinessScore: combinedReadinessScore,
          classificationConfidence: isCombined ? 95 : assessment.classificationConfidence,
          qualityScore: combinedQualityScore,
          scoreBreakdown: assessment.scoreBreakdown,
          businessDomain: assessment.businessDomain,
          detectedEntities: assessment.detectedEntities,
          strengths: assessment.strengths,
          weaknesses: assessment.weaknesses,
          recommendations: assessment.recommendations,
          aiMetadata: assessment.aiMetadata,
          assessmentLogs: assessment.assessmentLogs,
          isCombined: isCombined || false,
          sourceDatasetContributions: contributions,
          relationshipDetectionResults: isCombined ? (combinedDataset ? combinedDataset.relationshipMap : dataset!.combinedRelationships) : {},
        });
      } else {
        savedAssessmentObj = await datasetAssessmentRepository.create({
          datasetId: currentDataset._id as Types.ObjectId,
          datasetModel: combinedDataset ? 'CombinedDataset' : 'Dataset',
          documentVersionId: assessmentVersionId as Types.ObjectId,
          documentType: isCombined ? 'Combined Dataset' : assessment.documentType,
          datasetCategory: combinedReadinessScore >= 50 ? 'Business Analytics' : 'Not Suitable',
          analyticsReadinessScore: combinedReadinessScore,
          classificationConfidence: isCombined ? 95 : assessment.classificationConfidence,
          qualityScore: combinedQualityScore,
          scoreBreakdown: assessment.scoreBreakdown,
          businessDomain: assessment.businessDomain,
          detectedEntities: assessment.detectedEntities,
          strengths: assessment.strengths,
          weaknesses: assessment.weaknesses,
          recommendations: assessment.recommendations,
          aiMetadata: assessment.aiMetadata,
          assessmentLogs: assessment.assessmentLogs,
          isCombined: isCombined || false,
          sourceDatasetContributions: contributions,
          relationshipDetectionResults: isCombined ? (combinedDataset ? combinedDataset.relationshipMap : dataset!.combinedRelationships) : {},
        });
      }

      await addLog(`Assessment report compiled. Suitability category: ${assessment.datasetCategory}, Readiness Score: ${assessment.analyticsReadinessScore}%`, 55, 'Assessment');

      const targetReadinessScore = isCombined ? combinedReadinessScore : assessment.analyticsReadinessScore;

      // Dashboard Protection Check: Block if score < 50
      if (targetReadinessScore < 50) {
        await addLog('Dataset does not meet minimum suitability requirements (Score < 50). Dashboard generation blocked.', 100, 'Blocked');
        currentDataset.processingStatus = 'failed';
        await currentDataset.save();

        job.status = 'failed';
        job.finishedAt = new Date();
        await job.save();
        
        return {
          success: false,
          blocked: true,
          readinessScore: targetReadinessScore,
          message: 'Dashboard generation blocked due to low readiness score.'
        };
      }

      const currentVersion = isCombined ? (currentDataset.currentVersion || 1) : doc.currentVersion;

      // 4. Schema detection
      await addLog('Detecting columns, categories, and measures types...', 60, 'Schema Inferrer');
      const schemaRes = await schemaDetectionService.detectSchema(cleanedRows);
      for (const log of schemaRes.logs) {
        job.logs.push(`[Schema] ${log}`);
      }
      await job.save();

      // 5. Relationship scanning
      await addLog('Scanning database for relation paths...', 75, 'Relationships');
      const relationRes = await relationshipDetectionService.detectRelationships(
        currentDataset._id as Types.ObjectId,
        schemaRes.columns.map((c) => c.name),
        userId
      );
      for (const log of relationRes.relationships) {
        job.logs.push(`[Relationship] Detected relational key ${log.sourceColumn} to target`);
      }
      await job.save();

      // 6. Metric Extraction (KPI Rules)
      await addLog('Calculating business metrics rules...', 85, 'Metrics extraction');
      const metricRes = await kpiEngineService.calculateKPIs(
        cleanedRows,
        schemaRes.columns.map((c) => c.name)
      );
      for (const log of metricRes.logs) {
        job.logs.push(`[KPI Engine] ${log}`);
      }
      await job.save();

      // 7. Visual Recommendation
      await addLog('Generating dynamic chart visualizations matches...', 90, 'Chart Recommendation');
      const recRes = await visualizationRecommendationService.recommendVisualizations(
        schemaRes.columns,
        metricRes.metrics
      );
      for (const log of recRes.logs) {
        job.logs.push(`[Recommendation] ${log}`);
      }
      await job.save();

      // 8. Persistence of Metadata & Dashboards
      await addLog('Saving processed structures to history collection...', 95, 'Saving results');

      const metadataObj = await datasetMetadataRepository.create({
        datasetId: currentDataset._id as Types.ObjectId,
        datasetModel: combinedDataset ? 'CombinedDataset' : 'Dataset',
        documentVersionId: assessmentVersionId as Types.ObjectId,
        detectedColumns: schemaRes.columns,
        detectedRelationships: relationRes.relationships,
        dimensions: schemaRes.dimensions,
        measures: schemaRes.measures,
        processingLogs: job.logs,
      });

      // Handle Dashboard creation or partial refresh
      const existingDash = await dashboardRepository.findOne({ datasetId: currentDataset._id, userId });
      let dash: any;

      if (existingDash) {
        // Compare previous columns structure to decide if we can do a partial refresh
        const prevMeta = await datasetMetadataRepository.findOne({
          datasetId: currentDataset._id,
          _id: { $ne: assessmentVersionId },
        });

        const columnsUnchanged = prevMeta && 
          prevMeta.detectedColumns.length === schemaRes.columns.length &&
          prevMeta.detectedColumns.every((c, i) => c.name === schemaRes.columns[i].name);

        if (columnsUnchanged) {
          await addLog('Columns match existing schema. Running partial metrics refresh...', 98, 'Refreshing Dashboard');
          await dashboardGenerationService.refreshDashboard(
            existingDash._id as Types.ObjectId,
            cleanedRows,
            schemaRes.columns.map((c) => c.name),
            metricRes.metrics,
            currentVersion
          );
          dash = existingDash;
        } else {
          await addLog('Schema columns modified. Rebuilding entire dashboard layout...', 98, 'Rebuilding Dashboard');
          dash = await dashboardGenerationService.generateDashboard(
            userId,
            currentDataset._id as Types.ObjectId,
            currentDataset.datasetName,
            recRes.recommendations,
            currentVersion
          );
          // Set ref path model
          dash.datasetModel = combinedDataset ? 'CombinedDataset' : 'Dataset';
          await dash.save();
        }
      } else {
        dash = await dashboardGenerationService.generateDashboard(
          userId,
          currentDataset._id as Types.ObjectId,
          currentDataset.datasetName,
          recRes.recommendations,
          currentVersion
        );
        // Set ref path model
        dash.datasetModel = combinedDataset ? 'CombinedDataset' : 'Dataset';
        await dash.save();
      }

      // Update widgets ref paths
      await widgetRepository.deleteByDashboardId(dash._id);
      let xOffset = 0;
      let yOffset = 0;
      for (const rec of recRes.recommendations) {
        const w = rec.widgetType === 'kpi' ? 3 : 6;
        const h = rec.widgetType === 'kpi' ? 2 : 4;
        if (xOffset + w > 12) {
          xOffset = 0;
          yOffset += h;
        }
        await widgetRepository.create({
          dashboardId: dash._id,
          widgetType: rec.widgetType,
          chartType: rec.chartType,
          position: { x: xOffset, y: yOffset, w, h },
          configuration: rec.configuration,
          datasetReference: currentDataset._id,
          datasetModel: combinedDataset ? 'CombinedDataset' : 'Dataset',
        });
        if (rec.widgetType === 'kpi' && rec.configuration.metricName) {
          await dashboardMetricRepository.upsert(
            dash._id,
            rec.configuration.metricName,
            rec.configuration.metricValue,
            'SUM_DISTINCT_RULE'
          );
        }
        xOffset += w;
      }

      // Update logical dataset status
      if (combinedDataset) {
        const savedWidgets = await widgetRepository.findByDashboardId(dash._id);
        const savedMetrics = await dashboardMetricRepository.findByDashboardId(dash._id);
        
        // Create ProcessingArtifact
        const artifact = await processingArtifactRepository.create({
          combinedDatasetId: combinedDataset._id,
          mergedDatasetReference: combinedDataset.mergedDatasetReference,
          cleanedDatasetReference: combinedDataset.mergedDatasetReference,
          metadata: {
            detectedColumns: schemaRes.columns,
            detectedRelationships: relationRes.relationships,
            dimensions: schemaRes.dimensions,
            measures: schemaRes.measures,
          },
          relationshipMap: combinedDataset.relationshipMap,
          KPIs: metricRes.metrics,
          dashboardWidgets: savedWidgets,
          dashboardLayout: dash.layout || { columns: 12 },
          analyticsReport: {
            datasetName: combinedDataset.datasetName,
            readinessScore: combinedReadinessScore,
            qualityScore: combinedQualityScore,
            verdict: combinedReadinessScore >= 50 ? 'Business Analytics' : 'Not Suitable',
            businessDomain: assessment.businessDomain,
            detectedEntities: assessment.detectedEntities,
            strengths: assessment.strengths,
            weaknesses: assessment.weaknesses,
            recommendations: assessment.recommendations,
          },
          datasetAssessment: assessment,
          forecastMetadata: {
            potentialForecastTargets: assessment.aiMetadata?.potentialForecastTargets || [],
          },
          AIContext: {
            suggestedKPIs: assessment.aiMetadata?.suggestedKPIs || [],
            suggestedQuestions: assessment.aiMetadata?.suggestedQuestions || [],
          },
          processingLogs: job.logs,
          artifactVersion: 1,
        });

        combinedDataset.processingArtifactId = artifact._id as any;
        combinedDataset.processingStatus = 'Completed';
        combinedDataset.ingestionStatus = 'completed';
        combinedDataset.assessmentId = savedAssessmentObj._id as any;
        combinedDataset.metadataId = metadataObj._id as any;
        await combinedDataset.save();

        job.processingArtifactId = artifact._id as any;
      } else {
        dataset!.processingStatus = 'processed';
        dataset!.schemaStatus = 'mapped';
        await dataset!.save();
      }

      // Mark Job Completed
      job.status = 'completed';
      job.progress = 100;
      job.currentStep = 'Pipeline Complete';
      job.finishedAt = new Date();
      await job.save();

      return {
        dashboardId: dash._id,
        kpis: metricRes.metrics,
        schema: schemaRes.columns,
      };
    } catch (err) {
      // Mark Job Failed
      job.status = 'failed';
      job.pipelineErrors.push((err as Error).message);
      job.currentStep = 'Pipeline Error';
      job.finishedAt = new Date();
      await job.save();

      // Update dataset status
      currentDataset.processingStatus = 'failed';
      if (combinedDataset) {
        combinedDataset.ingestionStatus = 'failed';
      }
      await currentDataset.save();

      throw err;
    }
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
