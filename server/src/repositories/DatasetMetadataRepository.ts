import { DatasetMetadataModel, IDatasetMetadata } from '../models/DatasetMetadata';
import { Types } from 'mongoose';

export class DatasetMetadataRepository {
  async findById(id: string | Types.ObjectId): Promise<IDatasetMetadata | null> {
    return DatasetMetadataModel.findById(id);
  }

  async findByDatasetIdAndVersion(
    datasetId: string | Types.ObjectId,
    documentVersionId: string | Types.ObjectId
  ): Promise<IDatasetMetadata | null> {
    return DatasetMetadataModel.findOne({ datasetId, documentVersionId });
  }

  async findLatestByDatasetId(datasetId: string | Types.ObjectId): Promise<IDatasetMetadata | null> {
    return DatasetMetadataModel.findOne({ datasetId }).sort({ createdAt: -1 });
  }

  async findOne(query: Record<string, any>): Promise<IDatasetMetadata | null> {
    return DatasetMetadataModel.findOne(query);
  }

  async create(data: Partial<IDatasetMetadata>): Promise<IDatasetMetadata> {
    return DatasetMetadataModel.create(data);
  }

  async deleteByDatasetId(datasetId: string | Types.ObjectId): Promise<void> {
    await DatasetMetadataModel.deleteMany({ datasetId });
  }
}

export const datasetMetadataRepository = new DatasetMetadataRepository();
export default datasetMetadataRepository;
