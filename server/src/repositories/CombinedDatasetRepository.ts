import { CombinedDatasetModel, ICombinedDataset } from '../models/CombinedDataset';
import { Types } from 'mongoose';
import { normalizeObjectId } from '../utils/objectId';

export class CombinedDatasetRepository {
  async findById(id: any): Promise<ICombinedDataset | null> {
    const cleanId = normalizeObjectId(id, 'id');
    return CombinedDatasetModel.findById(cleanId).populate('sourceDatasetIds');
  }

  async find(
    query: Record<string, any>,
    sort: Record<string, any> = { createdAt: -1 },
    skip = 0,
    limit = 20
  ): Promise<{ items: ICombinedDataset[]; total: number }> {
    const [items, total] = await Promise.all([
      CombinedDatasetModel.find(query).populate('sourceDatasetIds').sort(sort).skip(skip).limit(limit),
      CombinedDatasetModel.countDocuments(query),
    ]);
    return { items, total };
  }

  async create(data: Partial<ICombinedDataset>): Promise<ICombinedDataset> {
    return CombinedDatasetModel.create(data);
  }

  async update(id: any, data: Partial<ICombinedDataset>): Promise<ICombinedDataset | null> {
    const cleanId = normalizeObjectId(id, 'id');
    return CombinedDatasetModel.findByIdAndUpdate(cleanId, data, { new: true });
  }

  async delete(id: any): Promise<boolean> {
    const cleanId = normalizeObjectId(id, 'id');
    const result = await CombinedDatasetModel.findByIdAndDelete(cleanId);
    return result !== null;
  }
}

export const combinedDatasetRepository = new CombinedDatasetRepository();
export default combinedDatasetRepository;
