import PDFDocument from 'pdfkit';
import { Types } from 'mongoose';
import { combinedDatasetRepository } from '../repositories/CombinedDatasetRepository';
import { datasetRepository } from '../repositories/DatasetRepository';
import { documentRepository } from '../repositories/DocumentRepository';
import { dashboardRepository } from '../repositories/DashboardRepository';
import { widgetRepository } from '../repositories/WidgetRepository';
import { datasetAssessmentRepository } from '../repositories/DatasetAssessmentRepository';
import { processingArtifactRepository } from '../repositories/ProcessingArtifactRepository';
import { datasetMetadataRepository } from '../repositories/DatasetMetadataRepository';
import { datasetLoaderService } from './DatasetLoaderService';
import { NotFoundError } from '../utils/errors';

export class ReportExportService {
  /**
   * Loads raw dataset rows from the canonical reference (GridFS or file storage version)
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
   * Aggregates tabular rows by xAxisKey and sums yAxisKey to produce chart plotting data
   */
  aggregateChartData(rows: any[], xAxisKey: string, yAxisKey: string): any[] {
    if (!rows || rows.length === 0 || !xAxisKey || !yAxisKey) return [];

    const groups: Record<string, number> = {};
    rows.forEach(row => {
      const key = String(row[xAxisKey] ?? 'Unknown');
      const val = Number(row[yAxisKey] ?? 0);
      if (!isNaN(val)) {
        groups[key] = (groups[key] || 0) + val;
      }
    });

    return Object.entries(groups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // take top 8 items for clean vector plotting space
  }

  /**
   * Generates a professional PDF document for an Analytics Report.
   */
  async generateAnalyticsReportPDF(datasetId: string, userId: string): Promise<Buffer> {
    let dataset = await datasetRepository.findById(datasetId);
    let combinedDataset = null;
    if (!dataset) {
      combinedDataset = await combinedDatasetRepository.findById(datasetId);
    }
    const currentDataset = dataset || combinedDataset;
    if (!currentDataset) {
      throw new NotFoundError('Dataset reference not found.');
    }

    const rows = await this.loadDatasetRows(currentDataset, userId);

    let assessment = await datasetAssessmentRepository.findLatestByDatasetId(currentDataset._id);
    let dashboard = await dashboardRepository.findOne({ datasetId: currentDataset._id });
    
    let widgets: any[] = [];
    let kpis: any[] = [];
    let statistics: any = {};
    let metadata: any = {};
    let relationships: any[] = [];

    if (combinedDataset) {
      const artifact = await processingArtifactRepository.findLatestByCombinedDatasetId(combinedDataset._id);
      if (artifact) {
        widgets = artifact.dashboardWidgets || [];
        kpis = artifact.KPIs || [];
        statistics = {
          rowCount: artifact.metadata?.rowCount || combinedDataset.mergedRowCount || rows.length,
          columnCount: artifact.metadata?.columnCount || combinedDataset.mergedColumnCount || 0,
          numericCount: artifact.metadata?.numericColumnsCount || 0,
          categoricalCount: artifact.metadata?.categoricalColumnsCount || 0,
          dateCount: artifact.metadata?.dateColumnsCount || 0,
          measures: artifact.metadata?.measures?.length || 0,
          dimensions: artifact.metadata?.dimensions?.length || 0,
        };
        metadata = artifact.metadata || {};
        relationships = artifact.relationshipMap?.relationships || [];
      }
    } else {
      if (dashboard) {
        widgets = await widgetRepository.findByDashboardId(dashboard._id);
        kpis = widgets.filter(w => w.widgetType === 'kpi').map(w => ({
          metricName: w.configuration?.metricName || w.configuration?.title || 'Metric',
          metricValue: w.configuration?.metricValue || w.configuration?.value || 0
        }));
      }
      const dsMeta = await datasetMetadataRepository.findLatestByDatasetId(currentDataset._id);
      if (dsMeta) {
        const columns = dsMeta.detectedColumns || [];
        statistics = {
          rowCount: (currentDataset as any).metadata?.rowCount || rows.length,
          columnCount: columns.length,
          numericCount: columns.filter((c: any) => c.dataType === 'number').length,
          categoricalCount: columns.filter((c: any) => c.dataType === 'string').length,
          dateCount: columns.filter((c: any) => c.dataType === 'date').length,
          measures: dsMeta.measures?.length || 0,
          dimensions: dsMeta.dimensions?.length || 0,
        };
        metadata = columns;
      }
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    // Cover Page
    this.drawCoverPage(doc, currentDataset, dashboard);
    
    // Page 2: Executive Summary
    doc.addPage();
    this.drawHeader(doc, 'Executive Summary');
    this.drawExecutiveSummary(doc, currentDataset, assessment, statistics);

    // Page 3: Key Performance Indicators (KPIs)
    if (kpis.length > 0 || widgets.filter(w => w.widgetType === 'kpi').length > 0) {
      doc.addPage();
      this.drawHeader(doc, 'Key Performance Indicators');
      this.drawKPISection(doc, kpis.length > 0 ? kpis : widgets.filter(w => w.widgetType === 'kpi').map(w => ({
        metricName: w.configuration?.metricName || w.configuration?.title || 'Metric',
        metricValue: w.configuration?.metricValue || w.configuration?.value || 0
      })));
    }

    // Page 4: Visualizations / Charts
    const charts = widgets.filter(w => w.widgetType === 'chart');
    if (charts.length > 0) {
      doc.addPage();
      this.drawHeader(doc, 'Data Visualizations');
      this.drawChartsSection(doc, charts, rows);
    }

    // Page 5: Insights & Recommendations
    if (assessment) {
      doc.addPage();
      this.drawHeader(doc, 'Insights & Strategic Recommendations');
      this.drawInsightsSection(doc, assessment, relationships);
    }

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));
    });
  }

  /**
   * Generates a professional Power BI style PDF document for a Dashboard.
   */
  async generateDashboardPDF(dashboardId: string, userId: string): Promise<Buffer> {
    const dashboard = await dashboardRepository.findById(dashboardId);
    if (!dashboard) {
      throw new NotFoundError('Dashboard not found.');
    }

    let dataset = await datasetRepository.findById(dashboard.datasetId);
    let combinedDataset = null;
    if (!dataset) {
      combinedDataset = await combinedDatasetRepository.findById(dashboard.datasetId);
    }
    const currentDataset = dataset || combinedDataset;
    if (!currentDataset) {
      throw new NotFoundError('Linked dataset reference not found.');
    }

    const rows = await this.loadDatasetRows(currentDataset, userId);

    let widgets: any[] = [];
    if (combinedDataset) {
      const artifact = await processingArtifactRepository.findLatestByCombinedDatasetId(combinedDataset._id);
      if (artifact) {
        widgets = artifact.dashboardWidgets || [];
      }
    } else {
      widgets = await widgetRepository.findByDashboardId(dashboard._id);
    }

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    // Draw landscape style dashboard
    this.drawHeaderLandscape(doc, dashboard.dashboardName, dashboard.dashboardCategory, currentDataset?.datasetName || '');

    // Draw Grid layout widgets with aggregated chart paths
    this.drawDashboardGrid(doc, widgets, rows);

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));
    });
  }

  // --- PDF Kit Draw Helpers ---

  private drawCoverPage(doc: any, dataset: any, dashboard: any) {
    doc.rect(0, 0, 595, 300).fill('#1e293b');

    doc.fillColor('#ffffff')
       .font('Helvetica-Bold')
       .fontSize(24)
       .text('AUTOMATED BUSINESS ANALYTICS REPORT', 50, 100);

    doc.fontSize(14)
       .fillColor('#94a3b8')
       .text(`Consolidated Suitability & Data Health Assessment`, 50, 140);

    doc.fillColor('#1e293b')
       .rect(50, 380, 495, 200)
       .strokeColor('#cbd5e1')
       .lineWidth(1)
       .stroke();

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b').text('REPORT METADATA', 75, 410);

    const drawMetaRow = (label: string, value: string, y: number) => {
      doc.font('Helvetica-Bold').fillColor('#64748b').text(label, 75, y);
      doc.font('Helvetica').fillColor('#0f172a').text(value, 200, y);
    };

    drawMetaRow('Dataset Name:', dataset.datasetName, 440);
    drawMetaRow('Dashboard Name:', dashboard?.dashboardName || 'N/A', 465);
    drawMetaRow('Category:', dashboard?.dashboardCategory || 'General', 490);
    drawMetaRow('Generated Date:', new Date().toLocaleDateString(), 515);
    drawMetaRow('Report Version:', `v${dataset.currentVersion || 1}.0`, 540);

    doc.fontSize(8).fillColor('#94a3b8').text('CONFIDENTIAL • FOR INTERNAL USE ONLY', 50, 750, { align: 'center' });
  }

  private drawHeader(doc: any, title: string) {
    doc.strokeColor('#3b82f6').lineWidth(3).moveTo(50, 40).lineTo(545, 40).stroke();

    doc.fillColor('#0f172a')
       .font('Helvetica-Bold')
       .fontSize(16)
       .text(title, 50, 55);

    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, 80).lineTo(545, 80).stroke();
  }

  private drawHeaderLandscape(doc: any, title: string, category: string, datasetName: string) {
    doc.rect(0, 0, 842, 65).fill('#1e293b');

    doc.fillColor('#ffffff')
       .font('Helvetica-Bold')
       .fontSize(18)
       .text(title.toUpperCase(), 30, 20);

    doc.fontSize(9)
       .fillColor('#3b82f6')
       .text(`CATEGORY: ${category.toUpperCase()}  |  DATASET: ${datasetName.toUpperCase()}`, 30, 43);

    doc.fillColor('#94a3b8')
       .fontSize(8)
       .text(`GEN: ${new Date().toLocaleDateString()}`, 740, 28, { align: 'right', width: 80 });
  }

  private drawExecutiveSummary(doc: any, dataset: any, assessment: any, stats: any) {
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b').text('EXECUTIVE ANALYSIS', 50, 110);
    
    const summaryText = assessment?.executiveSummary || 
      `This report outlines the structural suitability and statistics of dataset "${dataset.datasetName}". Ingestion was completed successfully, and column types have been auto-inferred for future forecasting.`;

    doc.font('Helvetica').fontSize(9.5).fillColor('#334155').text(summaryText, 50, 130, { width: 495, align: 'justify', lineGap: 4 });

    doc.roundedRect(50, 250, 235, 80, 8).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#475569').font('Helvetica-Bold').fontSize(9).text('READINESS SCORE', 65, 265);
    doc.fillColor('#3b82f6').font('Helvetica-Bold').fontSize(22).text(`${assessment?.analyticsReadinessScore || 0}%`, 65, 285);

    doc.roundedRect(310, 250, 235, 80, 8).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#475569').font('Helvetica-Bold').fontSize(9).text('DATA QUALITY SCORE', 325, 265);
    doc.fillColor('#10b981').font('Helvetica-Bold').fontSize(22).text(`${assessment?.qualityScore || 0}%`, 325, 285);

    doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(11).text('DATASET STATISTICS', 50, 365);

    const drawStatBox = (x: number, y: number, label: string, value: string) => {
      doc.roundedRect(x, y, 110, 50, 6).fillAndStroke('#ffffff', '#e2e8f0');
      doc.fillColor('#64748b').font('Helvetica').fontSize(7.5).text(label.toUpperCase(), x + 10, y + 12);
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text(value, x + 10, y + 25);
    };

    drawStatBox(50, 390, 'Total Rows', (stats.rowCount || 0).toLocaleString());
    drawStatBox(175, 390, 'Total Columns', (stats.columnCount || 0).toString());
    drawStatBox(300, 390, 'Measures', (stats.measures || 0).toString());
    drawStatBox(425, 390, 'Dimensions', (stats.dimensions || 0).toString());

    drawStatBox(50, 460, 'Numeric Cols', (stats.numericCount || 0).toString());
    drawStatBox(175, 460, 'Categorical', (stats.categoricalCount || 0).toString());
    drawStatBox(300, 460, 'Date Cols', (stats.dateCount || 0).toString());
    drawStatBox(425, 460, 'Quality Status', assessment?.analyticsReadinessScore >= 50 ? 'SUITABLE' : 'BLOCKED');
  }

  private drawKPISection(doc: any, kpis: any[]) {
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b').text('PRIMARY KEY PERFORMANCE METRICS', 50, 110);

    let y = 140;
    kpis.forEach((kpi, idx) => {
      if (idx > 0 && idx % 3 === 0) {
        y += 90;
      }
      const x = 50 + (idx % 3) * 170;

      doc.roundedRect(x, y, 155, 75, 8).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8.5).text(kpi.metricName.toUpperCase(), x + 15, y + 18, { width: 125, height: 25 });
      
      const valStr = typeof kpi.metricValue === 'number' 
        ? kpi.metricValue.toLocaleString(undefined, { maximumFractionDigits: 2 })
        : String(kpi.metricValue);
        
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(14).text(valStr, x + 15, y + 42);
    });
  }

  private drawChartsSection(doc: any, charts: any[], rows: any[]) {
    let y = 100;
    charts.forEach((chart, idx) => {
      if (idx > 0 && idx % 2 === 0) {
        doc.addPage();
        this.drawHeader(doc, 'Data Visualizations (Cont.)');
        y = 100;
      }

      const title = chart.configuration?.title || chart.configuration?.metricName || 'Chart';
      const xAxisKey = chart.configuration?.xAxisKey || chart.configuration?.xAxis || 'name';
      const yAxisKey = chart.configuration?.yAxisKey || chart.configuration?.yAxis || 'value';
      
      const chartData = this.aggregateChartData(rows, xAxisKey, yAxisKey);

      this.drawVectorChart(doc, 50, y, 495, 230, chartData, title, chart.chartType);
      y += 280;
    });
  }

  private drawVectorChart(doc: any, x: number, y: number, width: number, height: number, data: any[], title: string, chartType: string) {
    doc.roundedRect(x, y, width, height, 10).fillAndStroke('#ffffff', '#e2e8f0');
    doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(11).text(title, x + 20, y + 20);

    const plotX = x + 40;
    const plotY = y + 45;
    const plotW = width - 80;
    const plotH = height - 90;

    doc.strokeColor('#cbd5e1').lineWidth(1)
       .moveTo(plotX, plotY)
       .lineTo(plotX, plotY + plotH)
       .lineTo(plotX + plotW, plotY + plotH)
       .stroke();

    if (!data || data.length === 0) {
      doc.fillColor('#94a3b8').font('Helvetica').fontSize(9).text('Data preview unavailable', plotX + 150, plotY + 40);
      return;
    }

    const values = data.map(d => Number(d.value || d.val || 0));
    const maxVal = Math.max(...values, 1);

    if (chartType === 'bar') {
      const barSpacing = plotW / data.length;
      const barW = Math.min(barSpacing * 0.5, 30);

      data.forEach((d, i) => {
        const val = Number(d.value || d.val || 0);
        const name = String(d.name || d.label || '');
        const barH = (val / maxVal) * (plotH - 15);
        const barX = plotX + (i * barSpacing) + (barSpacing - barW) / 2;
        const barY = plotY + plotH - barH;

        doc.rect(barX, barY, barW, barH).fill('#3b82f6');
        
        doc.fillColor('#64748b').font('Helvetica').fontSize(7)
           .text(name.substring(0, 8), barX - 5, plotY + plotH + 8, { width: barW + 10, align: 'center' });
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(7.5)
           .text(val.toLocaleString(), barX - 5, barY - 12, { width: barW + 10, align: 'center' });
      });
    } else {
      const spacing = plotW / (data.length - 1 || 1);
      doc.strokeColor('#10b981').lineWidth(2);
      
      data.forEach((d, i) => {
        const val = Number(d.value || d.val || 0);
        const px = plotX + i * spacing;
        const py = plotY + plotH - (val / maxVal) * (plotH - 15);

        if (i === 0) {
          doc.moveTo(px, py);
        } else {
          doc.lineTo(px, py);
        }
      });
      doc.stroke();

      data.forEach((d, i) => {
        const val = Number(d.value || d.val || 0);
        const name = String(d.name || d.label || '');
        const px = plotX + i * spacing;
        const py = plotY + plotH - (val / maxVal) * (plotH - 15);

        doc.circle(px, py, 3.5).fill('#10b981');
        
        doc.fillColor('#64748b').font('Helvetica').fontSize(7)
           .text(name.substring(0, 8), px - 15, plotY + plotH + 8, { width: 30, align: 'center' });
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(7)
           .text(val.toLocaleString(), px - 15, py - 12, { width: 30, align: 'center' });
      });
    }
  }

  private drawInsightsSection(doc: any, assessment: any, relationships: any[]) {
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b').text('DETECTED ENTITIES & ATTRIBUTES', 50, 110);

    const entityText = (assessment.detectedEntities || []).join(', ') || 'General Business Metrics';
    doc.font('Helvetica').fontSize(9.5).fillColor('#334155').text(`Entities Found: ${entityText}`, 50, 130);

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b').text('BUSINESS INSIGHTS & RECOMMENDATIONS', 50, 175);
    
    let y = 195;
    (assessment.recommendations || []).forEach((rec: string, idx: number) => {
      doc.fillColor('#3b82f6').font('Helvetica-Bold').fontSize(9.5).text(`•`, 50, y);
      doc.fillColor('#334155').font('Helvetica').fontSize(9.5).text(rec, 65, y, { width: 480 });
      y += 35;
    });

    if (relationships.length > 0) {
      doc.addPage();
      this.drawHeader(doc, 'Consolidated Relationship Map Schema');
      
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b').text('DETECTED JOINS', 50, 110);
      
      let joinY = 140;
      relationships.forEach((rel) => {
        doc.roundedRect(50, joinY, 495, 40, 6).fillAndStroke('#f8fafc', '#cbd5e1');
        const text = `${rel.sourceDatasetName}.${rel.sourceKey} ↔ ${rel.targetDatasetName}.${rel.targetKey} (${rel.qualityScore}% Match)`;
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9).text(text, 65, joinY + 15);
        joinY += 55;
      });
    }
  }

  private drawDashboardGrid(doc: any, widgets: any[], rows: any[]) {
    const kpis = widgets.filter(w => w.widgetType === 'kpi');
    const charts = widgets.filter(w => w.widgetType === 'chart');

    let kpiX = 40;
    kpis.slice(0, 5).forEach((kpi) => {
      const title = kpi.configuration?.metricName || kpi.configuration?.title || 'Metric';
      const val = kpi.configuration?.metricValue || kpi.configuration?.value || 0;

      doc.roundedRect(kpiX, 80, 135, 65, 8).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fillColor('#475569').font('Helvetica-Bold').fontSize(7.5).text(title.toUpperCase(), kpiX + 10, 95, { width: 115 });
      
      const valStr = typeof val === 'number' 
        ? val.toLocaleString(undefined, { maximumFractionDigits: 1 })
        : String(val);
      doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(13).text(valStr, kpiX + 10, 125);

      kpiX += 150;
    });

    let chartY = 165;
    charts.slice(0, 4).forEach((chart, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      
      const cx = 40 + col * 385;
      const cy = chartY + row * 185;

      const title = chart.configuration?.title || chart.configuration?.metricName || 'Visualization';
      const xAxisKey = chart.configuration?.xAxisKey || chart.configuration?.xAxis || 'name';
      const yAxisKey = chart.configuration?.yAxisKey || chart.configuration?.yAxis || 'value';
      
      const chartData = this.aggregateChartData(rows, xAxisKey, yAxisKey);

      this.drawVectorChart(doc, cx, cy, 370, 170, chartData, title, chart.chartType);
    });
  }
}

export const reportExportService = new ReportExportService();
export default reportExportService;
