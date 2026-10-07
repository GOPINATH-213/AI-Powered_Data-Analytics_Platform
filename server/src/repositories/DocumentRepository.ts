import { DocumentModel, IDocument } from '../models/Document';
import { Types } from 'mongoose';

export class DocumentRepository {
  async findById(id: string | Types.ObjectId): Promise<IDocument | null> {
    return DocumentModel.findById(id);
  }

  async findOne(query: Record<string, any>): Promise<IDocument | null> {
    return DocumentModel.findOne(query);
  }

  async findByFilename(userId: string, filename: string): Promise<IDocument | null> {
    return DocumentModel.findOne({ userId, filename, status: 'active' });
  }

  async find(
    query: Record<string, any>,
    sort: Record<string, any> = { createdAt: -1 },
    skip = 0,
    limit = 20
  ): Promise<{ items: IDocument[]; total: number }> {
    const [items, total] = await Promise.all([
      DocumentModel.find(query).sort(sort).skip(skip).limit(limit),
      DocumentModel.countDocuments(query),
    ]);
    return { items, total };
  }

  async create(data: Partial<IDocument>): Promise<IDocument> {
    return DocumentModel.create(data);
  }

  async update(id: string | Types.ObjectId, data: Partial<IDocument>): Promise<IDocument | null> {
    return DocumentModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id: string | Types.ObjectId): Promise<boolean> {
    const result = await DocumentModel.findByIdAndDelete(id);
    return result !== null;
  }
}

export const documentRepository = new DocumentRepository();
