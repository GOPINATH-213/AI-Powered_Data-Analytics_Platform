import { DashboardModel, IDashboard } from '../models/Dashboard';
import { Types } from 'mongoose';
import { normalizeObjectId } from '../utils/objectId';

export class DashboardRepository {
  async findById(id: any): Promise<IDashboard | null> {
    const cleanId = normalizeObjectId(id, 'id');
    return DashboardModel.findById(cleanId).populate('datasetId');
  }

  async findByUserId(userId: string): Promise<IDashboard[]> {
    return DashboardModel.find({ userId }).populate('datasetId');
  }

  async findByDatasetId(datasetId: any): Promise<IDashboard[]> {
    const cleanDatasetId = normalizeObjectId(datasetId, 'datasetId');
    return DashboardModel.find({ datasetId: cleanDatasetId });
  }

  async create(data: Partial<IDashboard>): Promise<IDashboard> {
    // If datasetId is present, normalize it
    if (data.datasetId) {
      data.datasetId = normalizeObjectId(data.datasetId, 'datasetId') as any;
    }
    return DashboardModel.create(data);
  }

  async update(id: any, data: Partial<IDashboard>): Promise<IDashboard | null> {
    const cleanId = normalizeObjectId(id, 'id');
    if (data.datasetId) {
      data.datasetId = normalizeObjectId(data.datasetId, 'datasetId') as any;
    }
    return DashboardModel.findByIdAndUpdate(cleanId, data, { new: true });
  }

  async findOne(query: Record<string, any>): Promise<IDashboard | null> {
    // Check if query has datasetId and normalize it
    if (query && query.datasetId) {
      query.datasetId = normalizeObjectId(query.datasetId, 'datasetId');
    }
    return DashboardModel.findOne(query);
  }

  async delete(id: any): Promise<boolean> {
    const cleanId = normalizeObjectId(id, 'id');
    const result = await DashboardModel.findByIdAndDelete(cleanId);
    return result !== null;
  }
}

export const dashboardRepository = new DashboardRepository();
export default dashboardRepository;
