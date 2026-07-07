import multer, { StorageEngine, Multer } from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import logger from '../utils/logger';

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Allowed file types
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx'];
const MIME_TYPES: { [key: string]: string[] } = {
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
const storage: StorageEngine = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    const ticketId = req.params.id;

    // Validate ticket ID to prevent path traversal
    if (!ticketId || !/^[a-f0-9-]{36}$/.test(ticketId)) {
      cb(new Error('Invalid ticket ID'));
      return;
    }

    const ticketUploadDir = path.join(UPLOAD_DIR, 'tickets', ticketId);

    // Create directory if it doesn't exist
    fs.mkdir(ticketUploadDir, { recursive: true }, (err: NodeJS.ErrnoException | null) => {
      if (err) {
        cb(err);
      } else {
        cb(null, ticketUploadDir);
      }
    });
  },
  filename: (req: any, file: any, cb: any) => {
    // Generate secure filename: timestamp_random_originalName
    const ext = path.extname(file.originalname).toLowerCase();
    const basename = path.basename(file.originalname, ext);
    const sanitizedName = basename.replace(/[^a-z0-9-]/gi, '_').substring(0, 50);
    const randomStr = crypto.randomBytes(4).toString('hex');
    const timestamp = Date.now();

    const filename = `${timestamp}_${randomStr}_${sanitizedName}${ext}`;
    cb(null, filename);
  },
});

// File filter for security validation
const fileFilter = (req: any, file: any, cb: any) => {
  const ext = path.extname(file.originalname).toLowerCase().substring(1);
  const mimeType = file.mimetype;

  // Check extension is allowed
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    logger.warn(`File upload blocked: invalid extension ${ext} for file ${file.originalname}`);
    cb(new Error(`File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`));
    return;
  }

  // Check MIME type matches extension
  const allowedMimes = MIME_TYPES[ext];
  if (allowedMimes && !allowedMimes.includes(mimeType)) {
    logger.warn(`File upload blocked: MIME type mismatch for ${file.originalname}. Expected ${allowedMimes.join('|')}, got ${mimeType}`);
    cb(new Error(`Invalid file format for extension ${ext}`));
    return;
  }

  // Check filename doesn't contain path traversal attempts
  if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
    logger.warn(`File upload blocked: path traversal attempt in ${file.originalname}`);
    cb(new Error('Invalid filename'));
    return;
  }

  cb(null, true);
};

// Create multer instance with security settings
export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
}).single('file');

// Middleware wrapper for error handling
export const uploadMiddleware = (req: any, res: any, next: (error?: any) => void) => {
  (uploadSingle as any)(req, res, (err: any) => {
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
    } else if (err) {
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

export default { uploadMiddleware, uploadSingle };
