import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentService, DatasetMetadata } from '../services/documentService';
import { Database, Search, Eye, Trash2, Download, RefreshCw, AlertCircle, Layers } from 'lucide-react';

export const Datasets: React.FC = () => {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchDatasets = async () => {
    setLoading(true);
    try {
      const res = await documentService.listDatasets({
        page,
        limit: 10,
        search: search || undefined,
      });
      setDatasets(res.datasets);
      setTotalPages(res.pagination.pages);
    } catch (err) {
      console.error('Failed to retrieve datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, [page, search]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dataset reference?')) return;
    try {
      await documentService.deleteDataset(id);
      fetchDatasets();
    } catch (err) {
      alert('Failed to delete dataset.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Registered Datasets
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Logical dataset references created automatically from uploaded business documents.
          </p>
        </div>
        <button
          onClick={() => {
            navigate('/datasets/combine');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold rounded-xl shadow-md transition"
        >
          <Layers className="h-4 w-4" />
          Combine Datasets
        </button>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background w-full sm:max-w-xs">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search datasets..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="bg-transparent text-sm w-full outline-none"
          />
        </div>
        <button
          onClick={fetchDatasets}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground self-end sm:self-auto"
          title="Refresh List"
        >
          <RefreshCw className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Dataset Grid List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-16 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : datasets.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-border bg-card text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground mx-auto">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div>
            <h3 className="font-bold text-lg">No datasets registered</h3>
            <p className="text-sm text-muted-foreground mt-1">Upload files on the explorer page to register logical datasets.</p>
          </div>
        </div>
      ) : (
        <div className="border border-border bg-card rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-4">Dataset Name</th>
                  <th className="p-4">Source Format</th>
                  <th className="p-4">Registered Version</th>
                  <th className="p-4">Schema Status</th>
                  <th className="p-4">Freshness Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {datasets.map((set: any) => (
                  <tr key={set._id} className="hover:bg-secondary/40 transition-colors">
                    <td className="p-4">
                      <div>
                        <span className="font-semibold text-foreground block">{set.datasetName}</span>
                        <span className="text-xs text-muted-foreground truncate block max-w-xs">
                          {set.isCombined ? 'Combined Dataset' : (set.documentId?.originalFilename || 'Unlinked')}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-xs uppercase">{set.sourceType}</td>
                    <td className="p-4">v{set.isCombined ? (set.currentVersion || 1) : (set.documentId?.currentVersion || 1)}</td>
                    <td className="p-4">
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 uppercase">
                        {set.schemaStatus}
                      </span>
                    </td>
                    <td className="p-4">
                      {set.freshnessStatus === 'up_to_date' && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          🟢 Up to Date
                        </span>
                      )}
                      {set.freshnessStatus === 'regeneration_required' && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          🟡 Ingestion Required
                        </span>
                      )}
                      {set.freshnessStatus === 'blocked' && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                          🔴 Blocked
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => navigate(`/datasets/${set._id}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-secondary hover:bg-muted-foreground/15 border border-border"
                      >
                        <Eye className="h-3.5 w-3.5" /> Details
                      </button>
                      {set.documentId && (
                        <a
                          href={documentService.downloadDocumentUrl(set.documentId._id)}
                          className="inline-flex p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground border border-border align-middle"
                          title="Download Original File"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(set._id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive align-middle"
                        title="Delete Dataset"
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

      {/* Pagination */}
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
export default Datasets;
