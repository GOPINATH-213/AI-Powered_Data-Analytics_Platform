import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  isVisible: boolean;
  message: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible, message }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/90 backdrop-blur-md transition-all duration-300 no-print-pdf">
      <div className="p-8 rounded-2xl border border-border bg-card flex flex-col items-center space-y-6 shadow-2xl max-w-sm text-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-foreground">Generating Document Dossier</h4>
          <p className="text-xs text-muted-foreground animate-pulse font-semibold">{message}</p>
        </div>
        <div className="text-[10px] text-muted-foreground/60 leading-relaxed">
          Please wait. Rendering charts, loading vector paths, and generating layouts. Do not close this window.
        </div>
      </div>
    </div>
  );
};
export default LoadingOverlay;
