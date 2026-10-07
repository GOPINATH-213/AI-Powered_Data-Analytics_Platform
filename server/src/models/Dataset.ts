import { Schema, model, Document, Types } from 'mongoose';

export interface IDataset extends Document {
  userId: string;
  documentId?: Types.ObjectId;
  datasetName: string;
  sourceType: string;
  schemaStatus: 'pending' | 'mapped';
  processingStatus: 'pending' | 'processed' | 'failed';
  isCombined?: boolean;
  currentVersion?: number;
  sourceDatasets?: Array<{ datasetId: Types.ObjectId; version: number }>;
  versionHistory?: Array<{
    version: number;
    sourceDatasets: Array<{ datasetId: Types.ObjectId; version: number }>;
    generatedAt: Date;
  }>;
  combinedRelationships?: Record<string, any>;
  dashboardIds?: Types.ObjectId[];
  // Future AI placeholder fields (optional, unused in Phase 2)
  aiStatus?: 'pending' | 'completed' | 'failed';
  schemaVersion?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const DatasetSchema = new Schema<IDataset>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: false,
      index: true,
    },
    datasetName: {
      type: String,
      required: true,
      trim: true,
    },
    sourceType: {
      type: String,
      required: true,
    },
    schemaStatus: {
      type: String,
      enum: ['pending', 'mapped'],
      default: 'pending',
    },
    processingStatus: {
      type: String,
      enum: ['pending', 'processed', 'failed'],
      default: 'pending',
    },
    isCombined: {
      type: Boolean,
      default: false,
    },
    currentVersion: {
      type: Number,
      default: 1,
    },
    sourceDatasets: [
      {
        datasetId: { type: Schema.Types.ObjectId, ref: 'Dataset' },
        version: { type: Number },
      },
    ],
    versionHistory: [
      {
        version: { type: Number },
        sourceDatasets: [
          {
            datasetId: { type: Schema.Types.ObjectId, ref: 'Dataset' },
            version: { type: Number },
          },
        ],
        generatedAt: { type: Date, default: Date.now },
      },
    ],
    combinedRelationships: {
      type: Schema.Types.Mixed,
      default: {},
    },
    dashboardIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Dashboard' }],
      default: [],
    },
    // Future AI placeholders
    aiStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    schemaVersion: {
      type: Number,
      default: 1,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export const DatasetModel = model<IDataset>('Dataset', DatasetSchema);
export default DatasetModel;
