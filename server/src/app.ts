import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env, connectDB } from './config';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import healthRoutes from './routes/healthRoutes';
import documentRoutes from './routes/documentRoutes';
import datasetRoutes from './routes/datasetRoutes';
import mediaRoutes from './routes/mediaRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import datasetAssessmentRoutes from './routes/datasetAssessmentRoutes';
import combinedDatasetRoutes from './routes/combinedDatasetRoutes';
import reportRoutes from './routes/reportRoutes';
import aiAnalyticsRoutes from './routes/aiAnalyticsRoutes';
import { errorHandler, notFoundHandler } from './middleware/error';

const app = express();

// Connect to MongoDB
connectDB();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: '*', // Adjust to specific frontend domain in production
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger
if (env.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Limit each IP to 2000 requests per windowMs (prevents session lockouts)
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Mount API routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/dataset-assessment', datasetAssessmentRoutes);
app.use('/api/combined-datasets', combinedDatasetRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai-analytics', aiAnalyticsRoutes);

// Handle 404 & Global Errors
app.use(notFoundHandler);
app.use(errorHandler);

// Start listening
const server = app.listen(env.port, () => {
  console.log(`[Server] Running in ${env.nodeEnv} mode on port ${env.port}`);
});

export default app;
