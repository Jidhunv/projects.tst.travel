"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const errorHandler_1 = require("./middleware/errorHandler");
const tracing_1 = require("./middleware/tracing");
const audit_1 = require("./middleware/audit");
const csrf_1 = require("./middleware/csrf");
const sanitizeResponse_1 = require("./middleware/sanitizeResponse");
const logger_1 = __importDefault(require("./utils/logger"));
const ensurePermissions_1 = __importDefault(require("./utils/ensurePermissions"));
// Import routes (will be created next)
// import authRoutes from './routes/auth';
// import leadRoutes from './routes/leads';
dotenv_1.default.config();
const app = (0, express_1.default)();
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
app.use((0, helmet_1.default)({
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
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Session-ID'],
    exposedHeaders: ['X-CSRF-Token'],
}));
// MIDT import posts every previewed row in one JSON body, which passes 10kb at
// ~35 rows. Mounted before the global parser so body-parser marks the body read
// and the 10kb cap below no-ops for this path only.
app.use('/api/accounts/import/save', express_1.default.json({ limit: '5mb' }));
// Limit request payload size to prevent DOS
app.use(express_1.default.json({ limit: '10kb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10kb' }));
// Strip sensitive fields (password hashes, reset tokens) from every response
app.use(sanitizeResponse_1.sanitizeResponse);
// Enable CSRF protection
app.use(csrf_1.generateCsrfToken);
app.use(csrf_1.verifyCsrfToken);
// Enable tracing for all requests (must be before routes)
app.use((req, res, next) => (0, tracing_1.tracingMiddleware)(req, res, next));
// Enable audit logging for all requests
app.use((req, res, next) => (0, audit_1.auditMiddleware)(req, res, next));
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const leads_1 = __importDefault(require("./routes/leads"));
const accounts_1 = __importDefault(require("./routes/accounts"));
const opportunities_1 = __importDefault(require("./routes/opportunities"));
const products_1 = __importDefault(require("./routes/products"));
const product_categories_1 = __importDefault(require("./routes/product-categories"));
const activities_1 = __importDefault(require("./routes/activities"));
const users_1 = __importDefault(require("./routes/users"));
const reports_1 = __importDefault(require("./routes/reports"));
const traces_1 = __importDefault(require("./routes/traces"));
const contracts_1 = __importDefault(require("./routes/contracts"));
const projects_1 = __importDefault(require("./routes/projects"));
const invoices_1 = __importDefault(require("./routes/invoices"));
const tickets_1 = __importDefault(require("./routes/tickets"));
const audit_logs_1 = __importDefault(require("./routes/audit-logs"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const roles_1 = __importDefault(require("./routes/roles"));
const email_settings_1 = __importDefault(require("./routes/email-settings"));
const suppliers_1 = __importDefault(require("./routes/suppliers"));
const teams_1 = __importDefault(require("./routes/teams"));
const sales_visits_1 = __importDefault(require("./routes/sales-visits"));
const expenses_1 = __importDefault(require("./routes/expenses"));
const countries_1 = __importDefault(require("./routes/countries"));
const performance_1 = __importDefault(require("./routes/performance"));
const designations_1 = __importDefault(require("./routes/designations"));
// Database initialization
database_1.AppDataSource.initialize()
    .then(async () => {
    logger_1.default.info('Database connection established');
    // Ensure the permission catalog is up to date for newly added modules.
    await (0, ensurePermissions_1.default)();
})
    .catch((error) => {
    logger_1.default.error('Database connection error:', error);
    process.exit(1);
});
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Server is running' });
});
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/leads', leads_1.default);
app.use('/api/accounts', accounts_1.default);
app.use('/api/opportunities', opportunities_1.default);
app.use('/api/products', products_1.default);
app.use('/api/product-categories', product_categories_1.default);
app.use('/api/activities', activities_1.default);
app.use('/api/users', users_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/traces', traces_1.default);
app.use('/api/contracts', contracts_1.default);
app.use('/api/projects', projects_1.default);
app.use('/api/invoices', invoices_1.default);
app.use('/api/tickets', tickets_1.default);
app.use('/api/audit-logs', audit_logs_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/roles', roles_1.default);
app.use('/api/email-settings', email_settings_1.default);
app.use('/api/suppliers', suppliers_1.default);
app.use('/api/teams', teams_1.default);
app.use('/api/sales-visits', sales_visits_1.default);
app.use('/api/expenses', expenses_1.default);
app.use('/api/countries', countries_1.default);
app.use('/api/designations', designations_1.default);
app.use('/api/performance', performance_1.default);
// Error handling middleware
app.use(errorHandler_1.errorHandler);
// Start server
app.listen(PORT, () => {
    logger_1.default.info(`Server running on port ${PORT}`);
});
exports.default = app;
//# sourceMappingURL=app.js.map