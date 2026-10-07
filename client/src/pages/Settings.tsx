import React from 'react';
import { ThemeToggle } from '../components/ThemeToggle';
import { Settings as SettingsIcon, Eye, BellRing, Database } from 'lucide-react';

export const Settings: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
        <SettingsIcon className="h-6 w-6 text-primary" />
        Settings & Preferences
      </h1>

      <div className="grid grid-cols-1 gap-6">
        {/* Appearance Settings */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Eye className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold">Appearance Theme</h3>
              <p className="text-xs text-muted-foreground">Adjust how the platform looks on your display.</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
            <span className="text-sm font-semibold">Toggle Light / Dark Theme</span>
            <ThemeToggle />
          </div>
        </div>

        {/* Notifications & System Preferences */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <BellRing className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold">Automated Alerts</h3>
              <p className="text-xs text-muted-foreground">Setup alerts for metrics thresholds and file status.</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground/80 bg-secondary/35 p-3 rounded-lg border border-border">
            Alert configuration panel will load in future automation modules.
          </div>
        </div>

        {/* Storage Configuration */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold">Data Storage Nodes</h3>
              <p className="text-xs text-muted-foreground">Manage GridFS & Cloudinary connection schemas.</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground/80 bg-secondary/35 p-3 rounded-lg border border-border">
            Storage credentials settings will load when document uploading is configured.
          </div>
        </div>
      </div>
    </div>
  );
};
export default Settings;
