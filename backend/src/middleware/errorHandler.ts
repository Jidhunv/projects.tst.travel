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

  // Postgres rejects a value of the wrong type (for example a malformed UUID in the URL).
  // That is a bad request, not a server fault.
  if ((err as any).code === '22P02') {
    return res.status(400).json({
      success: false,
      error: 'Invalid identifier or value',
    });
  }

  if ((err as any).type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Request payload too large',
    });
  }

  logger.error('Unhandled error:', err);

  return res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
};
