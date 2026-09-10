import { Request, Response, NextFunction } from 'express';
import { AuthRequest, canPerformAction } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import importService from '../services/import.service';
import userService from '../services/user.service';
import logger from '../utils/logger';
import * as path from 'path';
import * as fs from 'fs';

export class ImportController {
  async previewMidtImport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Check permission
      if (!canPerformAction(req.user, 'accounts', 'create')) {
        throw new AppError(403, 'You do not have permission to import accounts');
      }

      const file = req.file;
      const mapping = JSON.parse(req.body.mapping || '{}');
      const defaultUserId = req.body.defaultUserId || '';

      if (!file) {
        throw new AppError(400, 'No file uploaded');
      }

      if (Object.keys(mapping).length === 0) {
        throw new AppError(400, 'No column mappings provided');
      }

      // Parse and validate the import (pass original filename for type detection)
      const result = await importService.parseAndValidateImport(file.path, mapping, defaultUserId, file.originalname);

      // Clean up temp file
      fs.unlinkSync(file.path);

      logger.info(`MIDT import preview: ${result.successRows.length} valid, ${result.errorRows.length} errors, ${result.duplicateRows.length} duplicates`);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      // Clean up temp file if it exists
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      next(error);
    }
  }

  async saveMidtImport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Check permission
      if (!canPerformAction(req.user, 'accounts', 'create')) {
        throw new AppError(403, 'You do not have permission to import accounts');
      }

      const rows = req.body.rows;

      if (!Array.isArray(rows) || rows.length === 0) {
        throw new AppError(400, 'No rows provided to save');
      }

      // Validate defaultUserId if provided. It must be a valid UUID that exists.
      let defaultUserId = req.body.defaultUserId;
      if (defaultUserId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(defaultUserId)) {
          throw new AppError(400, 'Invalid user ID format');
        }
        // Verify the user exists
        try {
          await userService.getUserById(defaultUserId);
        } catch {
          throw new AppError(400, 'Selected user does not exist');
        }
      }

      // defaultUserId is the "Assign Default User" selection from the wizard; it
      // determines the creator recorded against every imported account.
      const result = await importService.saveImportedAccounts(
        rows,
        req.user!.id,
        defaultUserId
      );

      logger.info(`MIDT import completed: ${result.savedCount} saved, ${result.failedCount} failed by ${req.user!.email}`);

      return res.status(201).json({
        success: true,
        data: result,
        message: `Successfully imported ${result.savedCount} records`,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ImportController();
