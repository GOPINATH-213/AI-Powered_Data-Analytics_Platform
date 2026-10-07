import axios from 'axios';

export interface AssessmentResult {
  _id: string;
  datasetId: string;
  documentVersionId: any;
  documentType: string;
  datasetCategory: 'Business Analytics' | 'Limited Analytics' | 'Not Suitable';
  analyticsReadinessScore: number;
  classificationConfidence: number;
  qualityScore: number;
  scoreBreakdown: Record<string, number>;
  businessDomain: string;
  detectedEntities: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  aiMetadata: {
    suggestedKPIs: string[];
    suggestedDashboardType: string;
    suggestedQuestions: string[];
    suggestedVisualizations: Array<{ metric: string; chartType: string }>;
    potentialForecastTargets: string[];
  };
  assessmentVersion: number;
  assessmentLogs: string[];
  isCombined?: boolean;
  sourceDatasetContributions?: Array<{
    datasetId: string;
    datasetName: string;
    readinessScore: number;
    qualityScore: number;
    contributionPercentage: number;
    relationshipStatus: string;
  }>;
  relationshipDetectionResults?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export const assessmentService = {
  getLatestAssessment: async (datasetId: string): Promise<AssessmentResult> => {
    const res = await axios.get(`/api/dataset-assessment/${datasetId}`);
    return res.data.data;
  },

  recalculateAssessment: async (datasetId: string): Promise<AssessmentResult> => {
    const res = await axios.post('/api/dataset-assessment/recalculate', { datasetId });
    return res.data.data;
  },

  getAssessmentHistory: async (datasetId: string): Promise<AssessmentResult[]> => {
    const res = await axios.get(`/api/dataset-assessment/history/${datasetId}`);
    return res.data.data;
  },

  getAssessmentReportUrl: (datasetId: string): string => {
    const token = localStorage.getItem('auth_token');
    return `/api/dataset-assessment/report/${datasetId}?token=${encodeURIComponent(token || '')}`;
  },

  previewCombineDatasets: async (datasetIds: string[]): Promise<any> => {
    const res = await axios.post('/api/datasets/combine/preview', { datasetIds });
    return res.data.data;
  },

  combineDatasets: async (
    datasetIds: string[], 
    datasetName: string, 
    dashboardName?: string, 
    dashboardCategory?: string
  ): Promise<any> => {
    const res = await axios.post('/api/datasets/combine', { 
      datasetIds, 
      datasetName, 
      dashboardName, 
      dashboardCategory 
    });
    return res.data.data;
  },

  checkDatasetDependencies: async (datasetId: string): Promise<any> => {
    const res = await axios.get(`/api/datasets/${datasetId}/dependencies`);
    return res.data.data;
  }
};

export default assessmentService;
