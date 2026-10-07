import { Schema, model, Document, Types } from 'mongoose';

export interface ICombinedDataset extends Document {
  userId: string;
  datasetName: string;
  dashboardName: string;
  dashboardCategory: string;
  sourceDatasetIds: Types.ObjectId[];
  relationshipMap: Record<string, any>;
  mergedDatasetReference?: string;
  processingArtifactId?: Types.ObjectId;
  mergedRowCount?: number;
  mergedColumnCount?: number;
  processingStatus: 'Uploaded' | 'Relationship Ready' | 'Combined Dataset Created' | 'Ingestion Running' | 'Analytics Generated' | 'Dashboard Generated' | 'Assessment Generated' | 'Forecast Ready' | 'AI Ready' | 'Completed' | 'failed';
  ingestionStatus: 'pending' | 'running' | 'completed' | 'failed';
  dashboardId?: Types.ObjectId;
  assessmentId?: Types.ObjectId;
  metadataId?: Types.ObjectId;
  isCombined: boolean;
  sourceDatasetVersions?: Array<{ datasetId: Types.ObjectId; version: number }>;
  createdAt: Date;
  updatedAt: Date;
}

const CombinedDatasetSchema = new Schema<ICombinedDataset>(
  {
    userId: { type: String, required: true, index: true },
    datasetName: { type: String, required: true, trim: true },
    dashboardName: { type: String, required: true, trim: true },
    dashboardCategory: { type: String, required: true, default: 'General', trim: true },
    isCombined: { type: Boolean, default: true },
    sourceDatasetIds: [{ type: Schema.Types.ObjectId, ref: 'Dataset' }],
    sourceDatasetVersions: [{
      datasetId: { type: Schema.Types.ObjectId, ref: 'Dataset' },
      version: { type: Number }
    }],
    relationshipMap: { type: Schema.Types.Mixed, default: {} },
    mergedDatasetReference: { type: String },
    processingArtifactId: { type: Schema.Types.ObjectId, ref: 'ProcessingArtifact' },
    mergedRowCount: { type: Number, default: 0 },
    mergedColumnCount: { type: Number, default: 0 },
    processingStatus: {
      type: String,
      enum: [
        'Uploaded',
        'Relationship Ready',
        'Combined Dataset Created',
        'Ingestion Running',
        'Analytics Generated',
        'Dashboard Generated',
        'Assessment Generated',
        'Forecast Ready',
        'AI Ready',
        'Completed',
        'failed'
      ],
      default: 'Combined Dataset Created'
    },
    ingestionStatus: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending'
    },
    dashboardId: { type: Schema.Types.ObjectId, ref: 'Dashboard' },
    assessmentId: { type: Schema.Types.ObjectId, ref: 'DatasetAssessment' },
    metadataId: { type: Schema.Types.ObjectId, ref: 'DatasetMetadata' }
  },
  { timestamps: true }
);

export const CombinedDatasetModel = model<ICombinedDataset>('CombinedDataset', CombinedDatasetSchema);
export default CombinedDatasetModel;
