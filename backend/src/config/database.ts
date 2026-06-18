import { DataSource } from 'typeorm';
import dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'crm_user',
  password: process.env.DB_PASSWORD || 'crm_password',
  database: process.env.DB_NAME || 'crm_db',
  synchronize: process.env.NODE_ENV === 'development',
  logging: ['error', 'warn'],
  entities: [__dirname + '/../models/**/*.{ts,js}'],
  migrations: [__dirname + '/../../migrations/**/*.{ts,js}'],
  subscribers: [],
});
