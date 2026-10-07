import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentService, DocumentMetadata } from '../services/documentService';
import { 
  Search, Grid, List, Filter, FileSpreadsheet, FileText, 
  Image, ShieldAlert, Trash2, RefreshCw, Upload, Eye
} from 'lucide-react';
import { cn } from '../utils/cn';

export const Documents: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Queries
  const [search, setSearch] = useState('');
  const [extension, setExtension] = useState('');
  const sortBy = 'createdAt';
  const sortOrder = 'desc';
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<'active' | 'archived'>('active');

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const data = await documentService.listDocuments({
        search: search || undefined,
        extension: extension || undefined,
        status,
        page,
        limit: 12,
        sortBy,
        sortOrder,
      });
      setDocuments(data.documents);
      setTotalPages(data.pagination.pages);
    } catch (err) {
      console.error('Failed to retrieve documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [search, extension, sortBy, sortOrder, page, status]);

  const handleDelete = async (id: string) => {
    const confirmationText = 
      "Delete Dataset & Document?\n\n" +
      "Deleting this document will permanently remove:\n" +
      "  • The Uploaded Document & File Files\n" +
      "  • The Associated Logical Dataset\n" +
      "  • All Generated Dashboards, Charts, & Metrics\n" +
      "  • Dataset Suitability Assessments\n" +
      "  • All version history and processing logs\n\n" +
      "This action CANNOT be undone.\n\n" +
      "Are you sure you want to Delete Everything?";

    if (!confirm(confirmationText)) return;
    try {
      await documentService.deleteDocument(id);
      fetchDocuments();
    } catch (err) {
      alert('Failed to delete document.');
    }
  };

  const getFileIcon = (ext: string) => {
    const format = ext.toLowerCase();
    if (['.xlsx', '.csv', '.json'].includes(format)) return <FileSpreadsheet className="h-8 w-8 text-emerald-500" />;
    if (format === '.pdf') return <FileText className="h-8 w-8 text-rose-500" />;
    if (format === '.docx') return <FileText className="h-8 w-8 text-blue-500" />;
    if (['.jpg', '.jpeg', '.png'].includes(format)) return <Image className="h-8 w-8 text-purple-500" />;
    return <FileText className="h-8 w-8 text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Document Explorer</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and preview all structured and unstructured files.</p>
        </div>
        <button
          onClick={() => {
            navigate('/upload');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 text-sm font-semibold shadow-md transition-all self-start sm:self-center"
        >
          <Upload className="h-4 w-4" />
          Upload Document
        </button>
      </div>

      {/* Filter and Explorer Controls */}
      <div className="p-4 rounded-xl border border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          {/* Search bar */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background w-full sm:max-w-xs">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search file name..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="bg-transparent text-sm w-full outline-none"
            />
          </div>

          {/* Extension selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={extension}
              onChange={(e) => { setExtension(e.target.value); setPage(1); }}
              className="bg-transparent text-sm outline-none text-muted-foreground"
            >
              <option value="">All Extensions</option>
              <option value="xlsx">.xlsx</option>
              <option value="csv">.csv</option>
              <option value="json">.json</option>
              <option value="pdf">.pdf</option>
              <option value="docx">.docx</option>
              <option value="png">.png</option>
              <option value="jpg">.jpg</option>
            </select>
          </div>

          {/* Status selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background">
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as any); setPage(1); }}
              className="bg-transparent text-sm outline-none text-muted-foreground"
            >
              <option value="active">Active Documents</option>
              <option value="archived">Archived Documents</option>
            </select>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-border self-end md:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={cn("p-1.5 rounded-lg hover:bg-secondary transition-colors", viewMode === 'grid' && "bg-secondary text-primary")}
            title="Grid View"
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={cn("p-1.5 rounded-lg hover:bg-secondary transition-colors", viewMode === 'table' && "bg-secondary text-primary")}
            title="Table View"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={fetchDocuments}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
            title="Refresh List"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="h-40 rounded-2xl border border-border bg-card animate-pulse p-4 flex flex-col justify-between">
              <div className="h-8 w-8 rounded-lg bg-secondary" />
              <div className="space-y-2">
                <div className="h-4 w-3/4 bg-secondary rounded" />
                <div className="h-3 w-1/2 bg-secondary rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : documents.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-border bg-card text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground mx-auto">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div>
            <h3 className="font-bold text-lg">No documents found</h3>
            <p className="text-sm text-muted-foreground mt-1">Upload a spreadsheet or PDF report to start building your explorer.</p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Layout */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {documents.map((doc) => (
            <div
              key={doc._id}
              className="group p-5 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between h-44 relative"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                  {getFileIcon(doc.extension)}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => navigate(`/documents/${doc._id}`)}
                    className="p-1 rounded bg-secondary text-muted-foreground hover:text-foreground"
                    title="Details"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(doc._id)}
                    className="p-1 rounded bg-secondary text-destructive hover:bg-destructive/10"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-sm truncate" title={doc.originalFilename}>
                  {doc.originalFilename}
                </h3>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{(doc.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                  <span className="font-semibold px-1 rounded bg-secondary">v{doc.currentVersion}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table Layout */
        <div className="border border-border bg-card rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Size</th>
                  <th className="p-4">Version</th>
                  <th className="p-4">Extension</th>
                  <th className="p-4">Upload Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {documents.map((doc) => (
                  <tr key={doc._id} className="hover:bg-secondary/40 transition-colors">
                    <td className="p-4 font-semibold truncate max-w-xs">{doc.originalFilename}</td>
                    <td className="p-4">{(doc.fileSize / 1024 / 1024).toFixed(2)} MB</td>
                    <td className="p-4">v{doc.currentVersion}</td>
                    <td className="p-4 font-mono text-xs uppercase">{doc.extension.replace('.', '')}</td>
                    <td className="p-4 text-muted-foreground">{new Date(doc.uploadDate).toLocaleDateString()}</td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => navigate(`/documents/${doc._id}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-secondary hover:bg-muted-foreground/15 border border-border"
                      >
                        <Eye className="h-3.5 w-3.5" /> Details
                      </button>
                      <button
                        onClick={() => handleDelete(doc._id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"
                        title="Delete File"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
export default Documents;
