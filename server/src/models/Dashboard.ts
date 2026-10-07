import { Schema, model, Document, Types } from 'mongoose';

export interface IDashboard extends Document {
  userId: string;
  datasetId: Types.ObjectId;
  datasetModel?: 'Dataset' | 'CombinedDataset';
  dashboardName: string;
  dashboardCategory: string;
  currentVersion: number;
  layout?: Record<string, any>;
  filters?: Array<{ column: string; value: any; type: string }>;
  createdAt: Date;
  updatedAt: Date;
}

const DashboardSchema = new Schema<IDashboard>(
  {
    currentVersion: {
      type: Number,
      default: 1,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
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
    dashboardName: {
      type: String,
      required: true,
      trim: true,
    },
    dashboardCategory: {
      type: String,
      required: true,
      default: 'General',
      trim: true,
    },
    layout: {
      type: Schema.Types.Mixed,
      default: {},
    },
    filters: {
      type: [Schema.Types.Mixed],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const DashboardModel = model<IDashboard>('Dashboard', DashboardSchema);
export default DashboardModel;
