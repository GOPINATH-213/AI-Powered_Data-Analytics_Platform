import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Chrome, Lock, UserCheck, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export const Login: React.FC = () => {
  const { loginWithGoogle, isDevBypass, devLogin } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Authentication failed. Please try again.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async (role: 'admin' | 'user' | 'analyst') => {
    setLoading(true);
    setError(null);
    try {
      const email = `${role}-expert@example.com`;
      const name = `${role.charAt(0).toUpperCase() + role.slice(1)} User`;
      await devLogin(email, name);
      navigate('/dashboard');
    } catch (err) {
      setError('Dev Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[250px] h-[250px] bg-violet-600/10 rounded-full blur-[80px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-indigo-600 items-center justify-center text-white font-extrabold text-2xl font-mono mb-4 shadow-lg shadow-indigo-600/30">
            Ω
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">Welcome to InsightNexus</h2>
          <p className="text-sm text-slate-400 mt-2">Sign in to start automating your business intelligence</p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-800 text-red-400 text-sm rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-white text-slate-900 hover:bg-slate-100 disabled:bg-slate-300 font-semibold rounded-xl shadow-md transition-all duration-200"
          >
            <Chrome className="h-5 w-5" />
            Continue with Google
          </button>

          {isDevBypass && (
            <div className="mt-8 border-t border-slate-800 pt-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Shield className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-amber-500 font-bold tracking-wider uppercase">
                  Developer Bypass Active
                </span>
              </div>
              <p className="text-xs text-slate-400 text-center mb-4">
                Firebase credentials not set in environment. Select a mock role to sign in instantly.
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleDevLogin('admin')}
                  disabled={loading}
                  className="flex flex-col items-center justify-center py-2 px-3 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-xs font-semibold gap-1 text-indigo-400"
                >
                  <UserCheck className="h-4 w-4" />
                  Admin
                </button>
                <button
                  onClick={() => handleDevLogin('analyst')}
                  disabled={loading}
                  className="flex flex-col items-center justify-center py-2 px-3 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-xs font-semibold gap-1 text-violet-400"
                >
                  <UserCheck className="h-4 w-4" />
                  Analyst
                </button>
                <button
                  onClick={() => handleDevLogin('user')}
                  disabled={loading}
                  className="flex flex-col items-center justify-center py-2 px-3 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-xs font-semibold gap-1 text-slate-300"
                >
                  <UserCheck className="h-4 w-4" />
                  Standard
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <Lock className="h-3.5 w-3.5" />
          Secured with Firebase Authentication
        </div>
      </motion.div>
    </div>
  );
};
export default Login;
