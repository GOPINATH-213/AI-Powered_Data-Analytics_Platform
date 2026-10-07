import { Schema, model, Document, Types } from 'mongoose';

export interface IColumnMetadata {
  name: string;
  inferredType: 'dimension' | 'measure' | 'date' | 'boolean' | 'unknown';
  dataType: 'string' | 'number' | 'date' | 'boolean';
  cardinality: number;
  distinctValuesSample: string[];
}

export interface IRelationshipMetadata {
  sourceColumn: string;
  targetDatasetId: Types.ObjectId;
  targetColumn: string;
  confidence: number;
}

export interface IDatasetMetadata extends Document {
  datasetId: Types.ObjectId;
  datasetModel?: 'Dataset' | 'CombinedDataset';
  documentVersionId: Types.ObjectId; // Links metadata to a specific document version!
  detectedColumns: IColumnMetadata[];
  detectedRelationships: IRelationshipMetadata[];
  dimensions: string[];
  measures: string[];
  processingLogs: string[];
  // Future AI-ready fields (optional and unused in Phase 3)
  businessEntities?: string[];
  detectedMeasures?: string[];
  detectedDimensions?: string[];
  timeColumns?: string[];
  currencyColumns?: string[];
  suggestedKPIs?: string[];
  suggestedQuestions?: string[];
}

const DatasetMetadataSchema = new Schema<IDatasetMetadata>(
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
    detectedColumns: [Schema.Types.Mixed],
    detectedRelationships: [Schema.Types.Mixed],
    dimensions: {
      type: [String],
      default: [],
    },
    measures: {
      type: [String],
      default: [],
    },
    processingLogs: {
      type: [String],
      default: [],
    },
    // AI Placeholders
    businessEntities: { type: [String], default: [] },
    detectedMeasures: { type: [String], default: [] },
    detectedDimensions: { type: [String], default: [] },
    timeColumns: { type: [String], default: [] },
    currencyColumns: { type: [String], default: [] },
    suggestedKPIs: { type: [String], default: [] },
    suggestedQuestions: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

export const DatasetMetadataModel = model<IDatasetMetadata>('DatasetMetadata', DatasetMetadataSchema);
export default DatasetMetadataModel;
