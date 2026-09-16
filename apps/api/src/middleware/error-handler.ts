import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { sendError } from './envelope.js';
import crypto from 'crypto';

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  const correlationId = crypto.randomUUID();

  // 1. Zod Validation Error
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    return sendError(
      res,
      'VALIDATION_ERROR',
      'One or more fields failed validation.',
      422,
      formattedErrors
    );
  }

  // 2. Custom AppError
  if (err instanceof AppError) {
    return sendError(res, err.code, err.message, err.statusCode, err.details);
  }

  // 3. Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[]) || [];
      return sendError(
        res,
        'DUPLICATE_ENTRY',
        `A record with this ${target.join(', ') || 'field'} already exists.`,
        409
      );
    }
    if (err.code === 'P2025') {
      return sendError(res, 'NOT_FOUND', 'Requested record was not found.', 404);
    }
  }

  // 4. Fallthrough Server Error
  console.error(`[Error] [CorrelationId: ${correlationId}]`, err);
  return sendError(
    res,
    'INTERNAL_SERVER_ERROR',
    `An unexpected internal error occurred. Support correlation ID: ${correlationId}`,
    500
  );
}
