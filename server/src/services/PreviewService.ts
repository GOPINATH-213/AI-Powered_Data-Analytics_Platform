import * as xlsx from 'xlsx';
import mammoth from 'mammoth';
import { ValidationError } from '../utils/errors';

export class PreviewService {
  /**
   * Generates a structural JSON preview for Excel and CSV buffers
   */
  async generateSpreadsheetPreview(
    fileBuffer: Buffer,
    extension: string
  ): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
    try {
      const workbook = xlsx.read(fileBuffer, { 
        type: 'buffer',
        cellDates: true,
        dateNF: 'yyyy-mm-dd'
      });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON array of arrays
      const data: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      
      if (data.length === 0) {
        return { headers: [], rows: [] };
      }

      const headers = data[0].map(h => String(h || ''));
      const rowData = data.slice(1, 11); // Get first 10 rows for preview

      const rows = rowData.map((row) => {
        const rowObj: Record<string, any> = {};
        headers.forEach((header, index) => {
          let value = row[index] !== undefined ? row[index] : null;
          
          // Format date objects or Excel serial numbers inside date headers
          const normKey = header.trim().toLowerCase();
          if (normKey.includes('date')) {
            if (value instanceof Date) {
              const yyyy = value.getFullYear();
              const mm = String(value.getMonth() + 1).padStart(2, '0');
              const dd = String(value.getDate()).padStart(2, '0');
              value = `${yyyy}-${mm}-${dd}`;
            } else if (value !== null && value !== undefined && !isNaN(Number(value))) {
              const num = Number(value);
              if (num >= 35000 && num <= 60000) {
                const epoch = new Date(1899, 11, 30);
                const dateObj = new Date(epoch.getTime() + num * 86400000);
                const yyyy = dateObj.getFullYear();
                const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                const dd = String(dateObj.getDate()).padStart(2, '0');
                value = `${yyyy}-${mm}-${dd}`;
              }
            }
          }

          rowObj[header] = value;
        });
        return rowObj;
      });

      return { headers, rows };
    } catch (err) {
      throw new ValidationError(`Failed to parse spreadsheet: ${(err as Error).message}`);
    }
  }

  /**
   * Generates plain text preview for Word (.docx) files
   */
  async generateWordPreview(fileBuffer: Buffer): Promise<{ text: string }> {
    try {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      const fullText = result.value;
      const previewText = fullText.slice(0, 1500); // Send first 1500 chars
      return {
        text: previewText + (fullText.length > 1500 ? '...\n[Preview truncated]' : ''),
      };
    } catch (err) {
      throw new ValidationError(`Failed to extract Word text: ${(err as Error).message}`);
    }
  }

  /**
   * Placeholder previews for other types (Images & PDFs can be previewed directly via client embeds)
   */
  generatePdfPreview(): { previewAvailable: boolean; renderMode: string } {
    return {
      previewAvailable: true,
      renderMode: 'pdf-viewer',
    };
  }

  generateImagePreview(url?: string): { previewAvailable: boolean; renderMode: string; url?: string } {
    return {
      previewAvailable: true,
      renderMode: 'image-element',
      url,
    };
  }
}

export const previewService = new PreviewService();
export default previewService;
