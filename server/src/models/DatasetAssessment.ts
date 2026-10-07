import { Schema, model, Document, Types } from 'mongoose';

export interface IDatasetAssessment extends Document {
  datasetId: Types.ObjectId;
  datasetModel?: 'Dataset' | 'CombinedDataset';
  documentVersionId: Types.ObjectId;
  documentType: string;
  datasetCategory: 'Business Analytics' | 'Limited Analytics' | 'Not Suitable';
  analyticsReadinessScore: number;
  classificationConfidence: number;
  qualityScore: number;
  scoreBreakdown: Record<string, number>;
  businessDomain: string;
  detectedEntities: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  aiMetadata: {
    suggestedKPIs: string[];
    suggestedDashboardType: string;
    suggestedQuestions: string[];
    suggestedVisualizations: Array<{ metric: string; chartType: string }>;
    potentialForecastTargets: string[];
  };
  assessmentVersion: number;
  assessmentLogs: string[];
  isCombined?: boolean;
  sourceDatasetContributions?: Array<{
    datasetId: string;
    datasetName: string;
    readinessScore: number;
    qualityScore: number;
    contributionPercentage: number;
    relationshipStatus: string;
  }>;
  relationshipDetectionResults?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const DatasetAssessmentSchema = new Schema<IDatasetAssessment>(
  {
    datasetId: {
      type: Schema.Types.ObjectId,
      refPath: 'datasetModel',
      required: true,
      index: true,
    },
    datasetModel: {
      type: String,
      required: true,
      enum: ['Dataset', 'CombinedDataset'],
      default: 'Dataset',
    },
    documentVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'DocumentVersion',
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      required: true,
      default: 'Unknown',
    },
    datasetCategory: {
      type: String,
      enum: ['Business Analytics', 'Limited Analytics', 'Not Suitable'],
      required: true,
      default: 'Not Suitable',
    },
    analyticsReadinessScore: {
      type: Number,
      required: true,
      default: 0,
    },
    classificationConfidence: {
      type: Number,
      required: true,
      default: 0,
    },
    qualityScore: {
      type: Number,
      required: true,
      default: 0,
    },
    scoreBreakdown: {
      type: Schema.Types.Mixed,
      default: {},
    },
    businessDomain: {
      type: String,
      default: 'Generic',
    },
    detectedEntities: {
      type: [String],
      default: [],
    },
    strengths: {
      type: [String],
      default: [],
    },
    weaknesses: {
      type: [String],
      default: [],
    },
    recommendations: {
      type: [String],
      default: [],
    },
    aiMetadata: {
      suggestedKPIs: { type: [String], default: [] },
      suggestedDashboardType: { type: String, default: 'General Business Dashboard' },
      suggestedQuestions: { type: [String], default: [] },
      suggestedVisualizations: { type: [Schema.Types.Mixed], default: [] },
      potentialForecastTargets: { type: [String], default: [] },
    },
    assessmentVersion: {
      type: Number,
      default: 1,
    },
    assessmentLogs: {
      type: [String],
      default: [],
    },
    isCombined: {
      type: Boolean,
      default: false,
    },
    sourceDatasetContributions: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    relationshipDetectionResults: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export const DatasetAssessmentModel = model<IDatasetAssessment>('DatasetAssessment', DatasetAssessmentSchema);
export default DatasetAssessmentModel;
