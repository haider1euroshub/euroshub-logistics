import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AppError } from './error-handler.js';

export function requireRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403, 'FORBIDDEN')
      );
    }

    next();
  };
}
