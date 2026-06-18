import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { AppDataSource } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';

// Import routes (will be created next)
// import authRoutes from './routes/auth';
// import leadRoutes from './routes/leads';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
import authRoutes from './routes/auth';
import leadRoutes from './routes/leads';
import accountRoutes from './routes/accounts';
import opportunityRoutes from './routes/opportunities';

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

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export default app;
