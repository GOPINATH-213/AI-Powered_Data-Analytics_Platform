import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { documentService } from '../services/documentService';
import { 
  ArrowLeft, RefreshCw, Trash2, Database, Layers, Network, 
  ArrowRight, ShieldAlert, Download, Sparkles
} from 'lucide-react';

export const CombinedDatasetManager: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dataset, setDataset] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [reportFileName, setReportFileName] = useState('');

  const handleRename = async () => {
    if (!editedName.trim() || editedName.length > 100) {
      alert('Please enter a valid dataset name (1-100 characters).');
      return;
    }
    setSavingName(true);
    try {
      await documentService.renameCombinedDataset(id!, editedName.trim());
      setDataset((prev: any) => prev ? { ...prev, datasetName: editedName.trim() } : null);
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to rename dataset:', err);
      alert('Failed to rename combined dataset.');
    } finally {
      setSavingName(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await documentService.getDatasetDetails(id);
      setDataset(data);
    } catch (err) {
      console.error('Failed to load combined dataset details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!id) return;
    setRefreshing(true);
    try {
      // Re-run the Ingestion pipeline
      navigate(`/analytics/${id}`);
    } catch (err) {
      console.error('Failed to refresh combined dataset:', err);
      alert('Failed to refresh.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !dataset) return;
    const confirmMsg = 
      "Archive/Delete Combined Dataset?\n\n" +
      "This will permanently delete this combined logical dataset and its generated dashboards.\n" +
      "Note: Source datasets will remain completely unchanged.\n\n" +
      "Do you want to proceed?";

    if (!confirm(confirmMsg)) return;
    setArchiving(true);
    try {
      await documentService.deleteDataset(id);
      navigate('/datasets');
    } catch (err) {
      console.error('Failed to delete dataset:', err);
      alert('Failed to delete combined dataset.');
    } finally {
      setArchiving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-4">
        <RefreshCw className="h-10 w-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-semibold">Loading combined dataset settings...</p>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
        <h3 className="font-extrabold text-xl">Dataset Not Found</h3>
        <p className="text-sm text-muted-foreground">The requested combined dataset details do not exist.</p>
      </div>
    );
  }

  const isReady = dataset.processingStatus === 'processed' || dataset.processingStatus === 'Completed';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            {isEditingName ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary w-64"
                  maxLength={100}
                  disabled={savingName}
                />
                <button
                  onClick={handleRename}
                  disabled={savingName}
                  className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/95 disabled:opacity-50"
                >
                  {savingName ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  disabled={savingName}
                  className="px-3 py-1.5 bg-secondary text-foreground rounded-lg text-xs font-bold hover:bg-secondary/90 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight">{dataset.datasetName}</h1>
                <button
                  onClick={() => {
                    setEditedName(dataset.datasetName);
                    setIsEditingName(true);
                  }}
                  className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-sm"
                  title="Rename Dataset"
                >
                  ✏️ Edit
                </button>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-0.5">
              Consolidated Relational Dataset • <span className="font-semibold text-primary uppercase text-xs">{dataset.processingStatus}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            navigate(`/datasets/${id}`);
          }}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border hover:bg-secondary flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Details
        </button>
      </div>

      {!isReady && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
          <div>
            <h4 className="font-bold text-sm">Regeneration Required</h4>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
              Source datasets have been modified or version changes were made. You must re-run the ingestion pipeline to refresh and allow exports.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Management Cards */}
        <div className="md:col-span-2 space-y-6">
          {/* Source Dependencies */}
          <div className="p-6 bg-card border border-border rounded-2xl space-y-4 shadow-sm">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" /> Source Dependencies
            </h3>
            <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
              {(dataset.sourceDatasets || []).map((src: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center p-4 bg-secondary/10">
                  <div>
                    <span className="font-bold text-sm block">Dataset: {src.datasetId?.datasetName || src.datasetId}</span>
                    <span className="text-xs text-muted-foreground block font-mono">Reference: {src.datasetId?._id || src.datasetId}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                      Version {src.version}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Relationship Graph Node map */}
          <div className="p-6 bg-card border border-border rounded-2xl space-y-4 shadow-sm">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Network className="h-5 w-5 text-primary" /> Joint Schema Graph mapping
            </h3>
            <div className="space-y-3 font-mono text-xs">
              {(dataset.combinedRelationships?.relationships || []).map((rel: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 bg-secondary/20 p-3 rounded-xl border border-border">
                  <div className="text-left shrink-0">
                    <span className="font-bold block text-primary truncate max-w-[150px]">{rel.sourceDatasetName}</span>
                    <span className="text-[10px] text-muted-foreground">.{rel.sourceKey}</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center text-muted-foreground border-t border-dashed border-border relative">
                    <span className="absolute -top-2.5 text-[9px] bg-secondary px-1.5 py-0.5 rounded text-amber-500 font-bold">
                      {rel.qualityScore}% Match
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground mt-4" />
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold block text-primary truncate max-w-[150px]">{rel.targetDatasetName}</span>
                    <span className="text-[10px] text-muted-foreground">.{rel.targetKey}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Actions Console */}
        <div className="md:col-span-1 space-y-6">
          <div className="p-6 bg-card border border-border rounded-2xl space-y-4 shadow-sm h-fit">
            <h3 className="font-bold text-lg">Actions Console</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Updating individual source files will automatically mark this consolidated index as Regeneration Required.
            </p>

            <div className="space-y-4 pt-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 text-sm font-extrabold shadow-md transition"
              >
                <RefreshCw className={`h-4.5 w-4.5 ${refreshing && 'animate-spin'}`} />
                Reprocess Ingestion
              </button>

              {isReady && (
                <button
                  onClick={() => navigate(`/ai-analytics/${id}`)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 text-sm font-extrabold shadow-md transition hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Sparkles className="h-4.5 w-4.5" />
                  Ask AI About Combined Dataset
                </button>
              )}



              {/* Analytics Report Export Config */}
              <div className="p-3.5 border border-border rounded-xl bg-secondary/50 space-y-2.5">
                <span className="text-[11px] font-black text-foreground uppercase tracking-wider block">Analytics Report Export</span>
                <input
                  type="text"
                  placeholder="Report filename..."
                  value={reportFileName}
                  disabled={!isReady}
                  onChange={(e) => setReportFileName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-border bg-background rounded-lg text-xs outline-none focus:border-primary disabled:opacity-50"
                />
                <div className="flex flex-col gap-2">
                  <a
                    href={isReady ? documentService.exportCombinedReportPDFUrl(id || '', reportFileName) : '#'}
                    className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-sm ${isReady ? '' : 'opacity-40 cursor-not-allowed pointer-events-none'}`}
                  >
                    <Download className="h-3.5 w-3.5" /> Download PDF Report
                  </a>
                </div>
              </div>

              <button
                onClick={handleDelete}
                disabled={archiving}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/15 text-sm font-bold border border-destructive/20 transition"
              >
                <Trash2 className="h-4.5 w-4.5" />
                Archive / Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CombinedDatasetManager;
