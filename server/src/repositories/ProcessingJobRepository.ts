import { ProcessingJobModel, IProcessingJob } from '../models/ProcessingJob';
import { Types } from 'mongoose';

export class ProcessingJobRepository {
  async findById(id: string | Types.ObjectId): Promise<IProcessingJob | null> {
    return ProcessingJobModel.findById(id);
  }

  async findLatestByDatasetId(datasetId: string | Types.ObjectId): Promise<IProcessingJob | null> {
    return ProcessingJobModel.findOne({ datasetId }).sort({ createdAt: -1 });
  }

  async create(data: Partial<IProcessingJob>): Promise<IProcessingJob> {
    return ProcessingJobModel.create(data);
  }

  async update(id: string | Types.ObjectId, data: Partial<IProcessingJob>): Promise<IProcessingJob | null> {
    return ProcessingJobModel.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteByDatasetId(datasetId: string | Types.ObjectId): Promise<void> {
    await ProcessingJobModel.deleteMany({ datasetId });
  }
}

export const processingJobRepository = new ProcessingJobRepository();
export default processingJobRepository;
