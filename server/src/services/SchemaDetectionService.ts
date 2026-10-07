import { IColumnMetadata } from '../models/DatasetMetadata';

export class SchemaDetectionService {
  /**
   * Infers types and semantic purposes (dimension vs measure) for all columns.
   */
  async detectSchema(cleanedRows: Record<string, any>[]): Promise<{
    columns: IColumnMetadata[];
    dimensions: string[];
    measures: string[];
    logs: string[];
  }> {
    const logs: string[] = [];
    if (cleanedRows.length === 0) {
      return { columns: [], dimensions: [], measures: [], logs: ['Cannot infer schema on empty rows.'] };
    }

    const headers = Object.keys(cleanedRows[0]);
    const columns: IColumnMetadata[] = [];
    const dimensions: string[] = [];
    const measures: string[] = [];

    logs.push(`Detecting schema and variables types for ${headers.length} columns.`);

    headers.forEach((header) => {
      // 1. Gather all non-null values for analysis
      const values = cleanedRows
        .map((row) => row[header])
        .filter((val) => val !== null && val !== undefined);

      const totalValuesCount = values.length;
      if (totalValuesCount === 0) {
        columns.push({
          name: header,
          inferredType: 'unknown',
          dataType: 'string',
          cardinality: 0,
          distinctValuesSample: [],
        });
        return;
      }

      // Calculate cardinality
      const uniqueValues = new Set(values);
      const cardinality = uniqueValues.size;

      // Inferrer rules
      let dataType: 'string' | 'number' | 'date' | 'boolean' = 'string';
      let inferredType: 'dimension' | 'measure' | 'date' | 'boolean' | 'unknown' = 'dimension';

      // Sample distinct values
      const distinctValuesSample = Array.from(uniqueValues).slice(0, 5).map(String);

      // Check Boolean
      const allBooleanLike = values.every((v) => 
        typeof v === 'boolean' || 
        (typeof v === 'string' && ['true', 'false', 'yes', 'no', '1', '0'].includes(v.toLowerCase()))
      );

      // Check Number
      const allNumberLike = values.every((v) => 
        typeof v === 'number' || 
        (typeof v === 'string' && !isNaN(Number(v)))
      );

      // Check Date
      const allDateLike = !allNumberLike && values.every((v) => {
        if (v instanceof Date) return true;
        if (typeof v !== 'string') return false;
        // Basic date format match (e.g. YYYY-MM-DD, MM/DD/YYYY)
        const timestamp = Date.parse(v);
        return !isNaN(timestamp) && v.length > 5 && (v.includes('-') || v.includes('/'));
      });

      if (allBooleanLike) {
        dataType = 'boolean';
        inferredType = 'boolean';
      } else if (allNumberLike) {
        dataType = 'number';
        // Categorical numbers (like Zip codes, IDs, Year) should be treated as Dimensions
        const cardinalityRatio = cardinality / totalValuesCount;
        const isCategoricalId = header.toLowerCase().endsWith('id') || header.toLowerCase().endsWith('code') || header.toLowerCase() === 'year';
        
        if (cardinalityRatio < 0.05 || isCategoricalId) {
          inferredType = 'dimension';
        } else {
          inferredType = 'measure';
          measures.push(header);
        }
      } else if (allDateLike) {
        dataType = 'date';
        inferredType = 'date';
        dimensions.push(header);
      } else {
        dataType = 'string';
        inferredType = 'dimension';
        dimensions.push(header);
      }

      columns.push({
        name: header,
        inferredType,
        dataType,
        cardinality,
        distinctValuesSample,
      });
    });

    logs.push(
      `Schema detection completed. Identified ${dimensions.length} dimensions and ${measures.length} measures.`
    );

    return { columns, dimensions, measures, logs };
  }
}

export const schemaDetectionService = new SchemaDetectionService();
export default schemaDetectionService;
