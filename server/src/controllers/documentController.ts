import { Request, Response, NextFunction } from 'express';
import { documentService } from '../services/DocumentService';
import { previewService } from '../services/PreviewService';
import { documentRepository } from '../repositories/DocumentRepository';
import { versionRepository } from '../repositories/VersionRepository';
import { sendSuccess } from '../utils/response';
import { ValidationError, NotFoundError } from '../utils/errors';
import { Types } from 'mongoose';

export const uploadDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }
    if (!req.file) {
      throw new ValidationError('No file uploaded.');
    }

    const { changeDescription } = req.body;
    const document = await documentService.uploadDocument(
      req.user.userId,
      req.user.organizationId || 'default-org',
      req.file,
      changeDescription
    );

    return sendSuccess(res, 'Document uploaded and versioned successfully.', document, 201);
  } catch (err) {
    next(err);
  }
};

export const listDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }

    const { search, extension, status, page = '1', limit = '10', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query: Record<string, any> = {
      userId: req.user.userId,
      status: status === 'archived' ? 'archived' : 'active',
    };

    if (search) {
      query.filename = { $regex: search, $options: 'i' };
    }

    if (extension) {
      query.extension = String(extension).startsWith('.') ? extension : `.${extension}`;
    }

    const skipValue = (parseInt(String(page), 10) - 1) * parseInt(String(limit), 10);
    const limitValue = parseInt(String(limit), 10);

    const sortObject: Record<string, any> = {};
    sortObject[String(sortBy)] = sortOrder === 'asc' ? 1 : -1;

    const result = await documentRepository.find(query, sortObject, skipValue, limitValue);

    return sendSuccess(res, 'Documents retrieved successfully.', {
      documents: result.items,
      pagination: {
        page: parseInt(String(page), 10),
        limit: limitValue,
        total: result.total,
        pages: Math.ceil(result.total / limitValue),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getDocumentDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }

    const { id } = req.params;
    const document = await documentRepository.findById(id);

    if (!document || document.userId !== req.user.userId) {
      throw new NotFoundError('Document not found.');
    }

    // Retrieve Version History
    const versions = await versionRepository.findByDocumentId(id);

    return sendSuccess(res, 'Document details retrieved successfully.', {
      document,
      versions,
    });
  } catch (err) {
    next(err);
  }
};

export const getDocumentPreview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }

    const { id } = req.params;
    const document = await documentRepository.findById(id);

    if (!document || document.userId !== req.user.userId) {
      throw new NotFoundError('Document not found.');
    }

    const activeVersion = document.currentVersion;
    const versionRecord = await versionRepository.findByDocumentAndVersion(id, activeVersion);

    if (!versionRecord) {
      throw new NotFoundError(`Active version ${activeVersion} details not found.`);
    }

    // 1. Fetch physical file from storage
    const downloadObj = await documentService.getDownloadStream(id, req.user.userId, activeVersion);
    
    // Convert download stream to buffer for parsing
    const chunks: Buffer[] = [];
    const fileBuffer = await new Promise<Buffer>((resolve, reject) => {
      downloadObj.stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      downloadObj.stream.on('error', (err) => reject(err));
      downloadObj.stream.on('end', () => resolve(Buffer.concat(chunks)));
    });

    // 2. Route preview generation based on extension type
    let previewData: any = null;
    const ext = document.extension.toLowerCase();

    if (ext === '.xlsx' || ext === '.csv') {
      previewData = await previewService.generateSpreadsheetPreview(fileBuffer, ext);
    } else if (ext === '.docx') {
      previewData = await previewService.generateWordPreview(fileBuffer);
    } else if (ext === '.pdf') {
      previewData = previewService.generatePdfPreview();
    } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      const url = versionRecord.cloudinaryUrl;
      previewData = previewService.generateImagePreview(url);
    } else if (ext === '.json') {
      previewData = {
        json: JSON.parse(fileBuffer.toString('utf8')),
      };
    }

    return sendSuccess(res, 'Document preview generated successfully.', {
      documentId: document._id,
      filename: document.filename,
      extension: document.extension,
      version: activeVersion,
      preview: previewData,
    });
  } catch (err) {
    next(err);
  }
};

export const updateDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }

    const { id } = req.params;
    const { tags, description, status } = req.body;

    const document = await documentRepository.findById(id);
    if (!document || document.userId !== req.user.userId) {
      throw new NotFoundError('Document not found.');
    }

    if (tags !== undefined) document.tags = tags;
    if (description !== undefined) document.description = description;
    if (status !== undefined) document.status = status;

    await document.save();

    return sendSuccess(res, 'Document metadata updated successfully.', document);
  } catch (err) {
    next(err);
  }
};

export const deleteDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }

    const { id } = req.params;
    await documentService.deleteDocument(id, req.user.userId);

    return sendSuccess(res, 'Document and all versions purged successfully.');
  } catch (err) {
    next(err);
  }
};

export const restoreDocumentVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }

    const { id } = req.params;
    const { version } = req.body;

    if (!version) {
      throw new ValidationError('Restoring target version number is required.');
    }

    const restoredDoc = await documentService.restoreVersion(id, req.user.userId, parseInt(String(version), 10));

    return sendSuccess(res, `Document successfully reverted to version ${version}.`, restoredDoc);
  } catch (err) {
    next(err);
  }
};

export const downloadDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required.');
    }

    const { id } = req.params;
    const { version, inline } = req.query;

    const versionNum = version ? parseInt(String(version), 10) : undefined;
    const downloadObj = await documentService.getDownloadStream(id, req.user.userId, versionNum);

    const disposition = inline === 'true' ? 'inline' : 'attachment';
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(downloadObj.filename)}"`);
    res.setHeader('Content-Type', downloadObj.mimeType);

    downloadObj.stream.pipe(res);
  } catch (err) {
    next(err);
  }
};
