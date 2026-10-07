import axios from 'axios';

export interface DocumentMetadata {
  _id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  extension: string;
  storageType: 'gridfs' | 'cloudinary';
  fileSize: number;
  uploadDate: string;
  currentVersion: number;
  tags: string[];
  description?: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  _id: string;
  documentId: string;
  version: number;
  uploadedBy: string;
  uploadDate: string;
  GridFSFileId?: string;
  cloudinaryPublicId?: string;
  cloudinaryUrl?: string;
  changeDescription?: string;
}

export interface DatasetMetadata {
  _id: string;
  userId: string;
  documentId: DocumentMetadata;
  datasetName: string;
  sourceType: string;
  schemaStatus: 'pending' | 'mapped';
  processingStatus: 'pending' | 'processed' | 'failed';
  isCombined?: boolean;
  currentVersion?: number;
  freshnessStatus?: string;
  freshnessReason?: string;
  aiStatus?: string;
  schemaVersion?: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SpreadsheetPreview {
  headers: string[];
  rows: Record<string, any>[];
}

export interface WordPreview {
  text: string;
}

export interface GenericPreview {
  previewAvailable: boolean;
  renderMode: 'pdf-viewer' | 'image-element';
  url?: string;
}

export interface DocumentDetails {
  document: DocumentMetadata;
  versions: DocumentVersion[];
}

export interface DocumentPreviewResponse {
  documentId: string;
  filename: string;
  extension: string;
  version: number;
  preview: SpreadsheetPreview | WordPreview | GenericPreview | any;
}

export const documentService = {
  /**
   * Uploads a file with an optional change description and tracking hooks
   */
  uploadDocument: async (
    file: File,
    changeDescription = 'Initial upload',
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<DocumentMetadata> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('changeDescription', changeDescription);

    const res = await axios.post('/api/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return res.data.data;
  },

  /**
   * Lists active or archived documents with filtering and search
   */
  listDocuments: async (params: {
    search?: string;
    extension?: string;
    status?: 'active' | 'archived';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ documents: DocumentMetadata[]; pagination: any }> => {
    const res = await axios.get('/api/documents', { params });
    return res.data.data;
  },

  /**
   * Retrieves detail metadata and version trees
   */
  getDocumentDetails: async (id: string): Promise<DocumentDetails> => {
    const res = await axios.get(`/api/documents/${id}`);
    return res.data.data;
  },

  /**
   * Extracts visual JSON rows or texts
   */
  getDocumentPreview: async (id: string): Promise<DocumentPreviewResponse> => {
    const res = await axios.get(`/api/documents/${id}/preview`);
    return res.data.data;
  },

  /**
   * Updates file details
   */
  updateDocument: async (
    id: string,
    data: { tags?: string[]; description?: string; status?: 'active' | 'archived' }
  ): Promise<DocumentMetadata> => {
    const res = await axios.put(`/api/documents/${id}`, data);
    return res.data.data;
  },

  /**
   * Restores current target to an older history point
   */
  restoreVersion: async (id: string, versionNumber: number): Promise<DocumentMetadata> => {
    const res = await axios.post(`/api/documents/${id}/restore`, { version: versionNumber });
    return res.data.data;
  },

  /**
   * Triggers download of raw original file
   */
  downloadDocumentUrl: (id: string, versionNumber?: number, inline?: boolean): string => {
    const token = localStorage.getItem('auth_token');
    let url = `/api/documents/${id}/download?token=${token}`;
    if (versionNumber) {
      url += `&version=${versionNumber}`;
    }
    if (inline) {
      url += `&inline=true`;
    }
    return url;
  },

  /**
   * Purges file and versions from database
   */
  deleteDocument: async (id: string): Promise<void> => {
    await axios.delete(`/api/documents/${id}`);
  },

  /**
   * Lists datasets
   */
  listDatasets: async (params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ datasets: DatasetMetadata[]; pagination: any }> => {
    const res = await axios.get('/api/datasets', { params });
    return res.data.data;
  },

  /**
   * Retreives details of a dataset
   */
  getDatasetDetails: async (id: string): Promise<DatasetMetadata> => {
    const res = await axios.get(`/api/datasets/${id}`);
    return res.data.data;
  },

  /**
   * Deletes logical dataset reference
   */
  deleteDataset: async (id: string): Promise<void> => {
    await axios.delete(`/api/datasets/${id}`);
  },

  /**
   * Fetches preview rows (first 100 rows) for both single and combined datasets
   */
  getDatasetPreview: async (id: string): Promise<{ headers: string[]; rows: Record<string, any>[] }> => {
    const res = await axios.get(`/api/datasets/${id}/preview`);
    return res.data.data;
  },

  /**
   * Returns CSV export download url path
   */
  exportDatasetCSVUrl: (id: string): string => {
    const token = localStorage.getItem('auth_token');
    return `/api/datasets/${id}/export/csv?token=${encodeURIComponent(token || '')}`;
  },

  /**
   * Returns Excel export download url path
   */
  exportDatasetExcelUrl: (id: string): string => {
    const token = localStorage.getItem('auth_token');
    return `/api/datasets/${id}/export/excel?token=${encodeURIComponent(token || '')}`;
  },

  /**
   * Combined dataset export download urls
   */
  exportCombinedDatasetCSVUrl: (id: string, name?: string): string => {
    const token = localStorage.getItem('auth_token');
    return `/api/combined-datasets/${id}/export/csv?token=${encodeURIComponent(token || '')}&exportFileName=${encodeURIComponent(name || '')}`;
  },
  exportCombinedDatasetExcelUrl: (id: string, name?: string): string => {
    const token = localStorage.getItem('auth_token');
    return `/api/combined-datasets/${id}/export/excel?token=${encodeURIComponent(token || '')}&exportFileName=${encodeURIComponent(name || '')}`;
  },

  /**
   * Analytics report export download urls
   */
  exportCombinedReportCSVUrl: (id: string, name?: string): string => {
    const token = localStorage.getItem('auth_token');
    return `/api/combined-datasets/${id}/export/report/csv?token=${encodeURIComponent(token || '')}&reportFileName=${encodeURIComponent(name || '')}`;
  },
  exportCombinedReportExcelUrl: (id: string, name?: string): string => {
    const token = localStorage.getItem('auth_token');
    return `/api/combined-datasets/${id}/export/report/excel?token=${encodeURIComponent(token || '')}&reportFileName=${encodeURIComponent(name || '')}`;
  },
  exportReportPDFUrl: (id: string): string => {
    const token = localStorage.getItem('auth_token');
    return `/api/reports/${id}/pdf?token=${encodeURIComponent(token || '')}`;
  },
  exportDashboardPDFUrl: (id: string): string => {
    const token = localStorage.getItem('auth_token');
    return `/api/dashboards/${id}/pdf?token=${encodeURIComponent(token || '')}`;
  },
  exportCombinedReportPDFUrl: (id: string, name?: string): string => {
    const token = localStorage.getItem('auth_token');
    return `/api/combined-datasets/${id}/export/report/pdf?token=${encodeURIComponent(token || '')}&reportFileName=${encodeURIComponent(name || '')}`;
  },
  exportCombinedDashboardPDFUrl: (id: string): string => {
    const token = localStorage.getItem('auth_token');
    return `/api/combined-datasets/${id}/export/dashboard/pdf?token=${encodeURIComponent(token || '')}`;
  },
  /**
   * Renames a combined dataset display name
   */
  renameCombinedDataset: async (id: string, datasetName: string): Promise<any> => {
    const res = await axios.patch(`/api/combined-datasets/${id}/rename`, { datasetName });
    return res.data.data;
  }
};
export default documentService;
