import { DatasetContext } from './DatasetContextService';
import { datasetLoaderService } from './DatasetLoaderService';
import { documentRepository } from '../repositories/DocumentRepository';
import { processingArtifactRepository } from '../repositories/ProcessingArtifactRepository';
import { StructuredQuery } from './AIProviderService';
import { ValidationError } from '../utils/errors';

export function parseNumericValue(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[\$,₹%\s]/g, '').replace(/,/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export class AnalyticsQueryEngine {
  /**
   * Helper to load dataset rows from GridFS / Canonical reference
   */
  async loadDatasetRows(dataset: any, userId: string): Promise<any[]> {
    if (dataset.isCombined || dataset.sourceDatasetIds !== undefined) {
      const artifact = await processingArtifactRepository.findLatestByCombinedDatasetId(dataset._id);
      if (artifact && artifact.cleanedDatasetReference) {
        const loadRes = await datasetLoaderService.loadDatasetByFileId(artifact.cleanedDatasetReference);
        return loadRes.rows;
      }
    } else {
      if (dataset.documentId) {
        const doc = await documentRepository.findById(dataset.documentId._id || dataset.documentId);
        if (doc) {
          const loadRes = await datasetLoaderService.loadDataset(doc._id.toString(), userId, doc.currentVersion);
          return loadRes.rows;
        }
      }
    }
    return [];
  }

  /**
   * Executes the structured query plan on the canonical processed dataset rows.
   */
  async executeQuery(
    dataset: any,
    userId: string,
    query: StructuredQuery,
    context: DatasetContext
  ): Promise<{
    summary: string;
    resultType: 'metric' | 'table' | 'chart' | 'text';
    metricValue?: number | string;
    tableData?: any[];
    chartData?: any[];
    chartConfig?: any;
    truncated: boolean;
    infoMessage?: string;
  }> {
    // 1. Load raw rows
    const rows = await this.loadDatasetRows(dataset, userId);
    if (!rows || rows.length === 0) {
      return {
        summary: 'No data records found in this dataset.',
        resultType: 'text',
        truncated: false
      };
    }

    // 2. Apply Filters
    let filteredRows = [...rows];
    if (query.filters && query.filters.length > 0) {
      query.filters.forEach(filter => {
        const { column, operator, value } = filter;
        if (!column) return;

        filteredRows = filteredRows.filter(row => {
          const rowVal = row[column];
          if (rowVal === undefined || rowVal === null) return false;

          const strRowVal = String(rowVal).toLowerCase();
          const strCompareVal = String(value).toLowerCase();

          switch (operator) {
            case 'EQUALS':
              return strRowVal === strCompareVal;
            case 'GREATER_THAN':
              return Number(rowVal) > Number(value);
            case 'LESS_THAN':
              return Number(rowVal) < Number(value);
            case 'CONTAINS':
              return strRowVal.includes(strCompareVal);
            default:
              return true;
          }
        });
      });
    }

    // 3. Metric Column Validation
    if (query.metric) {
      if (!context.columns.includes(query.metric)) {
        throw new ValidationError(`Column "${query.metric}" does not exist in this dataset.`);
      }

      const operation = query.operation || (query as any).aggregation;
      if (operation && operation !== 'COUNT') {
        const type = String(context.columnTypes[query.metric] || '').toLowerCase();
        const isNumeric = type === 'number' || type === 'numeric' || type === 'integer' || type === 'float';
        if (!isNumeric) {
          const hasNumericValues = filteredRows.some(row => {
            const val = row[query.metric!];
            if (val === undefined || val === null || val === '') return false;
            const cleanVal = String(val).replace(/[\$,₹%\s]/g, '').replace(/,/g, '').trim();
            return !isNaN(Number(cleanVal)) && cleanVal !== '';
          });
          if (!hasNumericValues) {
            throw new ValidationError(`Column "${query.metric}" is not numeric and cannot be aggregated using ${operation}.`);
          }
        }
      }
    }

    const intent = query.intent || 'DATA_PREVIEW';
    const maxTableRows = 50;
    const maxChartCategories = 20;
    const isChart = query.chartType && query.chartType !== 'NONE';
    const targetLimit = query.limit || (isChart ? maxChartCategories : maxTableRows);

    // For RANKING/GROUP_BY, default undefined operations to SUM
    let operation = query.operation || (query as any).aggregation;
    if (!operation && (intent === 'GROUP_BY' || intent === 'RANKING')) {
      operation = 'SUM';
    }

    let resObj: {
      summary: string;
      resultType: 'metric' | 'table' | 'chart' | 'text';
      metricValue?: number | string;
      tableData?: any[];
      chartData?: any[];
      chartConfig?: any;
      truncated: boolean;
      infoMessage?: string;
    };

    switch (intent) {
      case 'DATASET_OVERVIEW': {
        const totalRows = filteredRows.length;
        const totalCols = context.columns.length;

        const numericCols: string[] = [];
        const categoricalCols: string[] = [];
        const dateCols: string[] = [];

        context.columns.forEach(col => {
          const type = String(context.columnTypes[col] || 'string').toLowerCase();
          if (type === 'number' || type === 'numeric' || type === 'integer' || type === 'float') {
            numericCols.push(col);
          } else if (type === 'date' || col.toLowerCase().includes('date') || col.toLowerCase().includes('year')) {
            dateCols.push(col);
          } else {
            categoricalCols.push(col);
          }
        });

        const stats: Record<string, any> = {};
        numericCols.forEach(col => {
          const vals = filteredRows.map(r => parseNumericValue(r[col])).filter(v => !isNaN(v));
          if (vals.length > 0) {
            const sum = vals.reduce((a, b) => a + b, 0);
            stats[col] = {
              sum: Number(sum.toFixed(2)),
              avg: Number((sum / vals.length).toFixed(2)),
              min: Math.min(...vals),
              max: Math.max(...vals)
            };
          }
        });

        const sampleCategories: Record<string, string[]> = {};
        categoricalCols.forEach(col => {
          const uniqueVals = Array.from(new Set(filteredRows.map(r => String(r[col] ?? '')).filter(Boolean)));
          sampleCategories[col] = uniqueVals.slice(0, 10);
        });

        const overviewTable = [
          { Parameter: 'Total Rows', Details: totalRows.toLocaleString() },
          { Parameter: 'Total Columns', Details: totalCols.toString() },
          { Parameter: 'Numeric Columns', Details: numericCols.join(', ') || 'None' },
          { Parameter: 'Categorical Columns', Details: categoricalCols.join(', ') || 'None' },
          { Parameter: 'Date/Temporal Columns', Details: dateCols.join(', ') || 'None' }
        ];

        resObj = {
          summary: `Here is a quick overview of your dataset:\n• ${totalRows} records and ${totalCols} columns.\n• Numeric metrics: ${numericCols.join(', ') || 'None'}\n• Categorical variables: ${categoricalCols.join(', ') || 'None'}`,
          resultType: 'table',
          tableData: overviewTable,
          truncated: false,
          infoMessage: JSON.stringify({
            totalRows,
            totalCols,
            numericCols,
            categoricalCols,
            dateCols,
            stats,
            sampleCategories
          })
        };
        break;
      }

      case 'DISTINCT_VALUES': {
        const targetCol = query.column || query.metric;
        if (!targetCol || !context.columns.includes(targetCol)) {
          throw new ValidationError(`A valid column must be specified to list distinct values.`);
        }
        const uniqueValues = Array.from(new Set(filteredRows.map(r => r[targetCol]).filter(v => v !== undefined && v !== null && v !== '')));
        const tableData = uniqueValues.map(v => ({ [targetCol]: v }));
        resObj = {
          summary: `Found ${uniqueValues.length} unique values for "${targetCol}".`,
          resultType: 'table',
          tableData,
          truncated: false
        };
        break;
      }

      case 'GROUP_BY':
      case 'RANKING': {
        const groupCol = query.groupBy;
        if (!groupCol || !context.columns.includes(groupCol)) {
          throw new ValidationError(`groupBy column is required for ${intent} intent.`);
        }
        const metricCol = query.metric || groupCol;

        const groupedMap: Record<string, { values: number[]; count: number }> = {};
        filteredRows.forEach(row => {
          const key = String(row[groupCol] ?? 'Unknown');
          const val = parseNumericValue(row[metricCol]);
          if (!groupedMap[key]) {
            groupedMap[key] = { values: [], count: 0 };
          }
          groupedMap[key].values.push(val);
          groupedMap[key].count += 1;
        });

        let results = Object.keys(groupedMap).map(key => {
          const item = groupedMap[key];
          let aggValue = 0;
          switch (operation) {
            case 'AVERAGE': {
              const sum = item.values.reduce((a, b) => a + b, 0);
              aggValue = item.count > 0 ? Number((sum / item.count).toFixed(2)) : 0;
              break;
            }
            case 'COUNT': {
              aggValue = item.count;
              break;
            }
            case 'MIN': {
              aggValue = item.values.length > 0 ? Math.min(...item.values) : 0;
              break;
            }
            case 'MAX': {
              aggValue = item.values.length > 0 ? Math.max(...item.values) : 0;
              break;
            }
            case 'SUM':
            default: {
              aggValue = Number(item.values.reduce((a, b) => a + b, 0).toFixed(2));
              break;
            }
          }
          return {
            [groupCol]: key,
            [metricCol]: aggValue
          };
        });

        const sortDirection = query.sort || (intent === 'RANKING' ? 'DESC' : 'DESC');
        results.sort((a, b) => {
          const valA = a[metricCol];
          const valB = b[metricCol];
          if (typeof valA === 'number' && typeof valB === 'number') {
            return sortDirection === 'DESC' ? valB - valA : valA - valB;
          }
          return sortDirection === 'DESC'
            ? String(valB).localeCompare(String(valA))
            : String(valA).localeCompare(String(valB));
        });

        const totalCount = results.length;
        const truncated = totalCount > targetLimit;
        const finalResults = results.slice(0, targetLimit);
        const infoMessage = truncated ? `Showing top ${targetLimit} of ${totalCount} records.` : '';

        if (isChart) {
          resObj = {
            summary: `Aggregated ${operation || 'SUM'} of ${metricCol} grouped by ${groupCol}.`,
            resultType: 'chart',
            chartData: finalResults,
            chartConfig: {
              chartType: String(query.chartType).toLowerCase(),
              xAxisKey: groupCol,
              yAxisKey: metricCol,
              title: `${operation || 'Total'} ${metricCol} by ${groupCol}`
            },
            truncated,
            infoMessage
          };
        } else {
          resObj = {
            summary: `Table list of ${metricCol} grouped by ${groupCol}.`,
            resultType: 'table',
            tableData: finalResults,
            truncated,
            infoMessage
          };
        }
        break;
      }

      case 'AGGREGATION': {
        const metricCol = query.metric;
        if (!metricCol) {
          throw new ValidationError(`Metric column is required for AGGREGATION intent.`);
        }
        const numericValues = filteredRows.map(row => parseNumericValue(row[metricCol])).filter(v => !isNaN(v));
        let metricValue: number = 0;
        switch (operation) {
          case 'AVERAGE': {
            const sum = numericValues.reduce((a, b) => a + b, 0);
            metricValue = numericValues.length > 0 ? Number((sum / numericValues.length).toFixed(2)) : 0;
            break;
          }
          case 'COUNT': {
            metricValue = filteredRows.length;
            break;
          }
          case 'MIN': {
            metricValue = numericValues.length > 0 ? Math.min(...numericValues) : 0;
            break;
          }
          case 'MAX': {
            metricValue = numericValues.length > 0 ? Math.max(...numericValues) : 0;
            break;
          }
          case 'SUM':
          default: {
            metricValue = Number(numericValues.reduce((a, b) => a + b, 0).toFixed(2));
            break;
          }
        }

        resObj = {
          summary: `Calculated ${operation || 'SUM'} of ${metricCol} is ${metricValue.toLocaleString()}`,
          resultType: 'metric',
          metricValue,
          truncated: false
        };
        break;
      }

      case 'FILTER':
      case 'DATA_PREVIEW':
      default: {
        const truncated = filteredRows.length > targetLimit;
        const tableData = filteredRows.slice(0, targetLimit).map(r => {
          const formatted: Record<string, any> = {};
          context.columns.forEach(c => {
            formatted[c] = r[c];
          });
          return formatted;
        });

        resObj = {
          summary: intent === 'FILTER'
            ? `Filtered view showing ${tableData.length} matching records.`
            : `Showing preview of ${tableData.length} records.`,
          resultType: 'table',
          tableData,
          truncated,
          infoMessage: truncated ? `Showing first ${targetLimit} of ${filteredRows.length} rows.` : ''
        };
        break;
      }
    }

    return resObj;
  }
}

export const analyticsQueryEngine = new AnalyticsQueryEngine();
export default analyticsQueryEngine;