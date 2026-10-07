import { DatasetModel, IDataset } from '../models/Dataset';
import { Types } from 'mongoose';
import { normalizeObjectId } from '../utils/objectId';

export class DatasetRepository {
  async findById(id: any): Promise<IDataset | null> {
    const cleanId = normalizeObjectId(id, 'id');
    return DatasetModel.findById(cleanId).populate('documentId');
  }

  async findByDocumentId(documentId: any): Promise<IDataset | null> {
    const cleanDocId = normalizeObjectId(documentId, 'documentId');
    return DatasetModel.findOne({ documentId: cleanDocId });
  }

  async find(
    query: Record<string, any>,
    sort: Record<string, any> = { createdAt: -1 },
    skip = 0,
    limit = 20
  ): Promise<{ items: IDataset[]; total: number }> {
    const [items, total] = await Promise.all([
      DatasetModel.find(query).populate('documentId').sort(sort).skip(skip).limit(limit),
      DatasetModel.countDocuments(query),
    ]);
    return { items, total };
  }

  async create(data: Partial<IDataset>): Promise<IDataset> {
    return DatasetModel.create(data);
  }

  async update(id: any, data: Partial<IDataset>): Promise<IDataset | null> {
    const cleanId = normalizeObjectId(id, 'id');
    return DatasetModel.findByIdAndUpdate(cleanId, data, { new: true });
  }

  async delete(id: any): Promise<boolean> {
    const cleanId = normalizeObjectId(id, 'id');
    const result = await DatasetModel.findByIdAndDelete(cleanId);
    return result !== null;
  }

  async deleteByDocumentId(documentId: any): Promise<void> {
    const cleanDocId = normalizeObjectId(documentId, 'documentId');
    await DatasetModel.deleteMany({ documentId: cleanDocId });
  }
}

export const datasetRepository = new DatasetRepository();
export default datasetRepository;
