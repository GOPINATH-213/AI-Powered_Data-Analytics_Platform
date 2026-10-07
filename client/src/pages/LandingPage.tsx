import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Cpu, BarChart3, Database } from 'lucide-react';
import { motion } from 'framer-motion';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-xl font-mono shadow-lg shadow-indigo-600/30">
              Ω
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              InsightNexus
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold hover:text-indigo-400 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-600/20 transition-all duration-200"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 max-w-7xl mx-auto px-6 flex flex-col items-center text-center">
        {/* Background Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/5 text-indigo-400 text-xs font-semibold mb-6 shadow-inner"
        >
          <Bot className="h-4 w-4" />
          The Intelligent Agentic Business Analyst
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-5xl font-sans bg-gradient-to-r from-white via-indigo-200 to-purple-400 bg-clip-text text-transparent leading-tight"
        >
          InsightNexus: An Intelligent Platform for Integrated Business Analytics
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl font-light leading-relaxed"
        >
          Upload files, auto-generate responsive dashboards, ask questions in natural English, and monitor predictions effortlessly. Keep your data continuously synchronized in real-time.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row gap-4"
        >
          <Link
            to="/login"
            className="group inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-600/30 transition-all duration-200"
          >
            Launch Platform
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/about"
            className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 transition-colors"
          >
            Learn More
          </Link>
        </motion.div>
      </section>

      {/* Feature Section */}
      <section className="py-20 border-t border-slate-900 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight">Everything you need to automate BI</h2>
            <p className="mt-4 text-slate-400 font-light">From data pipelines to custom predictions, all managed by autonomous AI agents.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-sm">
              <div className="h-10 w-10 rounded-xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center mb-4">
                <Database className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">Smart Ingest</h3>
              <p className="mt-2 text-slate-400 text-sm font-light">Upload Excel, CSV, PDF, or connect to SQL and APIs. The system handles parsing and structures data instantly.</p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-sm">
              <div className="h-10 w-10 rounded-xl bg-violet-600/10 text-violet-400 flex items-center justify-center mb-4">
                <Cpu className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">Predictive Engines</h3>
              <p className="mt-2 text-slate-400 text-sm font-light">Forecast sales, profit margins, demand trends, and critical KPIs without needing an internal machine learning team.</p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-sm">
              <div className="h-10 w-10 rounded-xl bg-pink-600/10 text-pink-400 flex items-center justify-center mb-4">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">Auto-Dashboards</h3>
              <p className="mt-2 text-slate-400 text-sm font-light">Watch as the platform cleans and parses datasets, picking optimal visualizations to form interactive dashboards.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-8 px-6 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} InsightNexus. All rights reserved.</p>
      </footer>
    </div>
  );
};
export default LandingPage;
