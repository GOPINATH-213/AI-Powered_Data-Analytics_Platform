import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { analyticsService, Dashboard, DashboardWidget as WidgetType } from '../services/analyticsService';
import { documentService } from '../services/documentService';
import { DashboardWidget } from '../components/DashboardWidget';
import { 
  RefreshCw, ArrowLeft, Loader2, AlertCircle, ToggleLeft, ToggleRight, Download, Sparkles 
} from 'lucide-react';
import { cn } from '../utils/cn';
import { exportElementToPDF } from '../utils/pdfExport';
import LoadingOverlay from '../components/LoadingOverlay';
import { getFriendlyErrorMessage } from '../utils/userMessageService';

export const DashboardViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [widgets, setWidgets] = useState<WidgetType[]>([]);
  const [datasetRows, setDatasetRows] = useState<Record<string, any>[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [blockedDatasetId, setBlockedDatasetId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgressMsg, setExportProgressMsg] = useState('');

  useEffect(() => {
    if (!loading && dashboard && searchParams.get('download') === 'pdf') {
      handleExportPDF();
    }
  }, [loading, dashboard, searchParams]);

  const fetchDashboardDetails = async () => {
    if (!id) return;
    try {
      setErrorMsg(null);
      setBlockedDatasetId(null);
      const data = await analyticsService.getDashboardById(id);
      setDashboard(data.dashboard);
      setWidgets(data.widgets);

      // Load matching source rows preview using generic getDatasetPreview
      if (data.dashboard.datasetId) {
        const datasetIdVal = (data.dashboard.datasetId as any)._id || data.dashboard.datasetId;
        const docRes = await documentService.getDatasetPreview(datasetIdVal.toString());
        setDatasetRows(docRes.rows || []);
      }
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      const msg = err.response?.data?.message || 'Failed to load dashboard.';
      setErrorMsg(msg);
      const parts = msg.split('DatasetId:');
      if (parts.length > 1) {
        setBlockedDatasetId(parts[1].trim());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchDashboardDetails();
  }, [id]);

  // Auto-refresh hook
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (autoRefresh && id) {
      timer = setInterval(() => {
        handleRefresh();
      }, 15000); // 15 seconds auto poll
    }
    return () => clearInterval(timer);
  }, [autoRefresh, id]);

  const handleRefresh = async () => {
    if (!id) return;
    setRefreshing(true);
    try {
      await analyticsService.refreshDashboard(id);
      await fetchDashboardDetails();
    } catch (err) {
      console.error('Failed to refresh metrics:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const goBack = () => {
    navigate('/dashboard');
  };

  const handleExportPDF = async () => {
    if (!dashboard) return;
    setExporting(true);
    setExportProgressMsg('Initializing Dashboard Capture...');
    try {
      const statsObj = {
        rowCount: datasetRows.length,
        columnCount: datasetRows.length > 0 ? Object.keys(datasetRows[0]).length : 0,
        measures: widgets.filter(w => w.widgetType === 'chart').length,
        dimensions: widgets.filter(w => w.widgetType === 'kpi').length,
      };

      const kpisList = widgets.filter(w => w.widgetType === 'kpi').map(w => ({
        name: w.configuration?.metricName || w.configuration?.title || 'Metric',
        value: w.configuration?.metricValue || w.configuration?.value || 0
      }));

      const metadata = {
        datasetName: (dashboard.datasetId as any)?.datasetName || 'Dataset Ingest Source',
        dashboardName: dashboard.dashboardName,
        category: (dashboard as any).dashboardCategory || 'General',
        businessDomain: 'Interactive Analytics Dashboard',
        readinessScore: 90,
        qualityScore: 95,
        version: '1',
        statistics: statsObj,
        kpis: kpisList
      };

      await exportElementToPDF(
        'dashboard-printable-view', 
        `Dashboard_${dashboard.dashboardName}`, 
        true, 
        metadata,
        (msg) => setExportProgressMsg(msg)
      );
    } catch (error) {
      const friendly = getFriendlyErrorMessage(error);
      alert(`${friendly.message}\n\nReference ID: ${friendly.refId}`);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading interactive dashboard...</p>
      </div>
    );
  }

  if (errorMsg) {
    const isBlocked = errorMsg.includes('Access Blocked');
    return (
      <div className="p-12 text-center max-w-lg mx-auto space-y-6">
        <div className="h-16 w-16 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mx-auto border border-rose-500/20">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h3 className="font-extrabold text-2xl tracking-tight text-foreground text-rose-600">Dashboard Access Blocked</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
            {errorMsg.split('DatasetId:')[0]}
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <button 
            onClick={() => navigate('/datasets')}
            className="px-4 py-2 border border-border hover:bg-secondary rounded-xl text-sm font-semibold transition"
          >
            Back to Datasets
          </button>
          {isBlocked && blockedDatasetId && (
            <button 
              onClick={() => navigate(`/dataset-assessment/${blockedDatasetId}`)}
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl text-sm font-semibold transition"
            >
              View Suitability Report
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="p-6 rounded-2xl border border-destructive/20 bg-destructive/5 text-destructive text-center max-w-md mx-auto space-y-4">
        <AlertCircle className="h-10 w-10 mx-auto" />
        <h3 className="font-bold text-lg">Dashboard Not Found</h3>
        <button onClick={goBack} className="px-4 py-2 bg-secondary text-foreground hover:bg-secondary/80 rounded-xl text-sm font-semibold">
          Back to Dashboards
        </button>
      </div>
    );
  }

  const kpiWidgets = widgets.filter(w => w.widgetType === 'kpi');
  const chartWidgets = widgets.filter(w => w.widgetType === 'chart');

  return (
    <div id="dashboard-printable-view" className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="p-1.5 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground no-print-pdf"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{dashboard.dashboardName}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Logical Dataset Ingestion Source: <span className="font-semibold">{(dashboard.datasetId as any)?.datasetName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 self-end sm:self-auto no-print-pdf">
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            {autoRefresh ? (
              <ToggleRight className="h-6 w-6 text-primary" />
            ) : (
              <ToggleLeft className="h-6 w-6 text-muted-foreground" />
            )}
            Auto Refresh (15s)
          </button>

          {/* Export Actions */}
          <button
            onClick={() => navigate(`/ai-analytics/${(dashboard.datasetId as any)?._id || dashboard.datasetId}`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-sm transition hover:scale-[1.01] active:scale-[0.99]"
            title="Ask AI About This Dashboard"
          >
            <Sparkles className="h-3.5 w-3.5" /> Ask AI
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-sm transition"
            title="Download Dashboard PDF"
          >
            <Download className="h-3.5 w-3.5" /> Download PDF
          </button>

          {/* Refresh Action */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-secondary text-xs font-semibold disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Recalculate
          </button>
        </div>
      </div>

      {/* KPI Tiles row grid */}
      {kpiWidgets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {kpiWidgets.map(widget => (
            <div key={widget._id} style={{ gridColumn: `span ${widget.position.w === 3 ? 1 : 2}` }}>
              <DashboardWidget widget={widget} data={datasetRows} />
            </div>
          ))}
        </div>
      )}

      {/* Visual Chart structures */}
      {chartWidgets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {chartWidgets.map(widget => (
            <div key={widget._id} className="h-[380px]">
              <DashboardWidget widget={widget} data={datasetRows} />
            </div>
          ))}
        </div>
      )}
      <LoadingOverlay isVisible={exporting} message={exportProgressMsg} />
    </div>
  );
};
export default DashboardViewer;
