import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon, File, X, AlertCircle, CheckCircle2, RotateCcw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { documentService } from '../services/documentService';
import { cn } from '../utils/cn';

interface UploadQueueItem {
  id: string;
  file: File;
  progress: number;
  status: 'idle' | 'uploading' | 'success' | 'error';
  error?: string;
  cancelSource?: any;
}

export const Upload: React.FC = () => {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [changeDescription, setChangeDescription] = useState('Initial upload');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newItems = acceptedFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status: 'idle' as const,
    }));
    setQueue((prev) => [...prev, ...newItems]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 15 * 1024 * 1024, // 15MB
  });

  const removeFile = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const uploadFile = async (item: UploadQueueItem) => {
    // Prevent double uploads
    if (item.status === 'uploading' || item.status === 'success') return;

    setQueue((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: 'uploading', progress: 0 } : i))
    );

    try {
      await documentService.uploadDocument(item.file, changeDescription, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setQueue((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, progress: percentCompleted } : i))
        );
      });

      setQueue((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'success', progress: 100 } : i))
      );
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Upload failed.';
      setQueue((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'error', error: errMsg } : i))
      );
    }
  };

  const uploadAll = () => {
    queue.forEach((item) => {
      if (item.status === 'idle' || item.status === 'error') {
        uploadFile(item);
      }
    });
  };

  const clearQueue = () => {
    setQueue([]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Upload Business Documents</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload structured spreadsheets (Excel, CSV, JSON) or unstructured files (PDF, Word, Images) up to 15MB.
        </p>
      </div>

      {/* Drag & Drop Area */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 bg-card",
          isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        )}
      >
        <input {...getInputProps()} />
        <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
          <UploadIcon className="h-6 w-6" />
        </div>
        <p className="font-semibold text-center text-sm md:text-base">
          {isDragActive ? 'Drop your files here' : 'Drag & drop files here, or click to browse'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Excel, CSV, JSON, PDF, Word, JPEG, PNG (Max 15MB)
        </p>
      </div>

      {/* Options Panel */}
      {queue.length > 0 && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-4">
          <h3 className="font-bold text-sm">Upload Specifications</h3>
          <div>
            <label className="block text-xs text-muted-foreground font-semibold mb-2">VERSION DESCRIPTION / CHANGELOG</label>
            <input
              type="text"
              value={changeDescription}
              onChange={(e) => setChangeDescription(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="e.g. Initial Q2 data, Updated sales spreadsheet, etc."
            />
          </div>
        </div>
      )}

      {/* Queue List */}
      {queue.length > 0 && (
        <div className="space-y-4 bg-card border border-border rounded-2xl p-4 md:p-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="font-bold text-lg">Upload Queue ({queue.length} files)</h2>
            <div className="flex gap-2">
              <button
                onClick={clearQueue}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-secondary border border-border"
              >
                Clear Queue
              </button>
              <button
                onClick={uploadAll}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95"
              >
                Upload All
              </button>
            </div>
          </div>

          <ul className="divide-y divide-border">
            <AnimatePresence>
              {queue.map((item) => (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
                      <File className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-semibold truncate">{item.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(item.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>

                      {/* Progress Bar */}
                      {item.status === 'uploading' && (
                        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden mt-2">
                          <div
                            className="bg-primary h-full rounded-full transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}

                      {/* Error text */}
                      {item.status === 'error' && (
                        <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {item.error}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    {item.status === 'success' && (
                      <span className="text-emerald-500 flex items-center gap-1 text-xs font-semibold">
                        <CheckCircle2 className="h-4 w-4" /> Ready
                      </span>
                    )}

                    {item.status === 'uploading' && (
                      <span className="text-primary flex items-center gap-1.5 text-xs font-semibold">
                        <Loader2 className="h-4.5 w-4.5 animate-spin" /> {item.progress}%
                      </span>
                    )}

                    {item.status === 'idle' && (
                      <button
                        onClick={() => uploadFile(item)}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-secondary hover:bg-muted-foreground/15 border border-border"
                      >
                        Upload
                      </button>
                    )}

                    {item.status === 'error' && (
                      <button
                        onClick={() => uploadFile(item)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary border border-border"
                        title="Retry"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}

                    <button
                      onClick={() => removeFile(item.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-secondary"
                      title="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}
    </div>
  );
};
export default Upload;
