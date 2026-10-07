import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { analyticsService, ProcessingJob } from '../services/analyticsService';
import { Cpu, Loader2, Play, AlertCircle, Terminal, CheckCircle2 } from 'lucide-react';

export const Analytics: React.FC = () => {
  const { datasetId } = useParams<{ datasetId: string }>();
  const navigate = useNavigate();
  
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobStatus = async () => {
    if (!datasetId) return;
    try {
      const data = await analyticsService.getJobStatus(datasetId);
      if (data && data._id) {
        setJob(data);
        if (data.status === 'running' || data.status === 'pending') {
          setRunning(true);
        } else {
          setRunning(false);
        }
      }
    } catch (err) {
      console.error('Failed to get job status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobStatus();
  }, [datasetId]);

  // Poll status when job is running
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (running && datasetId) {
      timer = setInterval(async () => {
        try {
          const data = await analyticsService.getJobStatus(datasetId);
          setJob(data);
          if (data.status === 'completed' || data.status === 'failed') {
            setRunning(false);
            clearInterval(timer);
            
            if (data.status === 'completed') {
              if (data.currentStep === 'Blocked') {
                navigate(`/dataset-assessment/${datasetId}`);
              } else {
                navigate(`/dashboard`);
              }
            }
          }
        } catch (err) {
          setRunning(false);
          clearInterval(timer);
        }
      }, 2000);
    }
    return () => clearInterval(timer);
  }, [running, datasetId]);

  const handleStartPipeline = async () => {
    if (!datasetId) return;
    setRunning(true);
    setError(null);
    try {
      const res = await analyticsService.processDataset(datasetId);
      if (res && res.blocked) {
        navigate(`/dataset-assessment/${datasetId}`);
      } else if (res && res.dashboardId) {
        navigate(`/dashboard`); // Redirect to dashboard page
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Processing failed. Check execution logs.');
      setRunning(false);
      fetchJobStatus();
    }
  };

  const goBack = () => {
    navigate('/datasets');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Checking dataset status...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Cpu className="h-6 w-6 text-primary animate-pulse" />
            Ingestion & KPI Pipeline
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Trigger automatic cleaning, detect column types, extract measures, and auto-recommend visualizations.
          </p>
        </div>
        <button
          onClick={goBack}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border hover:bg-secondary"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Pipeline Failure</h4>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Execution panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 p-6 rounded-2xl bg-card border border-border space-y-4 h-fit">
          <h3 className="font-bold text-lg">Action Console</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Running processing will parse rows from storage, clean currency formats, discard duplicates, and generate charts.
          </p>
          <button
            onClick={handleStartPipeline}
            disabled={running}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 text-sm font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                Ingesting...
              </>
            ) : (
              <>
                <Play className="h-4.5 w-4.5" />
                Run Pipeline
              </>
            )}
          </button>
        </div>

        {/* Console Logs */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              Console Logs
            </h3>
            {job && (
              <span className="text-xs font-mono uppercase bg-secondary px-2 py-0.5 rounded">
                {job.status}
              </span>
            )}
          </div>

          {job ? (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span>{job.currentStep}</span>
                  <span>{job.progress}%</span>
                </div>
                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-500 ease-out"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              </div>

              {/* Logs terminal */}
              <div className="bg-black/95 text-neutral-300 font-mono text-xs rounded-xl p-4 h-64 overflow-y-auto space-y-1.5 select-text shadow-inner border border-neutral-800">
                {job.logs.map((log, idx) => (
                  <div key={idx} className="whitespace-pre-wrap leading-relaxed">
                    {log}
                  </div>
                ))}
                {running && (
                  <div className="text-primary flex items-center gap-2 pt-1 font-bold">
                    <Loader2 className="h-3 w-3 animate-spin" /> Ingesting step...
                  </div>
                )}
                {job.status === 'completed' && (
                  <div className="text-emerald-500 flex items-center gap-1.5 pt-1 font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Pipeline Complete! Dashboard configuration generated.
                  </div>
                )}
                {job.status === 'failed' && (
                  <div className="text-rose-500 flex items-center gap-1.5 pt-1 font-bold">
                    <AlertCircle className="h-3.5 w-3.5" /> Execution aborted due to errors.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center p-6 border border-dashed border-border rounded-xl text-muted-foreground text-center space-y-2">
              <Cpu className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm">Click "Run Pipeline" to start processing the dataset.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Analytics;
