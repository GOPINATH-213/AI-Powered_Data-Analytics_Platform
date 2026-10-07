import { StructuredQuery } from './AIProviderService';
import { DatasetContext } from './DatasetContextService';
import { ValidationError } from '../utils/errors';

export class AIQueryValidationService {
  /**
   * Validates structured query intent, columns, operations, filters, and limits.
   */
  static validateQueryPlan(
    query: StructuredQuery,
    context: DatasetContext,
    previousSignatures: string[] = []
  ): {
    validatedQuery: StructuredQuery;
    ambiguousColumns?: string[];
  } {
    // 1. Validate Intent & Out-of-scope queries
    if (query.intent === 'OUT_OF_SCOPE') {
      throw new ValidationError(
        "This question is outside the scope of the selected dataset. I can only answer questions about the available data and analytics."
      );
    }

    const allowedIntents = [
      'AGGREGATION',
      'DATASET_OVERVIEW',
      'DISTINCT_VALUES',
      'GROUP_BY',
      'RANKING',
      'FILTER',
      'DATA_PREVIEW'
    ];
    if (!query.intent || !allowedIntents.includes(query.intent)) {
      throw new ValidationError("I couldn't determine how to analyze that question from this dataset.");
    }

    const validated = { ...query };
    const columnTypes = context.columnTypes || {};

    // 2. Resolve & Validate Columns
    if (validated.metric) {
      const match = this.resolveColumnSemantic(validated.metric, context.columns);
      if (match.ambiguousMatches && match.ambiguousMatches.length > 1) {
        return { validatedQuery: validated, ambiguousColumns: match.ambiguousMatches };
      }
      if (match.matchedColumn) {
        validated.metric = match.matchedColumn;
      } else {
        throw new ValidationError(`Column "${validated.metric}" does not exist in this dataset.`);
      }
    }

    if (validated.column) {
      const match = this.resolveColumnSemantic(validated.column, context.columns);
      if (match.ambiguousMatches && match.ambiguousMatches.length > 1) {
        return { validatedQuery: validated, ambiguousColumns: match.ambiguousMatches };
      }
      if (match.matchedColumn) {
        validated.column = match.matchedColumn;
      } else {
        throw new ValidationError(`Column "${validated.column}" does not exist in this dataset.`);
      }
    }

    if (validated.groupBy) {
      const match = this.resolveColumnSemantic(validated.groupBy, context.columns);
      if (match.ambiguousMatches && match.ambiguousMatches.length > 1) {
        return { validatedQuery: validated, ambiguousColumns: match.ambiguousMatches };
      }
      if (match.matchedColumn) {
        validated.groupBy = match.matchedColumn;
      } else {
        throw new ValidationError(`Group by column "${validated.groupBy}" does not exist in this dataset.`);
      }
    }

    // 3. Prevent Inverted Metrics & Dimensions
    if (['AGGREGATION', 'GROUP_BY', 'RANKING'].includes(validated.intent)) {
      if (validated.operation && ['SUM', 'AVERAGE'].includes(validated.operation)) {
        if (validated.metric && columnTypes[validated.metric] && columnTypes[validated.metric] !== 'number') {
          if (validated.groupBy && columnTypes[validated.groupBy] === 'number') {
            const temp = validated.metric;
            validated.metric = validated.groupBy;
            validated.groupBy = temp;
          } else {
            throw new ValidationError(
              `Column "${validated.metric}" is not numeric and cannot be aggregated using ${validated.operation}.`
            );
          }
        }
      }
    }

    // 4. Validate Mandatory RANKING Constraints
    if (validated.intent === 'RANKING') {
      if (!validated.groupBy) {
        const fallbackDim = context.columns.find(c => columnTypes[c] !== 'number');
        if (fallbackDim) {
          validated.groupBy = fallbackDim;
        } else {
          throw new ValidationError('groupBy column is required for RANKING intent.');
        }
      }
      if (!validated.limit) {
        validated.limit = 1;
      }
    }

    // 5. Sanitize and Validate Filters
    if (validated.filters && validated.filters.length > 0) {
      const sanitizedFilters = [];
      for (const filter of validated.filters) {
        const match = this.resolveColumnSemantic(filter.column, context.columns);
        if (match.matchedColumn) {
          filter.column = match.matchedColumn;
        } else {
          throw new ValidationError(`Filter column "${filter.column}" does not exist in this dataset.`);
        }

        const valStr = String(filter.value).trim().toLowerCase();
        if (['is', 'than', 'where', 'records'].includes(valStr)) {
          continue;
        }

        if (columnTypes[filter.column] === 'number' && !isNaN(Number(filter.value))) {
          filter.value = Number(filter.value);
        }

        sanitizedFilters.push(filter);
      }
      validated.filters = sanitizedFilters;
    }

    // 6. Validate Aggregation Operations
    if (validated.intent === 'AGGREGATION') {
      const op = validated.operation || (validated as any).aggregation;
      if (!op) {
        throw new ValidationError('An aggregation operation (SUM, AVERAGE, COUNT, MIN, MAX) is required.');
      }
    }

    // 7. Prevent repeated plans
    const signature = this.calculateSignature(validated);
    if (previousSignatures.includes(signature)) {
      throw new ValidationError('REPEATED_PLAN_DETECTED');
    }

    return { validatedQuery: validated };
  }

  /**
   * Helper to resolve column synonyms or semantic matches.
   */
  private static resolveColumnSemantic(
    col: string,
    columns: string[]
  ): { matchedColumn?: string; ambiguousMatches?: string[] } {
    if (!col) return {};
    const cleanCol = col.toLowerCase().replace(/[^a-z0-9]/g, '');

    const directMatch = columns.find(c => c.toLowerCase() === col.toLowerCase());
    if (directMatch) return { matchedColumn: directMatch };

    const synonyms: Record<string, string[]> = {
      revenue: ['revenue', 'sales', 'total_sales', 'turnover', 'gross_revenue', 'net_revenue'],
      profit: ['profit', 'earnings', 'margin', 'net_profit', 'gross_profit'],
      sales: ['revenue', 'sales', 'total_sales', 'turnover', 'gross_revenue'],
      category: ['category', 'type', 'genre', 'group', 'class'],
      product: ['product', 'item', 'productname', 'product_name', 'product-name'],
      region: ['region', 'area', 'location', 'zone', 'territory']
    };

    let targetSynonyms: string[] = [];
    for (const key in synonyms) {
      if (cleanCol.includes(key) || synonyms[key].includes(cleanCol)) {
        targetSynonyms = targetSynonyms.concat(synonyms[key]);
      }
    }

    const candidateMatches = columns.filter(c => {
      const lc = c.toLowerCase().replace(/[^a-z0-9]/g, '');
      return lc === cleanCol || targetSynonyms.includes(lc);
    });

    if (candidateMatches.length === 1) {
      return { matchedColumn: candidateMatches[0] };
    }
    if (candidateMatches.length > 1) {
      return { ambiguousMatches: candidateMatches };
    }

    const substringMatches = columns.filter(
      c => c.toLowerCase().includes(col.toLowerCase()) || col.toLowerCase().includes(c.toLowerCase())
    );
    if (substringMatches.length === 1) {
      return { matchedColumn: substringMatches[0] };
    }
    if (substringMatches.length > 1) {
      return { ambiguousMatches: substringMatches };
    }

    return {};
  }

  /**
   * Calculates a query signature string for plan identification.
   */
  static calculateSignature(query: StructuredQuery): string {
    return [
      query.intent || 'NONE',
      query.operation || (query as any).aggregation || 'NONE',
      query.metric || 'NONE',
      query.column || 'NONE',
      query.groupBy || 'NONE',
      query.limit || 'NONE',
      query.sort || 'NONE',
      JSON.stringify(query.filters || [])
    ].join('|');
  }

  /**
   * Validate Relevance: Check if query output aligns with expected query intent.
   */
  static validateResponseRelevance(intent: string, result: any): boolean {
    if (intent === 'DISTINCT_VALUES') {
      if (result.resultType !== 'table' || !result.tableData) return false;
      if (result.tableData.length > 0) {
        const sampleKeys = Object.keys(result.tableData[0]);
        if (sampleKeys.length > 2) return false;
      }
    }
    if (intent === 'DATASET_OVERVIEW') {
      if (result.resultType !== 'table' || !result.infoMessage) return false;
      try {
        const stats = JSON.parse(result.infoMessage);
        if (stats.totalRows === undefined || stats.totalCols === undefined) return false;
      } catch (e) {
        return false;
      }
    }
    return true;
  }
}