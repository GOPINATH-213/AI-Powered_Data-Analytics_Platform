import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { documentService, DocumentMetadata, DocumentVersion } from '../services/documentService';
import { 
  ArrowLeft, Download, Trash2, Calendar, FileText, 
  History, RotateCcw, AlertTriangle, Table2, Info, Loader2 
} from 'lucide-react';
import { cn } from '../utils/cn';

export const DocumentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [document, setDocument] = useState<DocumentMetadata | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [previewData, setPreviewData] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await documentService.getDocumentDetails(id);
      setDocument(data.document);
      setVersions(data.versions);
      
      // Fetch Preview
      fetchPreview();
    } catch (err) {
      console.error('Failed to fetch details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreview = async () => {
    if (!id) return;
    setPreviewLoading(true);
    try {
      const res = await documentService.getDocumentPreview(id);
      setPreviewData(res.preview);
    } catch (err) {
      console.error('Failed to load preview:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleRestore = async (versionNum: number) => {
    if (!id) return;
    if (!confirm(`Are you sure you want to revert this document to Version ${versionNum}?`)) return;

    setActionLoading(true);
    try {
      await documentService.restoreVersion(id, versionNum);

      // Find the logical dataset linked to this document
      try {
        const datasetsRes = await documentService.listDatasets({ page: 1, limit: 100 });
        const dataset = (datasetsRes.datasets || []).find(
          (d: any) => d.documentId?._id === id || d.documentId === id
        );

        if (dataset) {
          const runNow = confirm(
            "A new document version has been detected/restored.\n\n" +
            "Would you like to regenerate analytics now?"
          );
          if (runNow) {
            navigate(`/analytics/${dataset._id}`);
            return;
          }
        } else {
          alert(`Restored successfully to Version ${versionNum}!`);
        }
      } catch (err) {
        console.error('Failed to look up dataset for version refresh:', err);
        alert(`Restored successfully to Version ${versionNum}!`);
      }

      fetchDetails();
    } catch (err) {
      alert('Failed to restore version.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !document) return;
    if (!confirm('Are you sure you want to delete this document and all versions permanently?')) return;

    setActionLoading(true);
    try {
      await documentService.deleteDocument(id);
      navigate('/documents');
    } catch (err) {
      alert('Failed to delete document.');
      setActionLoading(false);
    }
  };

  const goBack = () => {
    navigate('/documents');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading file details & preview data...</p>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-6 rounded-2xl border border-destructive/20 bg-destructive/5 text-destructive text-center max-w-md mx-auto space-y-4">
        <AlertTriangle className="h-10 w-10 mx-auto" />
        <h3 className="font-bold text-lg">Document Not Found</h3>
        <button onClick={goBack} className="px-4 py-2 bg-secondary text-foreground hover:bg-secondary/80 rounded-xl text-sm font-semibold">
          Back to Documents
        </button>
      </div>
    );
  }

  const isSpreadsheet = ['.xlsx', '.csv'].includes(document.extension.toLowerCase());
  const isDocx = document.extension.toLowerCase() === '.docx';
  const isPDF = document.extension.toLowerCase() === '.pdf';
  const isImage = ['.jpg', '.jpeg', '.png'].includes(document.extension.toLowerCase());

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={goBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-secondary text-sm font-semibold self-start"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <a
            href={documentService.downloadDocumentUrl(document._id)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 text-sm font-semibold shadow-md"
            download
          >
            <Download className="h-4 w-4" />
            Download
          </a>
          <button
            onClick={handleDelete}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-destructive/20 text-destructive hover:bg-destructive/5 text-sm font-semibold disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Document Information & Version History */}
        <div className="space-y-6 lg:col-span-1">
          {/* Metadata details */}
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              File Information
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">FILE NAME</span>
                <span className="font-bold text-foreground break-all">{document.originalFilename}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground block">FILE SIZE</span>
                  <span className="font-semibold">{(document.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">VERSION</span>
                  <span className="font-bold px-1.5 py-0.5 rounded bg-secondary text-xs">v{document.currentVersion}</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">UPLOAD DATE</span>
                <span className="font-semibold flex items-center gap-1.5 mt-0.5">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {new Date(document.uploadDate).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">STORAGE TARGET</span>
                <span className="font-mono text-xs uppercase bg-secondary px-1.5 py-0.5 rounded">
                  {document.storageType}
                </span>
              </div>
            </div>
          </div>

          {/* Version tree */}
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Version History
            </h2>
            <div className="flow-root">
              <ul className="-mb-8">
                {versions.map((ver, verIdx) => (
                  <li key={ver._id}>
                    <div className="relative pb-8">
                      {verIdx !== versions.length - 1 ? (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-border" aria-hidden="true" />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-card",
                            ver.version === document.currentVersion
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-muted-foreground"
                          )}>
                            v{ver.version}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {ver.changeDescription || 'No description'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(ver.uploadDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap self-center">
                            {ver.version !== document.currentVersion && (
                              <button
                                onClick={() => handleRestore(ver.version)}
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                title="Revert to this version"
                              >
                                <RotateCcw className="h-3 w-3" />
                                Restore
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right Side: File Preview Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-card border border-border flex flex-col h-[500px] shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4 shrink-0">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Table2 className="h-5 w-5 text-primary" />
                Data Preview
              </h2>
              {previewLoading && (
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
                </span>
              )}
            </div>

            {/* Rendering preview frames */}
            <div className="flex-1 min-h-0 overflow-auto bg-secondary/25 border border-border rounded-xl">
              {previewLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              ) : !previewData ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-muted-foreground space-y-2">
                  <FileText className="h-10 w-10" />
                  <p className="text-sm text-center">No preview available for this document format or configuration.</p>
                </div>
              ) : isSpreadsheet ? (
                /* Tabular spread grid */
                <div className="w-full h-full overflow-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-secondary sticky top-0 border-b border-border z-10">
                      <tr>
                        {previewData.headers.map((h: string, idx: number) => (
                          <th key={idx} className="p-3 border-r border-border font-bold bg-secondary text-foreground select-all">
                            {h || `Column ${idx + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {previewData.rows.map((row: any, rIdx: number) => (
                        <tr key={rIdx} className="hover:bg-muted/40 bg-card">
                          {previewData.headers.map((h: string, cIdx: number) => (
                            <td key={cIdx} className="p-3 border-r border-border truncate max-w-xs font-mono">
                              {row[h] !== null ? String(row[h]) : <span className="text-muted-foreground/35">null</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : isDocx ? (
                /* Docx text block */
                <div className="p-6 whitespace-pre-line text-sm leading-relaxed max-w-none text-foreground/90 bg-card h-full font-serif overflow-y-auto">
                  {previewData.text}
                </div>
              ) : isPDF ? (
                /* Embedded PDF frames */
                <iframe
                  src={documentService.downloadDocumentUrl(document._id, undefined, true)}
                  className="w-full h-full border-none rounded-xl"
                  title="PDF Preview"
                />
              ) : isImage ? (
                /* Image frames */
                <div className="w-full h-full flex items-center justify-center p-4 bg-card">
                  <img
                    src={previewData.url || documentService.downloadDocumentUrl(document._id, undefined, true)}
                    alt={document.originalFilename}
                    className="max-h-full max-w-full object-contain rounded-lg shadow"
                  />
                </div>
              ) : (
                <div className="p-4 bg-card h-full overflow-auto font-mono text-xs">
                  <pre>{JSON.stringify(previewData, null, 2)}</pre>
                </div>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 shrink-0">
              * Showing structural metadata preview context. Spreadsheet views are limited to the first 10 rows.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DocumentDetails;
