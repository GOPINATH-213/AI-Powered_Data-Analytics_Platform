import { documentRepository } from '../repositories/DocumentRepository';
import { versionRepository } from '../repositories/VersionRepository';
import { datasetRepository } from '../repositories/DatasetRepository';
import { datasetAssessmentRepository } from '../repositories/DatasetAssessmentRepository';
import { dashboardRepository } from '../repositories/DashboardRepository';
import { widgetRepository } from '../repositories/WidgetRepository';
import { dashboardMetricRepository } from '../repositories/DashboardMetricRepository';
import { datasetMetadataRepository } from '../repositories/DatasetMetadataRepository';
import { processingJobRepository } from '../repositories/ProcessingJobRepository';
import { DatasetModel } from '../models/Dataset';
import { gridFSProvider } from '../providers/GridFSProvider';
import { cloudinaryProvider } from '../providers/CloudinaryProvider';
import { ValidationError, NotFoundError, StorageError } from '../utils/errors';
import { Types } from 'mongoose';
import path from 'path';

export class DocumentService {
  private allowedExtensions = ['.xlsx', '.csv', '.json', '.pdf', '.docx', '.jpg', '.jpeg', '.png'];
  private imageExtensions = ['.jpg', '.jpeg', '.png'];

  /**
   * Orchestrates the file upload, storage, versioning and dataset registration.
   * This is structured synchronously but divided so it can be easily moved to a background worker queue in the future.
   */
  async uploadDocument(
    userId: string,
    organizationId: string,
    file: Express.Multer.File,
    changeDescription = 'Initial upload'
  ) {
    const originalName = file.originalname;
    const extension = path.extname(originalName).toLowerCase();
    const mimeType = file.mimetype;
    const fileSize = file.size;

    // 1. Validation checks
    if (!this.allowedExtensions.includes(extension)) {
      throw new ValidationError(`Unsupported file extension: ${extension}`);
    }

    // Maximum file size: 15MB
    if (fileSize > 15 * 1024 * 1024) {
      throw new ValidationError('File size exceeds the 15MB limit.');
    }

    // Determine storage target
    const isImage = this.imageExtensions.includes(extension);
    const storageType = isImage ? 'cloudinary' : 'gridfs';
    const provider = isImage ? cloudinaryProvider : gridFSProvider;

    // 2. Perform File Storage write
    const uploadResult = await provider.upload(file.buffer, originalName, mimeType);

    // 3. Database Metadata registration & Version Control
    let document = await documentRepository.findByFilename(userId, originalName);

    if (!document) {
      // Scenario A: Completely new file (Version 1)
      document = await documentRepository.create({
        userId,
        organizationId,
        filename: originalName,
        originalFilename: originalName,
        mimeType,
        extension,
        storageType,
        fileSize,
        currentVersion: 1,
        status: 'active',
        tags: [],
      });

      // Create version reference
      await versionRepository.create({
        documentId: document._id as Types.ObjectId,
        version: 1,
        uploadedBy: userId,
        GridFSFileId: storageType === 'gridfs' ? new Types.ObjectId(uploadResult.fileId) : undefined,
        cloudinaryPublicId: storageType === 'cloudinary' ? uploadResult.fileId : undefined,
        cloudinaryUrl: storageType === 'cloudinary' ? uploadResult.storagePath : undefined,
        changeDescription,
      });

      // Register the Dataset logical reference
      await datasetRepository.create({
        userId,
        documentId: document._id as Types.ObjectId,
        datasetName: originalName.split('.')[0] + ' Dataset',
        sourceType: extension.replace('.', ''),
        schemaStatus: 'pending',
        processingStatus: 'pending',
      });
    } else {
      // Scenario B: File with same name exists (Version N+1)
      const nextVersion = document.currentVersion + 1;

      // Create new version reference
      await versionRepository.create({
        documentId: document._id as Types.ObjectId,
        version: nextVersion,
        uploadedBy: userId,
        GridFSFileId: storageType === 'gridfs' ? new Types.ObjectId(uploadResult.fileId) : undefined,
        cloudinaryPublicId: storageType === 'cloudinary' ? uploadResult.fileId : undefined,
        cloudinaryUrl: storageType === 'cloudinary' ? uploadResult.storagePath : undefined,
        changeDescription,
      });

      // Update the main document metadata
      document.currentVersion = nextVersion;
      document.fileSize = fileSize;
      document.mimeType = mimeType;
      await document.save();

      // Update dataset modified time
      const dataset = await datasetRepository.findByDocumentId(document._id as Types.ObjectId);
      if (dataset) {
        dataset.processingStatus = 'pending';
        dataset.updatedAt = new Date();
        await dataset.save();

        // Propagate freshness cascade to all dependent combined datasets
        const dependentCombined = await DatasetModel.find({
          isCombined: true,
          'sourceDatasets.datasetId': dataset._id,
        });

        for (const comb of dependentCombined) {
          comb.processingStatus = 'pending';
          await comb.save();
        }
      }
    }

    return document;
  }

  /**
   * Downloads the file stream for a specific version, defaulting to currentVersion.
   */
  async getDownloadStream(
    documentId: string,
    userId: string,
    versionNumber?: number
  ): Promise<{ stream: NodeJS.ReadableStream; filename: string; mimeType: string }> {
    const document = await documentRepository.findById(documentId);
    if (!document || document.userId !== userId || document.status === 'archived') {
      throw new NotFoundError('Document not found or access denied.');
    }

    const versionToFind = versionNumber || document.currentVersion;
    const versionRecord = await versionRepository.findByDocumentAndVersion(documentId, versionToFind);

    if (!versionRecord) {
      throw new NotFoundError(`Version ${versionToFind} of this document was not found.`);
    }

    const provider = document.storageType === 'cloudinary' ? cloudinaryProvider : gridFSProvider;
    const fileId = document.storageType === 'cloudinary' 
      ? versionRecord.cloudinaryPublicId! 
      : versionRecord.GridFSFileId!.toString();

    const stream = await provider.download(fileId);

    return {
      stream,
      filename: document.filename,
      mimeType: document.mimeType,
    };
  }

  /**
   * Restores a document to a previous historical version by updating currentVersion references.
   */
  async restoreVersion(documentId: string, userId: string, targetVersion: number) {
    const document = await documentRepository.findById(documentId);
    if (!document || document.userId !== userId || document.status === 'archived') {
      throw new NotFoundError('Document not found or access denied.');
    }

    const versionRecord = await versionRepository.findByDocumentAndVersion(documentId, targetVersion);
    if (!versionRecord) {
      throw new ValidationError(`Version ${targetVersion} does not exist.`);
    }

    // Set the document to point to this target version
    document.currentVersion = targetVersion;
    await document.save();

    const dataset = await datasetRepository.findByDocumentId(document._id as Types.ObjectId);
    if (dataset) {
      dataset.processingStatus = 'pending';
      await dataset.save();

      // Propagate freshness cascade to all dependent combined datasets
      const dependentCombined = await DatasetModel.find({
        isCombined: true,
        'sourceDatasets.datasetId': dataset._id,
      });

      for (const comb of dependentCombined) {
        comb.processingStatus = 'pending';
        await comb.save();
      }
    }

    return document;
  }

  /**
   * Deletes a document, purging all physical file versions and database records.
   */
  async deleteDocument(documentId: string, userId: string) {
    const document = await documentRepository.findById(documentId);
    if (!document || document.userId !== userId) {
      throw new NotFoundError('Document not found or access denied.');
    }

    const versions = await versionRepository.findByDocumentId(documentId);
    const provider = document.storageType === 'cloudinary' ? cloudinaryProvider : gridFSProvider;

    // Purge files from physical storage
    for (const ver of versions) {
      const fileId = document.storageType === 'cloudinary' 
        ? ver.cloudinaryPublicId 
        : ver.GridFSFileId?.toString();
      
      if (fileId) {
        try {
          await provider.delete(fileId);
        } catch (err) {
          console.error(`Failed to delete storage file ${fileId} during purge:`, err);
        }
      }
    }

    // Find and cascade delete all related database records
    const dataset = await datasetRepository.findByDocumentId(documentId);
    if (dataset) {
      const datasetId = dataset._id;

      // 1. Delete dataset assessments
      await datasetAssessmentRepository.deleteByDatasetId(datasetId);

      // 2. Delete processing logs/jobs
      await processingJobRepository.deleteByDatasetId(datasetId);

      // 3. Delete dataset metadata
      await datasetMetadataRepository.deleteByDatasetId(datasetId);

      // 4. Find and delete the dashboard structure
      const dashboard = await dashboardRepository.findOne({ datasetId });
      if (dashboard) {
        // Delete widgets
        await widgetRepository.deleteByDashboardId(dashboard._id);
        // Delete dashboard metrics
        await dashboardMetricRepository.deleteByDashboardId(dashboard._id);
        // Delete dashboard
        await dashboardRepository.delete(dashboard._id);
      }
    }

    // Remove DB collection entries
    await versionRepository.deleteByDocumentId(documentId);
    await datasetRepository.deleteByDocumentId(documentId);
    await documentRepository.delete(documentId);

    return true;
  }
}

export const documentService = new DocumentService();
export default documentService;
