import { DashboardMetricModel, IDashboardMetric } from '../models/DashboardMetric';
import { Types } from 'mongoose';

export class DashboardMetricRepository {
  async findByDashboardId(dashboardId: string | Types.ObjectId): Promise<IDashboardMetric[]> {
    return DashboardMetricModel.find({ dashboardId });
  }

  async findByDashboardAndName(
    dashboardId: string | Types.ObjectId,
    metricName: string
  ): Promise<IDashboardMetric | null> {
    return DashboardMetricModel.findOne({ dashboardId, metricName });
  }

  async create(data: Partial<IDashboardMetric>): Promise<IDashboardMetric> {
    return DashboardMetricModel.create(data);
  }

  async deleteByDashboardId(dashboardId: string | Types.ObjectId): Promise<void> {
    await DashboardMetricModel.deleteMany({ dashboardId });
  }

  async upsert(
    dashboardId: string | Types.ObjectId,
    metricName: string,
    metricValue: number,
    calculationMethod: string
  ): Promise<IDashboardMetric> {
    return DashboardMetricModel.findOneAndUpdate(
      { dashboardId, metricName },
      { metricValue, calculationMethod },
      { upsert: true, new: true }
    ) as Promise<IDashboardMetric>;
  }
}

export const dashboardMetricRepository = new DashboardMetricRepository();
export default dashboardMetricRepository;
