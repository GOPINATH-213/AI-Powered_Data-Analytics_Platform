import { DatasetAssessmentModel, IDatasetAssessment } from '../models/DatasetAssessment';
import { Types } from 'mongoose';
import { normalizeObjectId } from '../utils/objectId';

export class DatasetAssessmentRepository {
  async findById(id: any): Promise<IDatasetAssessment | null> {
    const cleanId = normalizeObjectId(id, 'id');
    return DatasetAssessmentModel.findById(cleanId).populate('datasetId');
  }

  async findByDatasetIdAndVersion(
    datasetId: any,
    documentVersionId: any
  ): Promise<IDatasetAssessment | null> {
    const cleanDatasetId = normalizeObjectId(datasetId, 'datasetId');
    const cleanDocVerId = normalizeObjectId(documentVersionId, 'documentVersionId');
    return DatasetAssessmentModel.findOne({ datasetId: cleanDatasetId, documentVersionId: cleanDocVerId });
  }

  async findLatestByDatasetId(datasetId: any): Promise<IDatasetAssessment | null> {
    const cleanDatasetId = normalizeObjectId(datasetId, 'datasetId');
    return DatasetAssessmentModel.findOne({ datasetId: cleanDatasetId }).sort({ createdAt: -1 });
  }

  async findHistoryByDatasetId(datasetId: any): Promise<IDatasetAssessment[]> {
    const cleanDatasetId = normalizeObjectId(datasetId, 'datasetId');
    return DatasetAssessmentModel.find({ datasetId: cleanDatasetId }).sort({ createdAt: 1 }).populate('documentVersionId');
  }

  async create(data: Partial<IDatasetAssessment>): Promise<IDatasetAssessment> {
    if (data.datasetId) {
      data.datasetId = normalizeObjectId(data.datasetId, 'datasetId') as any;
    }
    if (data.documentVersionId) {
      data.documentVersionId = normalizeObjectId(data.documentVersionId, 'documentVersionId') as any;
    }
    return DatasetAssessmentModel.create(data);
  }

  async update(id: any, data: Partial<IDatasetAssessment>): Promise<IDatasetAssessment | null> {
    const cleanId = normalizeObjectId(id, 'id');
    if (data.datasetId) {
      data.datasetId = normalizeObjectId(data.datasetId, 'datasetId') as any;
    }
    if (data.documentVersionId) {
      data.documentVersionId = normalizeObjectId(data.documentVersionId, 'documentVersionId') as any;
    }
    return DatasetAssessmentModel.findByIdAndUpdate(cleanId, data, { new: true });
  }

  async deleteByDatasetId(datasetId: any): Promise<void> {
    const cleanDatasetId = normalizeObjectId(datasetId, 'datasetId');
    await DatasetAssessmentModel.deleteMany({ datasetId: cleanDatasetId });
  }
}

export const datasetAssessmentRepository = new DatasetAssessmentRepository();
export default datasetAssessmentRepository;
