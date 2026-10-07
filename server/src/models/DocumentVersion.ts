import { Schema, model, Document, Types } from 'mongoose';

export interface IDocumentVersion extends Document {
  documentId: Types.ObjectId;
  version: number;
  uploadedBy: string;
  uploadDate: Date;
  GridFSFileId?: Types.ObjectId; // Optional because image files in Cloudinary don't use GridFS
  cloudinaryPublicId?: string;  // Cloudinary media identifier
  cloudinaryUrl?: string;       // Cloudinary URL for easy reference
  changeDescription?: string;
}

const DocumentVersionSchema = new Schema<IDocumentVersion>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
    },
    uploadedBy: {
      type: String,
      required: true,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
    GridFSFileId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    cloudinaryPublicId: {
      type: String,
    },
    cloudinaryUrl: {
      type: String,
    },
    changeDescription: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness of version number per document
DocumentVersionSchema.index({ documentId: 1, version: 1 }, { unique: true });

export const DocumentVersionModel = model<IDocumentVersion>('DocumentVersion', DocumentVersionSchema);
export default DocumentVersionModel;
