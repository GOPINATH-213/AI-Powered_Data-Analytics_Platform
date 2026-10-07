import { Schema, model, Document, Types } from 'mongoose';

export interface IDashboardMetric extends Document {
  dashboardId: Types.ObjectId;
  metricName: string;
  metricValue: number;
  calculationMethod: string;
  updatedAt: Date;
}

const DashboardMetricSchema = new Schema<IDashboardMetric>(
  {
    dashboardId: {
      type: Schema.Types.ObjectId,
      ref: 'Dashboard',
      required: true,
      index: true,
    },
    metricName: {
      type: String,
      required: true,
    },
    metricValue: {
      type: Number,
      required: true,
    },
    calculationMethod: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure quick key lookups
DashboardMetricSchema.index({ dashboardId: 1, metricName: 1 });

export const DashboardMetricModel = model<IDashboardMetric>('DashboardMetric', DashboardMetricSchema);
export default DashboardMetricModel;
