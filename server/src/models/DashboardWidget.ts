import { Schema, model, Document, Types } from 'mongoose';

export interface IDashboardWidget extends Document {
  dashboardId: Types.ObjectId;
  widgetType: 'kpi' | 'chart' | 'filter' | 'details';
  chartType?: 'line' | 'bar' | 'pie' | 'scatter' | 'kpi' | 'histogram';
  position: { x: number; y: number; w: number; h: number };
  size?: string;
  configuration: Record<string, any>;
  datasetReference: Types.ObjectId;
  datasetModel?: 'Dataset' | 'CombinedDataset';
  createdAt: Date;
  updatedAt: Date;
}

const DashboardWidgetSchema = new Schema<IDashboardWidget>(
  {
    dashboardId: {
      type: Schema.Types.ObjectId,
      ref: 'Dashboard',
      required: true,
      index: true,
    },
    widgetType: {
      type: String,
      enum: ['kpi', 'chart', 'filter', 'details'],
      required: true,
    },
    chartType: {
      type: String,
      enum: ['line', 'bar', 'pie', 'scatter', 'kpi', 'histogram'],
    },
    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      w: { type: Number, required: true },
      h: { type: Number, required: true },
    },
    size: {
      type: String,
    },
    configuration: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    datasetReference: {
      type: Schema.Types.ObjectId,
      refPath: 'datasetModel',
      required: true,
    },
    datasetModel: {
      type: String,
      required: true,
      enum: ['Dataset', 'CombinedDataset'],
      default: 'Dataset',
    },
  },
  {
    timestamps: true,
  }
);

export const DashboardWidgetModel = model<IDashboardWidget>('DashboardWidget', DashboardWidgetSchema);
export default DashboardWidgetModel;
