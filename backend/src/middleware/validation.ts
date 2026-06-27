import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AppError } from './errorHandler';

export function validateDTO(dtoClass: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const instance = plainToInstance(dtoClass, req.body);
      const errors = await validate(instance, {
        skipMissingProperties: false,
        forbidUnknownValues: true,
      });

      if (errors.length > 0) {
        const messages = errors
          .map((error: ValidationError) =>
            Object.values(error.constraints || {}).join(', ')
          )
          .join('; ');

        throw new AppError(400, `Validation failed: ${messages}`);
      }

      req.body = instance;
      next();
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(400, 'Invalid request body'));
      }
    }
  };
}
