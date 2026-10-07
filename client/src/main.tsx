import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import DashboardBuilder from './pages/DashboardBuilder';
import DashboardViewer from './pages/DashboardViewer';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import About from './pages/About';
import NotFound from './pages/404';
import Unauthorized from './pages/Unauthorized';
import Upload from './pages/Upload';
import Documents from './pages/Documents';
import DocumentDetails from './pages/DocumentDetails';
import Datasets from './pages/Datasets';
import DatasetDetails from './pages/DatasetDetails';
import DatasetAssessmentPage from './pages/DatasetAssessmentPage';
import CombineDatasets from './pages/CombineDatasets';
import CombinedDatasetManager from './pages/CombinedDatasetManager';
import AIAnalyticsChat from './pages/AIAnalyticsChat';

import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/about" element={<About />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected dashboard routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DashboardBuilder />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboards/:id"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DashboardViewer />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics/:datasetId"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Analytics />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-analytics/:datasetId"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <AIAnalyticsChat />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Profile />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Settings />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Upload />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Documents />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents/:id"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DocumentDetails />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/datasets"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Datasets />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/datasets/:id"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DatasetDetails />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dataset-assessment/:datasetId"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DatasetAssessmentPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/datasets/combine"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <CombineDatasets />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/datasets/combine/:id"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <CombinedDatasetManager />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
