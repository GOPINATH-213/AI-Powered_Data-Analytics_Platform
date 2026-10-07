import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { documentService, DatasetMetadata } from '../services/documentService';
import { assessmentService, AssessmentResult } from '../services/assessmentService';
import { ArrowLeft, Database, FileSpreadsheet, ShieldCheck, ShieldAlert, Loader2, LayoutDashboard, Sparkles } from 'lucide-react';

export const DatasetDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dataset, setDataset] = useState<DatasetMetadata | null>(null);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const handleRename = async () => {
    if (!editedName.trim() || editedName.length > 100) {
      alert('Please enter a valid dataset name (1-100 characters).');
      return;
    }
    setSavingName(true);
    try {
      await documentService.renameCombinedDataset(id!, editedName.trim());
      setDataset(prev => prev ? { ...prev, datasetName: editedName.trim() } : null);
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to rename dataset:', err);
      alert('Failed to rename combined dataset.');
    } finally {
      setSavingName(false);
    }
  };

  const fetchDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await documentService.getDatasetDetails(id);
      setDataset(data);

      try {
        const assess = await assessmentService.getLatestAssessment(id);
        setAssessment(assess);
      } catch (err) {
        setAssessment(null);
      }
    } catch (err) {
      console.error('Failed to load dataset details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const goBack = () => {
    navigate('/datasets');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading dataset details...</p>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="p-6 rounded-2xl border border-destructive/20 bg-destructive/5 text-destructive text-center max-w-md mx-auto space-y-4">
        <h3 className="font-bold text-lg">Dataset Not Found</h3>
        <button onClick={goBack} className="px-4 py-2 bg-secondary text-foreground hover:bg-secondary/80 rounded-xl text-sm font-semibold">
          Back to Datasets
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={goBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-secondary text-sm font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Datasets
        </button>
      </div>

      <div className="p-6 rounded-2xl bg-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Database className="h-6 w-6" />
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
                {dataset.isCombined && (
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
                )}
              </div>
            )}
            {dataset.isCombined ? (
              <p className="text-sm text-muted-foreground mt-0.5">
                Combined Dataset • Consolidated Relational Ingestion
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-0.5">
                Logical reference to original file: <span className="font-mono text-xs">{dataset.documentId?.originalFilename || 'Deleted'}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          {dataset.freshnessStatus === 'up_to_date' && assessment && (
            <button
              onClick={() => navigate(`/dataset-assessment/${dataset._id}`)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-foreground hover:bg-secondary/85 text-sm font-bold border border-border"
            >
              View Suitability Report
            </button>
          )}
          {dataset.freshnessStatus === 'up_to_date' && dataset.processingStatus === 'processed' && assessment && assessment.analyticsReadinessScore >= 50 && (
            <button
              onClick={() => navigate(`/dashboard`)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-500 text-sm font-extrabold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <LayoutDashboard className="h-4.5 w-4.5" />
              View Ingested Dashboard
            </button>
          )}
          {dataset.freshnessStatus === 'up_to_date' && dataset.processingStatus === 'processed' && assessment && assessment.analyticsReadinessScore >= 50 && (
            <button
              onClick={() => navigate(`/ai-analytics/${dataset._id}`)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 text-sm font-extrabold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <Sparkles className="h-4.5 w-4.5" />
              Ask AI About This Dataset
            </button>
          )}
          <button
            onClick={() => navigate(`/analytics/${dataset._id}`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 text-sm font-bold shadow-md"
          >
            {dataset.processingStatus === 'processed' && dataset.freshnessStatus === 'up_to_date' ? 'Re-run Ingestion' : 'Run Ingestion Pipeline'}
          </button>
        </div>
      </div>

      {dataset.freshnessStatus === 'regeneration_required' && (
        <div className="p-4 border border-amber-500/20 bg-amber-500/5 rounded-2xl flex items-start gap-3 text-amber-600">
          <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-extrabold text-sm">Regeneration Required</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              A newer version of this dataset has been uploaded or source file dependencies have changed. 
              The current dashboard and assessment reports are outdated. Please rerun the ingestion pipeline to refresh analytics.
            </p>
          </div>
        </div>
      )}

      {/* Dataset info blocks */}
      {dataset.isCombined ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-card border border-border space-y-6 lg:col-span-2">
            <h3 className="font-bold text-lg">Combined Dataset Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-1">
                <span className="text-xs text-muted-foreground block">PROCESSING STATUS</span>
                <span className="font-bold text-sm text-primary uppercase">{dataset.processingStatus}</span>
              </div>
              <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-1">
                <span className="text-xs text-muted-foreground block">INGESTION STATUS</span>
                <span className="font-bold text-sm text-amber-500 uppercase">{(dataset as any).ingestionStatus || 'N/A'}</span>
              </div>
              <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-1">
                <span className="text-xs text-muted-foreground block">CURRENT VERSION</span>
                <span className="font-bold text-sm text-primary">v{(dataset as any).currentVersion || 1}</span>
              </div>
            </div>

            {/* Source Datasets List */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-muted-foreground">Linked Source Datasets</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {((dataset as any).sourceDatasetIds || []).map((src: any, index: number) => {
                  const savedVer = ((dataset as any).sourceDatasetVersions || []).find((v: any) => v.datasetId === src._id || v.datasetId === src);
                  return (
                    <div key={index} className="p-4 rounded-xl border border-border bg-secondary/20 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-sm block">{src.datasetName || 'Dataset reference'}</span>
                        <span className="text-xs text-muted-foreground font-mono truncate max-w-[180px] block">{src._id || src}</span>
                      </div>
                      <span className="text-xs font-semibold px-2 py-1 rounded-md bg-primary/10 text-primary shrink-0">
                        Version {savedVer?.version || src.currentVersion || 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Relationship Detection Map */}
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-sm text-muted-foreground">Relationship Mapping Joins</h4>
              <div className="p-4 rounded-xl border border-border bg-secondary/15 space-y-2.5">
                {((dataset as any).relationshipMap?.relationships || []).length > 0 ? (
                  ((dataset as any).relationshipMap.relationships).map((rel: any, idx: number) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 border-b border-border/50 last:border-0 text-sm">
                      <span className="font-mono text-xs text-primary">{rel.sourceDatasetName || rel.sourceDatasetId}.{rel.sourceKey}</span>
                      <span className="text-muted-foreground text-xs font-bold uppercase sm:text-center">↔ ({rel.qualityScore}% Match)</span>
                      <span className="font-mono text-xs text-primary text-right">{rel.targetDatasetName || rel.targetDatasetId}.{rel.targetKey}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic">No relationship mapping joins detected.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Combined Stats Card */}
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
            <h3 className="font-bold text-lg">Merged Dataset Stats</h3>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-secondary/40 border border-border rounded-xl">
                  <span className="text-xs text-muted-foreground block">ROWS</span>
                  <span className="font-extrabold text-base">{(dataset as any).mergedRowCount || 0}</span>
                </div>
                <div className="p-3 bg-secondary/40 border border-border rounded-xl">
                  <span className="text-xs text-muted-foreground block">COLUMNS</span>
                  <span className="font-extrabold text-base">{(dataset as any).mergedColumnCount || 0}</span>
                </div>
              </div>
              
              <div className="space-y-2.5 pt-3 border-t border-border">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Dashboard Name:</span>
                  <span className="font-bold text-xs">{(dataset as any).dashboardName || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Dashboard Category:</span>
                  <span className="font-semibold text-xs">{(dataset as any).dashboardCategory || 'General'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground text-left">Created Date:</span>
                  <span className="font-semibold text-xs text-right">
                    {new Date(dataset.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4 lg:col-span-2">
            <h3 className="font-bold text-lg">Dataset Status</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-1">
                <span className="text-xs text-muted-foreground block">PROCESSING STATUS</span>
                <span className="font-bold text-sm text-primary uppercase">{dataset.processingStatus}</span>
              </div>
              <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-1">
                <span className="text-xs text-muted-foreground block">SCHEMA MATCH</span>
                <span className="font-bold text-sm text-amber-500 uppercase">{dataset.schemaStatus}</span>
              </div>
            </div>

            {assessment && assessment.analyticsReadinessScore < 50 ? (
              <div className="border border-destructive/20 rounded-xl p-4 bg-destructive/5 space-y-2">
                <h4 className="font-bold text-sm flex items-center gap-1.5 text-destructive">
                  <ShieldAlert className="h-4 w-4" />
                  Dashboard Generation Blocked
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This document is classified as <span className="font-bold text-destructive">{assessment.documentType}</span> and is not suitable for Business Analytics. It does not contain structured logs, financial tables, or quantities.
                </p>
                <button
                  onClick={() => navigate(`/dataset-assessment/${dataset._id}`)}
                  className="mt-1.5 text-xs font-extrabold text-destructive hover:underline block"
                >
                  View Full Assessment Report & Recommendations →
                </button>
              </div>
            ) : (
              <div className="border border-border rounded-xl p-4 bg-secondary/25 space-y-2">
                <h4 className="font-bold text-sm flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Future AI Pipeline Ready
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  When processing is triggered in Phase 3, this dataset will be clean-mapped, column types will be inferred, and dynamic graphs will load.
                </p>
              </div>
            )}
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
            <h3 className="font-bold text-lg">Source Metadata</h3>
            {dataset.documentId ? (
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold truncate block">{dataset.documentId.filename}</span>
                    <span className="text-xs text-muted-foreground">{(dataset.documentId.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Original Version:</span>
                    <span className="font-bold text-xs">v{dataset.documentId.currentVersion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground text-left">Uploaded:</span>
                    <span className="font-semibold text-xs text-right">
                      {new Date(dataset.documentId.uploadDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Source file was deleted or unlinked.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default DatasetDetails;
