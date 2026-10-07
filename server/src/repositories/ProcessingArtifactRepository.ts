import { ProcessingArtifactModel, IProcessingArtifact } from '../models/ProcessingArtifact';
import { Types } from 'mongoose';

export class ProcessingArtifactRepository {
  async findById(id: string | Types.ObjectId): Promise<IProcessingArtifact | null> {
    return ProcessingArtifactModel.findById(id);
  }

  async findLatestByCombinedDatasetId(combinedDatasetId: string | Types.ObjectId): Promise<IProcessingArtifact | null> {
    return ProcessingArtifactModel.findOne({ combinedDatasetId }).sort({ generatedAt: -1 });
  }

  async create(data: Partial<IProcessingArtifact>): Promise<IProcessingArtifact> {
    return ProcessingArtifactModel.create(data);
  }

  async update(id: string | Types.ObjectId, data: Partial<IProcessingArtifact>): Promise<IProcessingArtifact | null> {
    return ProcessingArtifactModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id: string | Types.ObjectId): Promise<boolean> {
    const result = await ProcessingArtifactModel.findByIdAndDelete(id);
    return result !== null;
  }
}

export const processingArtifactRepository = new ProcessingArtifactRepository();
