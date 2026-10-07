import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { assessmentService, AssessmentResult } from '../services/assessmentService';
import { documentService, DatasetMetadata } from '../services/documentService';
import { 
  ArrowLeft, ShieldAlert, ShieldCheck, Download, RefreshCw, 
  ListTodo, Info, BarChart3, TrendingUp, AlertTriangle, 
  HelpCircle, CheckCircle2, XCircle, Layers, Network, ArrowRight
} from 'lucide-react';
import { exportElementToPDF } from '../utils/pdfExport';
import LoadingOverlay from '../components/LoadingOverlay';
import { getFriendlyErrorMessage } from '../utils/userMessageService';

export const DatasetAssessmentPage: React.FC = () => {
  const { datasetId } = useParams<{ datasetId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [history, setHistory] = useState<AssessmentResult[]>([]);
  const [dataset, setDataset] = useState<DatasetMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [reportFileName, setReportFileName] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportProgressMsg, setExportProgressMsg] = useState('');
  const [totalRowsCount, setTotalRowsCount] = useState(0);
  const [totalColsCount, setTotalColsCount] = useState(0);

  useEffect(() => {
    if (!loading && assessment && searchParams.get('download') === 'pdf') {
      handleExportReport();
    }
  }, [loading, assessment, searchParams]);

  const fetchData = async () => {
    if (!datasetId) return;
    setLoading(true);
    try {
      const assessData = await assessmentService.getLatestAssessment(datasetId);
      setAssessment(assessData);

      const historyData = await assessmentService.getAssessmentHistory(datasetId);
      setHistory(historyData);

      const datasetData = await documentService.getDatasetDetails(datasetId);
      setDataset(datasetData);

      if (datasetData.isCombined) {
        setTotalRowsCount((datasetData as any).mergedRowCount || 0);
        setTotalColsCount((datasetData as any).mergedColumnCount || 0);
      } else {
        try {
          const preview = await documentService.getDatasetPreview(datasetId);
          setTotalRowsCount((preview as any).totalRows || preview.rows.length);
          setTotalColsCount(preview.headers.length);
        } catch (e) {
          console.warn('Preview stats failed:', e);
        }
      }
    } catch (err) {
      console.error('Failed to load dataset assessment details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [datasetId]);

  const handleRecalculate = async () => {
    if (!datasetId) return;
    setRecalculating(true);
    try {
      const refreshed = await assessmentService.recalculateAssessment(datasetId);
      setAssessment(refreshed);
      const historyData = await assessmentService.getAssessmentHistory(datasetId);
      setHistory(historyData);
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err);
      alert(`${friendly.message}\n\nReference ID: ${friendly.refId}`);
    } finally {
      setRecalculating(false);
    }
  };

  const handleExportReport = async () => {
    if (!datasetId || !assessment) return;
    setExporting(true);
    setExportProgressMsg('Initializing PDF Assembler...');
    try {
      const statsObj = {
        rowCount: totalRowsCount,
        columnCount: totalColsCount,
        measures: (dataset as any)?.measures?.length || 0,
        dimensions: (dataset as any)?.dimensions?.length || 0,
      };

      const metadata = {
        datasetName: dataset?.datasetName || 'Dataset',
        dashboardName: dataset?.isCombined ? 'Combined Analysis Dashboard' : 'Logical Dataset Dashboard',
        category: assessment.datasetCategory || 'General',
        businessDomain: assessment.businessDomain || 'Generic Analytics',
        readinessScore: assessment.analyticsReadinessScore || 0,
        qualityScore: assessment.qualityScore || 0,
        version: String(dataset?.currentVersion || 1),
        recommendations: assessment.recommendations || [],
        statistics: statsObj,
        kpis: []
      };

      await exportElementToPDF(
        'analytics-report-view', 
        `Analytics_Report_${dataset?.datasetName || datasetId}`, 
        false, 
        metadata,
        (msg) => setExportProgressMsg(msg)
      );
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err);
      alert(`${friendly.message}\n\nReference ID: ${friendly.refId}`);
    } finally {
      setExporting(false);
    }
  };

  const goBack = () => {
    if (dataset?.isCombined) {
      navigate(`/datasets/${datasetId}`);
    } else {
      navigate(`/documents/${dataset?.documentId?._id || dataset?.documentId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-semibold">Generating Suitability Report Profile...</p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="p-12 text-center bg-card border border-border rounded-2xl max-w-md mx-auto space-y-4 shadow-md">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
        <h3 className="font-extrabold text-xl">Assessment Report Missing</h3>
        <p className="text-sm text-muted-foreground">
          No assessment details exist yet. Click the button below to analyze this dataset's structure.
        </p>
        <button 
          onClick={handleRecalculate}
          disabled={recalculating}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 flex items-center justify-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${recalculating && 'animate-spin'}`} />
          Run Analytics Assessment
        </button>
      </div>
    );
  }

  const isReady = dataset && (dataset.processingStatus === 'processed' || (dataset.processingStatus as any) === 'Completed');

  const getReadinessColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5';
    if (score >= 70) return 'text-green-500 border-green-500/20 bg-green-500/5';
    if (score >= 50) return 'text-amber-500 border-amber-500/20 bg-amber-500/5';
    return 'text-destructive border-destructive/20 bg-destructive/5';
  };

  const getScoreProgressStyle = (score: number) => {
    if (score >= 70) return 'stroke-green-500';
    if (score >= 50) return 'stroke-amber-500';
    return 'stroke-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header breadcrumb row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <button 
            onClick={goBack} 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-semibold transition"
          >
            <ArrowLeft className="h-4 w-4" />
            {dataset?.isCombined ? 'Back to Combined Dataset' : 'Back to Dataset Details'}
          </button>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2 mt-2">
            {dataset?.isCombined ? 'Combined Dataset Assessment' : 'Dataset Assessment Report'}
          </h1>
          <p className="text-xs text-muted-foreground">
            Ingestion assessment profiling for: <span className="font-semibold text-foreground">{dataset?.datasetName}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {datasetId && !dataset?.isCombined && (
            <a
              href={documentService.exportReportPDFUrl(datasetId)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-bold transition text-white shadow-sm"
            >
              <Download className="h-3.5 w-3.5" /> Download PDF Report
            </a>
          )}

          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="inline-flex items-center gap-2 px-4 py-2 border border-border hover:bg-secondary rounded-xl text-xs font-bold transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${recalculating && 'animate-spin'}`} />
            Recalculate
          </button>

        </div>
      </div>

      <div id="analytics-report-view" className="space-y-6">
      {!isReady && dataset?.isCombined && (
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

      {dataset?.isCombined && (
        <div className="p-6 bg-card border border-border rounded-2xl space-y-4 shadow-sm">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" /> Consolidated Export Console
          </h3>
          <p className="text-xs text-muted-foreground">
            Configure custom filenames and download both the joined schema raw records or the compiled analytics report.
          </p>

          <div className="pt-2">
            {/* Analytics Report Export */}
            <div className="space-y-3 p-4 bg-secondary/20 rounded-xl border border-border">
              <span className="text-[11px] font-black text-foreground uppercase tracking-wider block">2. Download Analytics Report Summary</span>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground block">CUSTOM REPORT FILE NAME</label>
                <input
                  type="text"
                  placeholder="Enter report file name..."
                  value={reportFileName}
                  disabled={!isReady}
                  onChange={(e) => setReportFileName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-border bg-background rounded-lg text-xs outline-none focus:border-primary disabled:opacity-50"
                />
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <a
                  href={isReady ? documentService.exportCombinedReportPDFUrl(datasetId || '', reportFileName) : '#'}
                  className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-sm ${isReady ? '' : 'opacity-40 cursor-not-allowed pointer-events-none'}`}
                >
                  <Download className="h-3.5 w-3.5" /> Download PDF Report
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main stats layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Readiness Dial Card */}
        <div className="p-6 rounded-2xl bg-card border border-border flex flex-col items-center justify-between text-center space-y-4 shadow-sm">
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-muted-foreground">Analytics Readiness</h3>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getReadinessColor(assessment.analyticsReadinessScore)}`}>
              {assessment.analyticsReadinessScore >= 50 ? (
                <ShieldCheck className="h-3.5 w-3.5" />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5" />
              )}
              {assessment.datasetCategory}
            </span>
          </div>

          <div className="relative flex items-center justify-center h-32 w-32">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="64" cy="64" r="50" className="stroke-muted" strokeWidth="10" fill="transparent" />
              <circle 
                cx="64" 
                cy="64" 
                r="50" 
                className={getScoreProgressStyle(assessment.analyticsReadinessScore)} 
                strokeWidth="10" 
                fill="transparent" 
                strokeDasharray={314}
                strokeDashoffset={314 - (314 * assessment.analyticsReadinessScore) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-3xl font-black">{assessment.analyticsReadinessScore}%</span>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">Readiness</p>
            </div>
          </div>

          <div className="w-full border-t border-border pt-4 grid grid-cols-2 gap-4">
            <div className="text-center">
              <span className="text-xs text-muted-foreground font-bold">Confidence</span>
              <p className="text-lg font-black text-primary">{assessment.classificationConfidence}%</p>
            </div>
            <div className="text-center">
              <span className="text-xs text-muted-foreground font-bold">Quality Score</span>
              <p className="text-lg font-black text-primary">{assessment.qualityScore}%</p>
            </div>
          </div>
        </div>

        {/* Detailed Document Profiler */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 lg:col-span-2 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-extrabold text-sm text-muted-foreground">Document Profile</h3>
                <span className="text-xl font-black block mt-1">{assessment.documentType}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-wider block">Domain</span>
                <span className="px-2.5 py-1 bg-secondary text-foreground text-xs font-bold rounded-lg border border-border mt-1 inline-block">
                  {assessment.businessDomain}
                </span>
              </div>
            </div>

            {/* Entity badges */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground block">Detected Business Entities:</span>
              <div className="flex flex-wrap gap-1.5">
                {assessment.detectedEntities.length > 0 ? (
                  assessment.detectedEntities.map(e => (
                    <span key={e} className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
                      {e}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic">No specific business entities detected.</span>
                )}
              </div>
            </div>

            {/* Decision explanation text block */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border/40">
              <span className="text-xs font-bold text-muted-foreground block uppercase tracking-wider">Assessment Verdict</span>
              <p className="text-sm mt-1">
                {assessment.analyticsReadinessScore >= 50 ? (
                  <>
                    This document is <span className="font-bold text-green-500">Analytics Ready</span>. 
                    The analytical structure contains sufficient numeric variables and business dimensions to generate visual widgets, charts, and metrics.
                  </>
                ) : (
                  <>
                    This document is <span className="font-bold text-destructive">Not Suitable</span> for business analytics. 
                    The engine did not find structured business values (e.g. sales logs, balance metrics) needed for aggregations, and dashboard generation was blocked.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-primary" />
              Ingested Version: v{dataset?.currentVersion || 1}
            </span>
            <span>Assessment Code: P3.5.Rules</span>
          </div>
        </div>
      </div>

      {/* Point breakdown / Contributions & original comparison grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* If Combined: Show Source Dataset Contributions */}
        {assessment.isCombined && assessment.sourceDatasetContributions && assessment.sourceDatasetContributions.length > 0 ? (
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <h3 className="font-extrabold text-base">Consolidated Source Contributions</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Parent source tables joined dynamically to generate the analytics readiness profile:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-bold">
                    <th className="py-2">Source Dataset</th>
                    <th className="py-2 text-center">Readiness</th>
                    <th className="py-2 text-center">Quality</th>
                    <th className="py-2 text-center">Ingestion Weight</th>
                    <th className="py-2 text-right">Relationship</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {assessment.sourceDatasetContributions.map((contrib, idx) => (
                    <tr key={idx} className="hover:bg-secondary/20">
                      <td className="py-3 font-semibold text-foreground">{contrib.datasetName}</td>
                      <td className="py-3 text-center font-bold text-green-500">{contrib.readinessScore}%</td>
                      <td className="py-3 text-center font-bold text-primary">{contrib.qualityScore}%</td>
                      <td className="py-3 text-center font-semibold text-muted-foreground">{contrib.contributionPercentage}%</td>
                      <td className="py-3 text-right">
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">
                          {contrib.relationshipStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Points Breakdown Ledger for Single Datasets */
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-primary" />
              <h3 className="font-extrabold text-base">Points Breakdown Ledger</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Points allocation logic applied by the configurable rules-engine based on file content matrices:
            </p>

            <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
              {Object.entries(assessment.scoreBreakdown || {}).map(([ruleName, points]) => (
                <div key={ruleName} className="flex justify-between items-center p-3 text-sm">
                  <span className="font-semibold capitalize text-foreground/80">
                    {ruleName.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <span className={`font-bold flex items-center gap-1.5 ${points >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {points >= 0 ? `+${points}` : points}
                    {points >= 0 ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* If Combined: Show Relations Node Map */}
        {assessment.isCombined && assessment.relationshipDetectionResults?.relationships ? (
          <div className="p-6 bg-card border border-border rounded-2xl space-y-4 shadow-sm">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Network className="h-5 w-5 text-primary" /> Consolidated Schema Relations
            </h3>
            <div className="space-y-3 font-mono text-xs">
              {(assessment.relationshipDetectionResults.relationships || []).map((rel: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 bg-secondary/20 p-3 rounded-xl border border-border">
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
        ) : (
          /* History Timeline for Single Datasets */
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h3 className="font-extrabold text-base">Assessment History</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Track dataset readiness scores over versions:
            </p>

            <div className="relative border-l border-border ml-2 pl-4 py-2 space-y-6">
              {history.map((h, i) => (
                <div key={h._id} className="relative">
                  <div className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-card ${h.analyticsReadinessScore >= 50 ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-foreground">
                        Version {i + 1}
                      </span>
                      <span className="text-muted-foreground font-semibold">
                        Score: <span className={h.analyticsReadinessScore >= 50 ? 'text-green-500' : 'text-red-500'}>{h.analyticsReadinessScore}%</span>
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Analyzed on: {new Date(h.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Diagnostics / Strengths / Recommendations */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-6 shadow-sm">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-extrabold text-base">Quality Diagnostics Ledger</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border pt-4">
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-green-500 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              Key Strengths
            </h4>
            <ul className="space-y-2">
              {assessment.strengths.map((str, i) => (
                <li key={i} className="flex gap-2 text-xs text-foreground/80 leading-relaxed">
                  <span className="text-green-500 font-bold">•</span>
                  {str}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-sm text-amber-500 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Identified Problems
            </h4>
            <ul className="space-y-2">
              {assessment.weaknesses.length > 0 ? (
                assessment.weaknesses.map((weak, i) => (
                  <li key={i} className="flex gap-2 text-xs text-foreground/80 leading-relaxed">
                    <span className="text-amber-500 font-bold">•</span>
                    {weak}
                  </li>
                ))
              ) : (
                <li className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  No major data issues detected.
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Actionable Recommendations</span>
          <ul className="space-y-1.5">
            {assessment.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground/90">
                <span className="text-primary font-bold mt-0.5">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      </div>
      <LoadingOverlay isVisible={exporting} message={exportProgressMsg} />
    </div>
  );
};

export default DatasetAssessmentPage;
