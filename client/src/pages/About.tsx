import React from 'react';
import { Info, HelpCircle, Layers, ShieldCheck } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
        <Info className="h-6 w-6 text-primary" />
        About InsightNexus Platform
      </h1>

      <div className="p-6 rounded-2xl bg-card border border-border space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Project Architecture Goal</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            InsightNexus: An Intelligent Platform for Integrated Business Analytics is built to automate structured and unstructured data ingestion. By leveraging agentic AI services, it cleans tabular documents, designs optimal visual dashboard layouts, and offers predictive forecasting models.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-2">
            <h3 className="font-bold text-sm flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-indigo-500" />
              Hybrid Storage Core
            </h3>
            <p className="text-xs text-muted-foreground">
              Built on MongoDB Atlas database and Atlas GridFS for binary document streaming, with Cloudinary image hosting placeholders ready.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-2">
            <h3 className="font-bold text-sm flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Secure Sessions
            </h3>
            <p className="text-xs text-muted-foreground">
              Integrates Firebase Google Sign-In with local JWT token signing middleware, providing strict role verification.
            </p>
          </div>
        </div>

        {/* Technology Stack & Security Badges Section */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h3 className="text-lg font-bold text-foreground">Technology Stack & Security Profile</h3>
          
          <div className="space-y-3">
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Built With</span>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">React</span>
                <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">TypeScript</span>
                <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-sky-500/10 text-sky-500 border border-sky-500/20">Tailwind CSS</span>
                <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-green-500/10 text-green-500 border border-green-500/20">Node.js</span>
                <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-500/10 text-slate-500 border border-slate-500/20">Express</span>
                <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">MongoDB / Mongoose</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Analytics & Visualization</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Powered by the platform's **Dataset Intelligence Engine** and rendered using **Recharts (SVG Chart Engine)**.
              </p>
            </div>

            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Secure Authentication</span>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  Secured with Firebase Authentication
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Securely processed and protected. Your data session is validated with secure server-side JWT tokens.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/50 flex gap-3">
          <HelpCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <span className="font-semibold text-foreground">Phase 1 Foundation Complete</span>
            <p className="text-muted-foreground">
              Routing structures, login controllers, responsive layouts, and connection libraries are set up and fully verified.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default About;
