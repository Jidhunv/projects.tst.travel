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
// Connection settings come only from the environment (backend/.env). There are no
// built-in fallbacks, so a missing value stops the backend at start-up.
const requiredEnv = (name) => {
    const value = process.env[name];
    if (!value)
        throw new Error(`${name} must be set in backend/.env`);
    return value;
};
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: requiredEnv('DB_HOST'),
    port: parseInt(requiredEnv('DB_PORT'), 10),
    username: requiredEnv('DB_USERNAME'),
    password: requiredEnv('DB_PASSWORD'),
    database: requiredEnv('DB_NAME'),
    synchronize: shouldSync,
    logging: ['error', 'warn'],
    entities: [__dirname + '/../models/**/*.{ts,js}'],
    migrations: [__dirname + '/../../migrations/**/*.{ts,js}'],
    subscribers: [],
});
//# sourceMappingURL=database.js.map