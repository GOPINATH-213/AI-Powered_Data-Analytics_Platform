import { IColumnMetadata } from '../models/DatasetMetadata';

export interface VisualRecommendation {
  widgetType: 'kpi' | 'chart';
  chartType?: 'line' | 'bar' | 'pie' | 'scatter' | 'kpi' | 'histogram';
  title: string;
  confidence: number;
  reason: string;
  configuration: Record<string, any>;
}

export class VisualizationRecommendationService {
  /**
   * Recommends visualizations by analyzing dataset column datatypes and distinct value bounds.
   */
  async recommendVisualizations(
    columns: IColumnMetadata[],
    calculatedKPIs: { name: string; value: number }[]
  ): Promise<{ recommendations: VisualRecommendation[]; logs: string[] }> {
    const logs: string[] = [];
    const recommendations: VisualRecommendation[] = [];

    logs.push('Running Chart Recommendation Engine.');

    // 1. Add KPI Cards
    calculatedKPIs.forEach((kpi) => {
      recommendations.push({
        widgetType: 'kpi',
        chartType: 'kpi',
        title: kpi.name,
        confidence: 0.95,
        reason: `Business metrics "${kpi.name}" was extracted successfully.`,
        configuration: {
          metricName: kpi.name,
          metricValue: kpi.value,
        },
      });
    });

    // Extract categories, dates, and measures
    const dateCols = columns.filter((c) => c.inferredType === 'date');
    const measureCols = columns.filter((c) => c.inferredType === 'measure');
    const categoryCols = columns.filter((c) => c.inferredType === 'dimension' && c.dataType === 'string' && c.cardinality > 1 && c.cardinality <= 15);

    // Recommendation Rule A: Time Series (Date + Measure) -> Line Chart
    if (dateCols.length > 0 && measureCols.length > 0) {
      const dateCol = dateCols[0];
      const measureCol = measureCols[0];

      recommendations.push({
        widgetType: 'chart',
        chartType: 'line',
        title: `${measureCol.name} Over Time`,
        confidence: 0.9,
        reason: `Found date dimension "${dateCol.name}" and numeric measure "${measureCol.name}" indicating temporal trends.`,
        configuration: {
          xAxisKey: dateCol.name,
          yAxisKey: measureCol.name,
        },
      });
      logs.push(`Recommended Line Chart: ${measureCol.name} over ${dateCol.name}.`);
    }

    // Recommendation Rule B: Category Comparison (Category + Measure) -> Bar Chart
    if (categoryCols.length > 0 && measureCols.length > 0) {
      const categoryCol = categoryCols[0];
      const measureCol = measureCols[0];

      recommendations.push({
        widgetType: 'chart',
        chartType: 'bar',
        title: `${measureCol.name} by ${categoryCol.name}`,
        confidence: 0.85,
        reason: `Categorical dimension "${categoryCol.name}" (cardinality: ${categoryCol.cardinality}) paired with measure "${measureCol.name}" maps optimally to category comparison.`,
        configuration: {
          xAxisKey: categoryCol.name,
          yAxisKey: measureCol.name,
        },
      });
      logs.push(`Recommended Bar Chart: ${measureCol.name} by ${categoryCol.name}.`);
    }

    // Recommendation Rule C: Part-to-Whole (Low Cardinality Category + Measure) -> Pie / Donut
    const pieCategory = categoryCols.find((c) => c.cardinality >= 2 && c.cardinality <= 5);
    if (pieCategory && measureCols.length > 0) {
      const measureCol = measureCols[0];
      recommendations.push({
        widgetType: 'chart',
        chartType: 'pie',
        title: `${measureCol.name} Distribution by ${pieCategory.name}`,
        confidence: 0.75,
        reason: `Category "${pieCategory.name}" has low cardinality (${pieCategory.cardinality}), ideal for displaying part-to-whole segmentations.`,
        configuration: {
          nameKey: pieCategory.name,
          valueKey: measureCol.name,
        },
      });
      logs.push(`Recommended Pie Chart: ${measureCol.name} distribution across ${pieCategory.name}.`);
    }

    // Recommendation Rule D: Correlation (Two Measures) -> Scatter Plot
    if (measureCols.length >= 2) {
      const xCol = measureCols[0];
      const yCol = measureCols[1];

      recommendations.push({
        widgetType: 'chart',
        chartType: 'scatter',
        title: `${xCol.name} vs ${yCol.name} Correlation`,
        confidence: 0.7,
        reason: `Detected multiple numeric measures ("${xCol.name}" and "${yCol.name}") suitable for visual correlation mapping.`,
        configuration: {
          xAxisKey: xCol.name,
          yAxisKey: yCol.name,
        },
      });
      logs.push(`Recommended Scatter Plot: Correlation between ${xCol.name} and ${yCol.name}.`);
    }

    // Fallback if no charts can be recommended: Recommend a simple interactive table
    if (recommendations.length === 0) {
      recommendations.push({
        widgetType: 'chart',
        chartType: 'bar',
        title: 'Records Count summary',
        confidence: 0.5,
        reason: 'Default tabular metric representation fallback.',
        configuration: {
          xAxisKey: columns[0]?.name || 'index',
          yAxisKey: 'count',
        },
      });
    }

    return { recommendations, logs };
  }
}

export const visualizationRecommendationService = new VisualizationRecommendationService();
export default visualizationRecommendationService;
