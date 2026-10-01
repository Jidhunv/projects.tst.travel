"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportController = void 0;
const errorHandler_1 = require("../middleware/errorHandler");
const import_service_1 = __importDefault(require("../services/import.service"));
const user_service_1 = __importDefault(require("../services/user.service"));
const logger_1 = __importDefault(require("../utils/logger"));
const fs = __importStar(require("fs"));
class ImportController {
    async previewMidtImport(req, res, next) {
        try {
            // Bulk MIDT import is Admin-only, not just accounts:create - it can
            // create/overwrite large numbers of accounts at once.
            if (req.user?.role !== 'Admin') {
                throw new errorHandler_1.AppError(403, 'Only Admin can import prospects');
            }
            const file = req.file;
            const mapping = JSON.parse(req.body.mapping || '{}');
            const defaultUserId = req.body.defaultUserId || '';
            if (!file) {
                throw new errorHandler_1.AppError(400, 'No file uploaded');
            }
            if (Object.keys(mapping).length === 0) {
                throw new errorHandler_1.AppError(400, 'No column mappings provided');
            }
            // Parse and validate the import (pass original filename for type detection)
            const result = await import_service_1.default.parseAndValidateImport(file.path, mapping, defaultUserId, file.originalname);
            // Clean up temp file
            fs.unlinkSync(file.path);
            logger_1.default.info(`MIDT import preview: ${result.successRows.length} valid, ${result.errorRows.length} errors, ${result.duplicateRows.length} duplicates`);
            return res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            // Clean up temp file if it exists
            if (req.file) {
                try {
                    fs.unlinkSync(req.file.path);
                }
                catch (e) {
                    // Ignore cleanup errors
                }
            }
            next(error);
        }
    }
    async saveMidtImport(req, res, next) {
        try {
            // Bulk MIDT import is Admin-only, not just accounts:create - it can
            // create/overwrite large numbers of accounts at once.
            if (req.user?.role !== 'Admin') {
                throw new errorHandler_1.AppError(403, 'Only Admin can import prospects');
            }
            const rows = req.body.rows;
            if (!Array.isArray(rows) || rows.length === 0) {
                throw new errorHandler_1.AppError(400, 'No rows provided to save');
            }
            // Validate defaultUserId if provided. It must be a valid UUID that exists.
            let defaultUserId = req.body.defaultUserId;
            if (defaultUserId) {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(defaultUserId)) {
                    throw new errorHandler_1.AppError(400, 'Invalid user ID format');
                }
                // Verify the user exists
                try {
                    await user_service_1.default.getUserById(defaultUserId);
                }
                catch {
                    throw new errorHandler_1.AppError(400, 'Selected user does not exist');
                }
            }
            // defaultUserId is the "Assign Default User" selection from the wizard; it
            // determines the creator recorded against every imported account.
            const result = await import_service_1.default.saveImportedAccounts(rows, req.user.id, defaultUserId);
            logger_1.default.info(`MIDT import completed: ${result.savedCount} saved, ${result.failedCount} failed by ${req.user.email}`);
            return res.status(201).json({
                success: true,
                data: result,
                message: `Successfully imported ${result.savedCount} records`,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ImportController = ImportController;
exports.default = new ImportController();
//# sourceMappingURL=import.controller.js.map