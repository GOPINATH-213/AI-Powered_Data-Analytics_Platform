import { Schema, model, Document, Types } from 'mongoose';

export interface IProcessingJob extends Document {
  datasetId: Types.ObjectId;
  processingArtifactId?: Types.ObjectId;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  logs: string[];
  pipelineErrors: string[];
  startedAt?: Date;
  finishedAt?: Date;
}

const ProcessingJobSchema = new Schema<IProcessingJob>(
  {
    datasetId: {
      type: Schema.Types.ObjectId,
      ref: 'Dataset',
      required: true,
      index: true,
    },
    processingArtifactId: {
      type: Schema.Types.ObjectId,
      ref: 'ProcessingArtifact',
      required: false,
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    progress: {
      type: Number,
      default: 0,
    },
    currentStep: {
      type: String,
      default: 'Job Created',
    },
    logs: {
      type: [String],
      default: [],
    },
    pipelineErrors: {
      type: [String],
      default: [],
    },
    startedAt: {
      type: Date,
    },
    finishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const ProcessingJobModel = model<IProcessingJob>('ProcessingJob', ProcessingJobSchema);
export default ProcessingJobModel;
