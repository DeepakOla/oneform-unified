/**
 * OneForm Unified Platform — Global Error Handler
 *
 * Express 5 uses async error handling natively.
 * This middleware catches all errors and returns consistent API error responses.
 *
 * @module error.middleware
 */
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import { API_ERROR_CODES } from '@oneform/shared-types';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.headers['x-request-id'] as string;

  // Known app error
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId,
      },
    });
    return;
  }

  // Zod validation error
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: API_ERROR_CODES.VALIDATION_ERROR,
        message: 'Request validation failed.',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          code: e.code,
          message: e.message,
        })),
        requestId,
      },
    });
    return;
  }

  // Prisma unique constraint violation
  if ((error as { code?: string }).code === 'P2002') {
    res.status(409).json({
      success: false,
      error: {
        code: API_ERROR_CODES.CONFLICT,
        message: 'A record with this value already exists.',
        requestId,
      },
    });
    return;
  }

  // Unknown error — log and return 500
  logger.error(
    {
      error: { message: error.message, stack: error.stack },
      path: req.path,
      method: req.method,
      requestId,
    },
    'Unhandled error in request',
  );

  res.status(500).json({
    success: false,
    error: {
      code: API_ERROR_CODES.INTERNAL_ERROR,
      message:
        process.env['NODE_ENV'] === 'production'
          ? 'An unexpected error occurred. Please try again.'
          : error.message,
      requestId,
    },
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: API_ERROR_CODES.NOT_FOUND,
      message: `Route ${req.method} ${req.path} not found.`,
    },
  });
}
