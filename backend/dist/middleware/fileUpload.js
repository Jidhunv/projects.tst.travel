"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMiddleware = exports.uploadSingle = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = __importDefault(require("../utils/logger"));
const UPLOAD_DIR = path_1.default.join(__dirname, '../../uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
// Ensure upload directory exists
if (!fs_1.default.existsSync(UPLOAD_DIR)) {
    fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
}
// Allowed file types
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx'];
const MIME_TYPES = {
    'jpg': ['image/jpeg'],
    'jpeg': ['image/jpeg'],
    'png': ['image/png'],
    'gif': ['image/gif'],
    'webp': ['image/webp'],
    'pdf': ['application/pdf'],
    'doc': ['application/msword'],
    'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};
// Custom storage engine for security
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const ticketId = req.params.id;
        // Validate ticket ID to prevent path traversal
        if (!ticketId || !/^[a-f0-9-]{36}$/.test(ticketId)) {
            cb(new Error('Invalid ticket ID'));
            return;
        }
        const ticketUploadDir = path_1.default.join(UPLOAD_DIR, 'tickets', ticketId);
        // Create directory if it doesn't exist
        fs_1.default.mkdir(ticketUploadDir, { recursive: true }, (err) => {
            if (err) {
                cb(err);
            }
            else {
                cb(null, ticketUploadDir);
            }
        });
    },
    filename: (req, file, cb) => {
        // Generate secure filename: timestamp_random_originalName
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        const basename = path_1.default.basename(file.originalname, ext);
        const sanitizedName = basename.replace(/[^a-z0-9-]/gi, '_').substring(0, 50);
        const randomStr = crypto_1.default.randomBytes(4).toString('hex');
        const timestamp = Date.now();
        const filename = `${timestamp}_${randomStr}_${sanitizedName}${ext}`;
        cb(null, filename);
    },
});
// File filter for security validation
const fileFilter = (req, file, cb) => {
    const ext = path_1.default.extname(file.originalname).toLowerCase().substring(1);
    const mimeType = file.mimetype;
    // Check extension is allowed
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        logger_1.default.warn(`File upload blocked: invalid extension ${ext} for file ${file.originalname}`);
        cb(new Error(`File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`));
        return;
    }
    // Check MIME type matches extension
    const allowedMimes = MIME_TYPES[ext];
    if (allowedMimes && !allowedMimes.includes(mimeType)) {
        logger_1.default.warn(`File upload blocked: MIME type mismatch for ${file.originalname}. Expected ${allowedMimes.join('|')}, got ${mimeType}`);
        cb(new Error(`Invalid file format for extension ${ext}`));
        return;
    }
    // Check filename doesn't contain path traversal attempts
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
        logger_1.default.warn(`File upload blocked: path traversal attempt in ${file.originalname}`);
        cb(new Error('Invalid filename'));
        return;
    }
    cb(null, true);
};
// Create multer instance with security settings
exports.uploadSingle = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1,
    },
}).single('file');
// Middleware wrapper for error handling
const uploadMiddleware = (req, res, next) => {
    exports.uploadSingle(req, res, (err) => {
        if (err && err.name === 'MulterError') {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
                });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    success: false,
                    error: 'Only one file can be uploaded at a time',
                });
            }
            return res.status(400).json({
                success: false,
                error: err.message || 'File upload failed',
            });
        }
        else if (err) {
            return res.status(400).json({
                success: false,
                error: err.message || 'File upload failed',
            });
        }
        // Validate file was uploaded for state-changing requests
        if (!req.file && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded',
            });
        }
        next();
    });
};
exports.uploadMiddleware = uploadMiddleware;
exports.default = { uploadMiddleware: exports.uploadMiddleware, uploadSingle: exports.uploadSingle };
//# sourceMappingURL=fileUpload.js.map