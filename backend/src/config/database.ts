import { DataSource } from 'typeorm';
import dotenv from 'dotenv';

dotenv.config();

// Security: Only allow synchronize if explicitly enabled via DB_SYNC=true AND in development
// NEVER use synchronize in production - always use migrations
const shouldSync = process.env.DB_SYNC === 'true' && process.env.NODE_ENV === 'development';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'crm_user',
  password: process.env.DB_PASSWORD || 'crm_password',
  database: process.env.DB_NAME || 'crm_db',
  synchronize: shouldSync,
  logging: ['error', 'warn'],
  entities: [__dirname + '/../models/**/*.{ts,js}'],
  migrations: [__dirname + '/../../migrations/**/*.{ts,js}'],
  subscribers: [],
});
