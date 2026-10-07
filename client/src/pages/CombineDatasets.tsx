import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentService, DatasetMetadata } from '../services/documentService';
import { assessmentService } from '../services/assessmentService';
import { 
  ArrowLeft, Search, Layers, CheckSquare, Square, 
  AlertTriangle, Play, Sparkles, Network, ArrowRight 
} from 'lucide-react';

export const CombineDatasets: React.FC = () => {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [datasetName, setDatasetName] = useState('Combined Business Dataset');
  const [strategy, setStrategy] = useState('inner');

  const [dashboardName, setDashboardName] = useState('Combined Business Dashboard');
  const [dashboardCategory, setDashboardCategory] = useState('General');
  const [customCategory, setCustomCategory] = useState('');

  const [previewData, setPreviewData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    setLoading(true);
    try {
      const res = await documentService.listDatasets({ page: 1, limit: 50, search: '' });
      const filtered = (res.datasets || []).filter(
        (d: any) => d.processingStatus === 'processed' && !d.isCombined
      );
      setDatasets(filtered);
    } catch (err) {
      console.error('Failed to load datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectToggle = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    setSelectedIds(next);
    setPreviewData(null);
    setErrorMsg(null);
  };

  const handleGeneratePreview = async () => {
    if (selectedIds.length < 2) {
      setErrorMsg('Please select at least 2 datasets to preview a merge.');
      return;
    }
    setCalculating(true);
    setErrorMsg(null);
    try {
      const res = await assessmentService.previewCombineDatasets(selectedIds);
      if (!res.valid) {
        setErrorMsg(res.validationErrors.join(', '));
      } else {
        setPreviewData(res);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to analyze relationships.');
    } finally {
      setCalculating(false);
    }
  };

  const handleCreateCombination = async () => {
    if (selectedIds.length < 2) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const finalCategory = dashboardCategory === 'Custom' ? customCategory : dashboardCategory;
      const res = await assessmentService.combineDatasets(
        selectedIds, 
        datasetName, 
        dashboardName, 
        finalCategory
      );
      // Run pipeline on the new combined logical dataset
      navigate(`/analytics/${res._id}`);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to create combined dataset.');
      setSubmitting(false);
    }
  };

  const filteredDatasets = datasets.filter((d) =>
    d.datasetName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Relational Dataset Consolidation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select multiple business datasets, verify relation join keys, and consolidate them into a single analytical dashboard.
          </p>
        </div>
        <button
          onClick={() => {
            navigate('/datasets');
          }}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border hover:bg-secondary flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Datasets
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Selector List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 bg-card border border-border rounded-2xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">1. Select Datasets</h3>
              <span className="text-xs text-muted-foreground font-semibold">
                {selectedIds.length} Selected
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search processed datasets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-border rounded-xl text-sm bg-secondary/50 focus:bg-card transition"
              />
            </div>

            {loading ? (
              <p className="text-center py-8 text-sm text-muted-foreground">Loading datasets...</p>
            ) : filteredDatasets.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">No datasets available for merging.</p>
            ) : (
              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                {filteredDatasets.map((ds) => {
                  const isSelected = selectedIds.includes(ds._id);
                  return (
                    <div 
                      key={ds._id}
                      onClick={() => handleSelectToggle(ds._id)}
                      className={`flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/40 transition ${isSelected ? 'bg-primary/5' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <button className="text-primary shrink-0">
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 fill-primary text-primary-foreground" />
                          ) : (
                            <Square className="h-5 w-5" />
                          )}
                        </button>
                        <div>
                          <span className="font-semibold text-sm block">{ds.datasetName}</span>
                          <span className="text-xs text-muted-foreground block font-mono">
                            ID: {ds._id}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          Processed
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Merge Strategy Options */}
          <div className="p-6 bg-card border border-border rounded-2xl space-y-4 shadow-sm">
            <h3 className="font-bold text-lg">2. Configure Merge Strategy</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="p-4 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 cursor-pointer flex flex-col justify-between space-y-2">
                <input 
                  type="radio" 
                  name="strategy" 
                  value="inner"
                  checked={strategy === 'inner'}
                  onChange={() => setStrategy('inner')}
                  className="accent-primary self-start"
                />
                <div>
                  <span className="font-bold text-sm block">Inner Join</span>
                  <span className="text-xs text-muted-foreground block">Only keep rows with keys present in both.</span>
                </div>
              </label>

              <label className="p-4 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 cursor-pointer flex flex-col justify-between space-y-2">
                <input 
                  type="radio" 
                  name="strategy" 
                  value="left"
                  checked={strategy === 'left'}
                  onChange={() => setStrategy('left')}
                  className="accent-primary self-start"
                />
                <div>
                  <span className="font-bold text-sm block">Left Join</span>
                  <span className="text-xs text-muted-foreground block">Keep all rows from primary, populate nulls from secondary.</span>
                </div>
              </label>
            </div>
            
            <button
              onClick={handleGeneratePreview}
              disabled={selectedIds.length < 2 || calculating}
              className="w-full py-2.5 rounded-xl bg-secondary text-foreground font-bold hover:bg-secondary/85 text-sm transition mt-3"
            >
              {calculating ? 'Analyzing relations...' : 'Analyze Relationships & Preview Join'}
            </button>
          </div>
        </div>

        {/* Right Column: Previews & Actions */}
        <div className="lg:col-span-5 space-y-6">
          {errorMsg && (
            <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-2xl flex items-start gap-3 text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Validation Blocked</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{errorMsg}</p>
              </div>
            </div>
          )}

          {previewData ? (
            <div className="p-6 bg-card border border-border rounded-2xl space-y-6 shadow-md">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-extrabold text-lg flex items-center gap-1.5">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  Join Analysis Results
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full">
                  🟢 Ready
                </span>
              </div>

              {/* Live Relation Node Map */}
              <div className="p-4 bg-secondary/20 rounded-xl space-y-3 border border-border">
                <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                  <Network className="h-3.5 w-3.5 text-primary" /> Visual Schema Join Graph
                </h4>
                <div className="space-y-3 font-mono text-xs">
                  {previewData.relationships.map((rel: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 bg-card p-3 rounded-lg border border-border">
                      <div className="text-left shrink-0">
                        <span className="font-bold block text-primary truncate max-w-[120px]">{rel.sourceDatasetName}</span>
                        <span className="text-[10px] text-muted-foreground">.{rel.sourceKey}</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center text-muted-foreground border-t border-dashed border-border relative">
                        <span className="absolute -top-2.5 text-[9px] bg-secondary px-1.5 py-0.5 rounded text-amber-500 font-bold">
                          {rel.qualityScore}% Match
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground mt-4" />
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold block text-primary truncate max-w-[120px]">{rel.targetDatasetName}</span>
                        <span className="text-[10px] text-muted-foreground">.{rel.targetKey}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                  <span className="text-[10px] text-muted-foreground block font-bold">RELATION QUALITY</span>
                  <span className="text-xl font-black text-primary block mt-1">
                    {previewData.relationships[0]?.qualityScore || 90}%
                  </span>
                  <span className="text-[10px] text-emerald-500 font-semibold block mt-0.5">Excellent Match</span>
                </div>
                <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                  <span className="text-[10px] text-muted-foreground block font-bold">ESTIMATED ROWS</span>
                  <span className="text-xl font-black text-primary block mt-1">
                    {previewData.estimatedRecordCount}
                  </span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">Rows Consolidated</span>
                </div>
              </div>

              <div className="space-y-4 border-t border-border pt-4">
                <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider">3. Name & Tag Dashboard</h4>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground block">COMBINED DATASET NAME</label>
                    <input
                      type="text"
                      value={datasetName}
                      onChange={(e) => setDatasetName(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-xl text-xs font-bold bg-background focus:border-primary outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground block">COMBINED DASHBOARD NAME</label>
                    <input
                      type="text"
                      value={dashboardName}
                      onChange={(e) => setDashboardName(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-xl text-xs font-bold bg-background focus:border-primary outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground block">DASHBOARD CATEGORY</label>
                      <select
                        value={dashboardCategory}
                        onChange={(e) => setDashboardCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-xl text-xs outline-none bg-background cursor-pointer"
                      >
                        <option value="General">General</option>
                        <option value="Finance">Finance</option>
                        <option value="Sales">Sales</option>
                        <option value="Inventory">Inventory</option>
                        <option value="Executive Reports">Executive Reports</option>
                        <option value="Operations">Operations</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Human Resources">Human Resources</option>
                        <option value="Custom">Custom (Write in)</option>
                      </select>
                    </div>

                    {dashboardCategory === 'Custom' && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground block">CUSTOM CATEGORY</label>
                        <input
                          type="text"
                          value={customCategory}
                          placeholder="Enter custom category name..."
                          onChange={(e) => setCustomCategory(e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-xl text-xs outline-none bg-background"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreateCombination}
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-extrabold hover:bg-primary/95 text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Play className="h-4 w-4" />
                {submitting ? 'Consolidating...' : 'Combine & Run Ingestion'}
              </button>
            </div>
          ) : (
            <div className="h-80 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <Layers className="h-10 w-10 text-muted-foreground/35 mb-2" />
              <h4 className="font-bold text-sm">Join Analysis Pending</h4>
              <p className="text-xs max-w-xs mt-1 leading-relaxed">
                Select target datasets on the left, select your join keys config, and click Analyze to view matching diagnostics.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CombineDatasets;
