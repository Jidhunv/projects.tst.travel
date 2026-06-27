import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { AppDataSource } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { tracingMiddleware } from './middleware/tracing';
import { auditMiddleware } from './middleware/audit';
import { generateCsrfToken, verifyCsrfToken } from './middleware/csrf';
import traceService from './services/trace.service';
import logger from './utils/logger';

// Import routes (will be created next)
// import authRoutes from './routes/auth';
// import leadRoutes from './routes/leads';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Session-ID'],
  exposedHeaders: ['X-CSRF-Token'],
}));
// Limit request payload size to prevent DOS
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
// Enable CSRF protection
app.use(generateCsrfToken);
app.use(verifyCsrfToken);
// Enable tracing for all requests (must be before routes)
app.use((req: any, res, next) => tracingMiddleware(req, res, next));
// Enable audit logging for all requests
app.use((req: any, res, next) => auditMiddleware(req, res, next));

// Import routes
import authRoutes from './routes/auth';
import leadRoutes from './routes/leads';
import accountRoutes from './routes/accounts';
import opportunityRoutes from './routes/opportunities';
import productRoutes from './routes/products';
import activityRoutes from './routes/activities';
import userRoutes from './routes/users';
import reportRoutes from './routes/reports';
import traceRoutes from './routes/traces';
import contractRoutes from './routes/contracts';
import projectRoutes from './routes/projects';
import invoiceRoutes from './routes/invoices';
import ticketRoutes from './routes/tickets';
import auditLogRoutes from './routes/audit-logs';
import notificationRoutes from './routes/notifications';
import roleRoutes from './routes/roles';

// Database initialization
AppDataSource.initialize()
  .then(() => {
    logger.info('Database connection established');
  })
  .catch((error) => {
    logger.error('Database connection error:', error);
    process.exit(1);
  });

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/products', productRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/traces', traceRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/roles', roleRoutes);

// Save traces after response completes (for debugging)
app.use((req: any, res, next) => {
  res.on('finish', () => {
    if (req.traceId) {
      traceService.saveTrace(req.traceId);
    }
  });
  next();
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export default app;
