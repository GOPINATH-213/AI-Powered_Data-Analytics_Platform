import { DocumentVersionModel, IDocumentVersion } from '../models/DocumentVersion';
import { Types } from 'mongoose';

export class VersionRepository {
  async findById(id: string | Types.ObjectId): Promise<IDocumentVersion | null> {
    return DocumentVersionModel.findById(id);
  }

  async findByDocumentId(documentId: string | Types.ObjectId): Promise<IDocumentVersion[]> {
    return DocumentVersionModel.find({ documentId }).sort({ version: -1 });
  }

  async findByDocumentAndVersion(
    documentId: string | Types.ObjectId,
    version: number
  ): Promise<IDocumentVersion | null> {
    return DocumentVersionModel.findOne({ documentId, version });
  }

  async create(data: Partial<IDocumentVersion>): Promise<IDocumentVersion> {
    return DocumentVersionModel.create(data);
  }

  async deleteByDocumentId(documentId: string | Types.ObjectId): Promise<void> {
    await DocumentVersionModel.deleteMany({ documentId });
  }

  async deleteById(id: string | Types.ObjectId): Promise<boolean> {
    const result = await DocumentVersionModel.findByIdAndDelete(id);
    return result !== null;
  }
}

export const versionRepository = new VersionRepository();
