import { dashboardRepository } from '../repositories/DashboardRepository';
import { widgetRepository } from '../repositories/WidgetRepository';
import { dashboardMetricRepository } from '../repositories/DashboardMetricRepository';
import { datasetRepository } from '../repositories/DatasetRepository';
import { VisualRecommendation } from './VisualizationRecommendationService';
import { IDashboard } from '../models/Dashboard';
import { Types } from 'mongoose';

export class DashboardGenerationService {
  /**
   * Builds the dashboard record and writes recommended widgets.
   */
  async generateDashboard(
    userId: string,
    datasetId: Types.ObjectId,
    datasetName: string,
    recommendations: VisualRecommendation[],
    versionNumber: number
  ): Promise<IDashboard> {
    // 1. Create or Find existing Dashboard
    let dashboard = await dashboardRepository.findOne({ datasetId, userId });

    if (!dashboard) {
      dashboard = await dashboardRepository.create({
        userId,
        datasetId,
        dashboardName: `${datasetName.replace(' Dataset', '')} Dashboard`,
        layout: { columns: 12 },
        currentVersion: versionNumber,
      });
    } else {
      dashboard.currentVersion = versionNumber;
      await dashboard.save();
    }

    const ds = await datasetRepository.findById(datasetId.toString());
    if (ds) {
      if (!ds.dashboardIds) ds.dashboardIds = [];
      if (!ds.dashboardIds.some((id) => id.toString() === dashboard?._id.toString())) {
        ds.dashboardIds.push(dashboard?._id as any);
        await ds.save();
      }
    }

    // 2. Clear previous widgets for this dashboard
    await widgetRepository.deleteByDashboardId(dashboard._id as Types.ObjectId);
    await dashboardMetricRepository.deleteByDashboardId(dashboard._id as Types.ObjectId);

    // 3. Write new Widgets and Metrics
    let xOffset = 0;
    let yOffset = 0;

    for (const rec of recommendations) {
      // KPI widget vs Chart widget sizes
      const w = rec.widgetType === 'kpi' ? 3 : 6;
      const h = rec.widgetType === 'kpi' ? 2 : 4;

      // Layout coordinate math
      if (xOffset + w > 12) {
        xOffset = 0;
        yOffset += h;
      }

      await widgetRepository.create({
        dashboardId: dashboard._id as Types.ObjectId,
        widgetType: rec.widgetType,
        chartType: rec.chartType,
        position: { x: xOffset, y: yOffset, w, h },
        configuration: rec.configuration,
        datasetReference: datasetId,
      });

      // If it's a KPI widget, also upsert it into the pre-calculated metrics list
      if (rec.widgetType === 'kpi' && rec.configuration.metricName) {
        await dashboardMetricRepository.upsert(
          dashboard._id as Types.ObjectId,
          rec.configuration.metricName,
          rec.configuration.metricValue,
          'SUM_DISTINCT_RULE'
        );
      }

      xOffset += w;
    }

    return dashboard;
  }

  /**
   * Refreshes dashboard data on version upgrades. If schemas are identical, only updates values.
   */
  async refreshDashboard(
    dashboardId: Types.ObjectId,
    cleanedRows: Record<string, any>[],
    columnsList: string[],
    kpis: { name: string; value: number }[],
    versionNumber?: number
  ) {
    // Recalculate KPIs and update metrics
    for (const kpi of kpis) {
      await dashboardMetricRepository.upsert(
        dashboardId,
        kpi.name,
        kpi.value,
        'SUM_DISTINCT_RULE'
      );
    }

    // Find and update KPI widgets configuration value
    const widgets = await widgetRepository.findByDashboardId(dashboardId);
    for (const widget of widgets) {
      if (widget.widgetType === 'kpi' && widget.configuration.metricName) {
        const matchingKpi = kpis.find((k) => k.name === widget.configuration.metricName);
        if (matchingKpi) {
          widget.configuration = {
            ...widget.configuration,
            metricValue: matchingKpi.value,
          };
          widget.markModified('configuration');
          await widget.save();
        }
      }
    }

    // Save dashboard version tracking
    if (versionNumber) {
      await dashboardRepository.update(dashboardId, { currentVersion: versionNumber });
    }
  }
}

export const dashboardGenerationService = new DashboardGenerationService();
export default dashboardGenerationService;
