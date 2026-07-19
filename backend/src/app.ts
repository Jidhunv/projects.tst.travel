import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { AppDataSource } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { tracingMiddleware } from './middleware/tracing';
import { auditMiddleware } from './middleware/audit';
import { generateCsrfToken, verifyCsrfToken } from './middleware/csrf';
import { sanitizeResponse } from './middleware/sanitizeResponse';
import traceService from './services/trace.service';
import logger from './utils/logger';
import ensurePermissions from './utils/ensurePermissions';

// Import routes (will be created next)
// import authRoutes from './routes/auth';
// import leadRoutes from './routes/leads';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Behind a proxy/load balancer, req.ip is the proxy unless we trust the
// X-Forwarded-For chain -- which would make per-IP rate limiting useless.
// Opt in explicitly: TRUST_PROXY=1 (hops) or a subnet, never blanket-true.
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  app.set('trust proxy', Number.isFinite(hops) ? hops : process.env.TRUST_PROXY);
}

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
// Production origins come from ALLOWED_ORIGINS (comma-separated) so no external
// site can make credentialed requests. The localhost defaults are development
// only -- in production they would let anything served on the victim's own
// machine call the API with their cookies.
const allowedOrigins = [
  ...(isProduction
    ? []
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001']),
  ...(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Session-ID'],
  exposedHeaders: ['X-CSRF-Token'],
}));
// Limit request payload size to prevent DOS
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
// Strip sensitive fields (password hashes, reset tokens) from every response
app.use(sanitizeResponse);
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
import productCategoryRoutes from './routes/product-categories';
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
import emailSettingsRoutes from './routes/email-settings';
import supplierRoutes from './routes/suppliers';
import salesVisitRoutes from './routes/sales-visits';
import expenseRoutes from './routes/expenses';
import countryRoutes from './routes/countries';

// Database initialization
AppDataSource.initialize()
  .then(async () => {
    logger.info('Database connection established');
    // Ensure the permission catalog is up to date for newly added modules.
    await ensurePermissions();
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
app.use('/api/product-categories', productCategoryRoutes);
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
app.use('/api/email-settings', emailSettingsRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/sales-visits', salesVisitRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/countries', countryRoutes);

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
