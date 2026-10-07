import { documentService } from './DocumentService';
import * as xlsx from 'xlsx';
import { gridFSProvider } from '../providers/GridFSProvider';
import { ValidationError } from '../utils/errors';

export class DatasetLoaderService {
  /**
   * Retrieves file from storage and converts raw bytes into JSON array of rows.
   */
  async loadDataset(
    documentId: string,
    userId: string,
    versionNumber?: number
  ): Promise<{ rows: Record<string, any>[]; originalFilename: string; extension: string }> {
    const downloadObj = await documentService.getDownloadStream(documentId, userId, versionNumber);
    
    // Read stream to buffer
    const chunks: Buffer[] = [];
    const fileBuffer = await new Promise<Buffer>((resolve, reject) => {
      downloadObj.stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      downloadObj.stream.on('error', (err) => reject(err));
      downloadObj.stream.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const ext = pathExt(downloadObj.filename).toLowerCase();
    let rows: Record<string, any>[] = [];

    if (ext === '.xlsx' || ext === '.csv') {
      const workbook = xlsx.read(fileBuffer, { 
        type: 'buffer',
        cellDates: true,
        dateNF: 'yyyy-mm-dd'
      });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      // Convert to JSON row objects, formatting dates cleanly
      rows = xlsx.utils.sheet_to_json(sheet, { defval: null });
    } else if (ext === '.json') {
      try {
        const jsonContent = JSON.parse(fileBuffer.toString('utf8'));
        rows = Array.isArray(jsonContent) ? jsonContent : [jsonContent];
      } catch (err) {
        throw new ValidationError('Uploaded JSON file content is not valid JSON.');
      }
    } else if (['.pdf', '.docx'].includes(ext)) {
      // Read-only text formats are parsed as a single text row for metadata structure
      rows = [{ content: fileBuffer.toString('utf8').slice(0, 10000) }];
    }

    return {
      rows,
      originalFilename: downloadObj.filename,
      extension: ext,
    };
  }
  /**
   * Loads and parses a dataset directly by GridFS fileId.
   */
  async loadDatasetByFileId(
    fileId: string,
    filename = 'data.csv'
  ): Promise<{ rows: Record<string, any>[] }> {
    const stream = await gridFSProvider.download(fileId);
    const chunks: Buffer[] = [];
    const fileBuffer = await new Promise<Buffer>((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const workbook = xlsx.read(fileBuffer, { 
      type: 'buffer',
      cellDates: true,
      dateNF: 'yyyy-mm-dd'
    });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: null }) as Record<string, any>[];

    return { rows };
  }
}

// Simple path helper to avoid duplicate imports
function pathExt(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
}

export const datasetLoaderService = new DatasetLoaderService();
export default datasetLoaderService;
