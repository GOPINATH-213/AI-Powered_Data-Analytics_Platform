export class DataCleaningService {
  /**
   * Cleans raw row objects: header normalizations, whitespaces, empty rows/columns, currencies, duplicates.
   */
  async cleanData(rawRows: Record<string, any>[]): Promise<{ cleanedRows: Record<string, any>[]; logs: string[] }> {
    const logs: string[] = [];
    if (rawRows.length === 0) {
      return { cleanedRows: [], logs: ['Empty dataset provided.'] };
    }

    logs.push(`Starting data cleaning on ${rawRows.length} raw records.`);

    // 1. Normalize Headers
    const rawKeys = Object.keys(rawRows[0]);
    const normalizedHeaderMap: Record<string, string> = {};
    rawKeys.forEach((key) => {
      // Trim and remove special characters from header keys
      const cleanKey = key.trim().replace(/[\s\.]+/g, '_');
      normalizedHeaderMap[key] = cleanKey;
    });
    logs.push('Headers normalized to standard alphanumeric snake_case.');

    // 2. Clean Row Values & Normalizations
    let cleaned: Record<string, any>[] = [];
    const duplicateTracker = new Set<string>();
    let duplicateCount = 0;
    let emptyRowsCount = 0;

    rawRows.forEach((row) => {
      const cleanRow: Record<string, any> = {};
      let isEmpty = true;

      Object.keys(row).forEach((key) => {
        const normalizedKey = normalizedHeaderMap[key] || key;
        let value = row[key];

        // Format dates or parse Excel serial numbers
        if (normalizedKey.toLowerCase().includes('date') || key.toLowerCase().includes('date')) {
          console.log(`[Date Debug] Match: key=${key}, norm=${normalizedKey}, val=${value}, type=${typeof value}`);
          if (value instanceof Date) {
            const yyyy = value.getFullYear();
            const mm = String(value.getMonth() + 1).padStart(2, '0');
            const dd = String(value.getDate()).padStart(2, '0');
            value = `${yyyy}-${mm}-${dd}`;
            console.log(`[Date Debug] Date object formatted: ${value}`);
          } else if (value !== null && value !== undefined && !isNaN(Number(value))) {
            const num = Number(value);
            if (num >= 35000 && num <= 60000) {
              const epoch = new Date(1899, 11, 30);
              const dateObj = new Date(epoch.getTime() + num * 86400000);
              const yyyy = dateObj.getFullYear();
              const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
              const dd = String(dateObj.getDate()).padStart(2, '0');
              value = `${yyyy}-${mm}-${dd}`;
              console.log(`[Date Debug] Serial number converted: ${value}`);
            }
          }
        }

        // Trim string whitespace
        if (typeof value === 'string') {
          value = value.trim();
          
          // Detect Currency symbols and parse to clean numbers
          if (/^\s*[\$\€\£\¥]\s*-?[\d,]+(\.\d+)?\s*$/.test(value)) {
            const cleanNum = value.replace(/[\$\€\£\¥\s,]/g, '');
            value = parseFloat(cleanNum);
          }
          // Detect Percentage values
          else if (/^\s*-?[\d,]+(\.\d+)?\s*%\s*$/.test(value)) {
            const cleanNum = value.replace(/[\s,%]/g, '');
            value = parseFloat(cleanNum) / 100; // Standardize 75% -> 0.75
          }
          // Empty strings are treated as null
          else if (value === '') {
            value = null;
          }
        }

        if (value !== null && value !== undefined) {
          isEmpty = false;
        }

        cleanRow[normalizedKey] = value;
      });

      if (isEmpty) {
        emptyRowsCount++;
        return; // Skip empty rows
      }

      // Check Duplicates
      const rowHash = JSON.stringify(cleanRow);
      if (duplicateTracker.has(rowHash)) {
        duplicateCount++;
        return; // Skip duplicate rows
      }
      duplicateTracker.add(rowHash);

      cleaned.push(cleanRow);
    });

    if (emptyRowsCount > 0) {
      logs.push(`Removed ${emptyRowsCount} completely empty rows.`);
    }
    if (duplicateCount > 0) {
      logs.push(`Filtered out ${duplicateCount} duplicate records.`);
    }

    // 3. Filter Empty Columns
    if (cleaned.length > 0) {
      const headers = Object.keys(cleaned[0]);
      const columnsToRemove: string[] = [];

      headers.forEach((header) => {
        const allNull = cleaned.every((row) => row[header] === null || row[header] === undefined);
        if (allNull) {
          columnsToRemove.push(header);
        }
      });

      if (columnsToRemove.length > 0) {
        cleaned = cleaned.map((row) => {
          const newRow = { ...row };
          columnsToRemove.forEach((col) => delete newRow[col]);
          return newRow;
        });
        logs.push(`Removed ${columnsToRemove.length} empty columns: [${columnsToRemove.join(', ')}].`);
      }
    }

    logs.push(`Data cleaning completed successfully. ${cleaned.length} records preserved.`);
    return { cleanedRows: cleaned, logs };
  }
}

export const dataCleaningService = new DataCleaningService();
export default dataCleaningService;
