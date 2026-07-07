import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { logSecurityEvent, requestContext } from '../utils/securityLogger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    // Centrally record authorization failures raised by controllers
    // (e.g. canPerformAction / canAccessRecord throwing AppError(403)).
    if (err.statusCode === 403) {
      const user = (req as any).user;
      logSecurityEvent('ACCESS_DENIED', {
        ...requestContext(req),
        userId: user?.id,
        email: user?.email,
        role: user?.role,
        reason: err.message,
      });
    }
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  logger.error('Unhandled error:', err);

  return res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
};
