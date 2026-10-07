import { Schema, model, Document } from 'mongoose';

export interface IDocument extends Document {
  userId: string;
  organizationId: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  extension: string;
  storageType: 'gridfs' | 'cloudinary';
  fileSize: number;
  uploadDate: Date;
  currentVersion: number;
  tags: string[];
  description?: string;
  status: 'active' | 'archived';
}

const DocumentSchema = new Schema<IDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalFilename: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    extension: {
      type: String,
      required: true,
    },
    storageType: {
      type: String,
      enum: ['gridfs', 'cloudinary'],
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
    currentVersion: {
      type: Number,
      default: 1,
    },
    tags: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast querying
DocumentSchema.index({ userId: 1, status: 1 });
DocumentSchema.index({ organizationId: 1, status: 1 });
DocumentSchema.index({ filename: 'text', originalFilename: 'text' });

export const DocumentModel = model<IDocument>('Document', DocumentSchema);
export default DocumentModel;
