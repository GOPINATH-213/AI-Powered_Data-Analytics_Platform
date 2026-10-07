import { Schema, model, Document, Types } from 'mongoose';

export interface IProcessingArtifact extends Document {
  combinedDatasetId: Types.ObjectId;
  mergedDatasetReference?: string;
  cleanedDatasetReference?: string;
  metadata: Record<string, any>;
  relationshipMap: Record<string, any>;
  KPIs: Array<Record<string, any>>;
  dashboardWidgets: Array<Record<string, any>>;
  dashboardLayout: Record<string, any>;
  analyticsReport: Record<string, any>;
  datasetAssessment: Record<string, any>;
  forecastMetadata: Record<string, any>;
  AIContext: Record<string, any>;
  processingLogs: string[];
  artifactVersion: number;
  generatedAt: Date;
}

const ProcessingArtifactSchema = new Schema<IProcessingArtifact>(
  {
    combinedDatasetId: { type: Schema.Types.ObjectId, ref: 'CombinedDataset', required: true, index: true },
    mergedDatasetReference: { type: String },
    cleanedDatasetReference: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    relationshipMap: { type: Schema.Types.Mixed, default: {} },
    KPIs: { type: [Schema.Types.Mixed] as any, default: [] },
    dashboardWidgets: { type: [Schema.Types.Mixed] as any, default: [] },

    dashboardLayout: { type: Schema.Types.Mixed, default: {} },
    analyticsReport: { type: Schema.Types.Mixed, default: {} },
    datasetAssessment: { type: Schema.Types.Mixed, default: {} },
    forecastMetadata: { type: Schema.Types.Mixed, default: {} },
    AIContext: { type: Schema.Types.Mixed, default: {} },
    processingLogs: { type: [String], default: [] },
    artifactVersion: { type: Number, default: 1 },
    generatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const ProcessingArtifactModel = model<IProcessingArtifact>('ProcessingArtifact', ProcessingArtifactSchema);
export default ProcessingArtifactModel;
