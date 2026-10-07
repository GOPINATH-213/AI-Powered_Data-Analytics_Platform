import axios from 'axios';

// Add interceptors to automatically pass Bearer Token
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (err) => Promise.reject(err));

export interface ProcessingJob {
  _id: string;
  datasetId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  logs: string[];
  errors: string[];
  startedAt?: string;
  finishedAt?: string;
}

export interface ColumnMetadata {
  name: string;
  inferredType: 'dimension' | 'measure' | 'date' | 'boolean' | 'unknown';
  dataType: 'string' | 'number' | 'date' | 'boolean';
  cardinality: number;
  distinctValuesSample: string[];
}

export interface DatasetMetadata {
  _id: string;
  datasetId: string;
  detectedColumns: ColumnMetadata[];
  dimensions: string[];
  measures: string[];
  processingLogs: string[];
}

export interface DashboardWidget {
  _id: string;
  dashboardId: string;
  widgetType: 'kpi' | 'chart' | 'filter' | 'details';
  chartType?: 'line' | 'bar' | 'pie' | 'scatter' | 'kpi' | 'histogram';
  position: { x: number; y: number; w: number; h: number };
  configuration: Record<string, any>;
  datasetReference: string;
}

export interface Dashboard {
  _id: string;
  userId: string;
  datasetId: string;
  dashboardName: string;
  layout?: Record<string, any>;
}

export const analyticsService = {
  /**
   * Triggers the multi-stage ingestion and KPI pipeline.
   */
  processDataset: async (datasetId: string): Promise<any> => {
    const res = await axios.post('/api/analytics/process', { datasetId });
    return res.data.data;
  },

  /**
   * Retrieves the current processing job status and logs.
   */
  getJobStatus: async (datasetId: string): Promise<ProcessingJob> => {
    const res = await axios.get(`/api/analytics/status/${datasetId}`);
    return res.data.data;
  },

  /**
   * Loads detected schema columns and metadata.
   */
  getMetadata: async (datasetId: string): Promise<DatasetMetadata> => {
    const res = await axios.get(`/api/analytics/metadata/${datasetId}`);
    return res.data.data;
  },

  /**
   * Lists dashboards owned by this user.
   */
  listDashboards: async (): Promise<Dashboard[]> => {
    const res = await axios.get('/api/dashboards');
    return res.data.data;
  },

  /**
   * Loads dashboard config and widgets.
   */
  getDashboardById: async (id: string): Promise<{ dashboard: Dashboard; widgets: DashboardWidget[] }> => {
    const res = await axios.get(`/api/dashboards/${id}`);
    return res.data.data;
  },

  /**
   * Refreshes dashboard values.
   */
  refreshDashboard: async (id: string): Promise<any> => {
    const res = await axios.post(`/api/dashboards/${id}/refresh`);
    return res.data.data;
  },

  /**
   * Deletes a dashboard and its widgets.
   */
  deleteDashboard: async (id: string): Promise<void> => {
    await axios.delete(`/api/dashboards/${id}`);
  },
};

export default analyticsService;
