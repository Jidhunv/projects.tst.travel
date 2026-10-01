"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Security: Only allow synchronize if explicitly enabled via DB_SYNC=true AND in development
// NEVER use synchronize in production - always use migrations
const shouldSync = process.env.DB_SYNC === 'true' && process.env.NODE_ENV === 'development';
exports.AppDataSource = new typeorm_1.DataSource({
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
//# sourceMappingURL=database.js.map