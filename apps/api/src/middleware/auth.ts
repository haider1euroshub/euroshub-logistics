import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { AppError } from './error-handler.js';
import { User, Role, CustomerProfile, DriverProfile, HubStaffProfile } from '@prisma/client';
import { supabaseAdmin } from '../lib/supabase.js';

export interface AuthenticatedUser extends User {
  customerProfile?: CustomerProfile | null;
  driverProfile?: DriverProfile | null;
  hubStaffProfile?: HubStaffProfile | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Please log in.', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    let supabaseUserId: string | undefined;

    // 1. First attempt JWT verification with secret
    if (env.SUPABASE_JWT_SECRET && env.SUPABASE_JWT_SECRET !== 'mock-jwt-secret') {
      try {
        const decoded = jwt.verify(token, env.SUPABASE_JWT_SECRET) as { sub?: string };
        supabaseUserId = decoded.sub;
      } catch (err) {
        // Fall back to Supabase client auth verification
      }
    }

    // 2. If not decoded via secret, verify directly with Supabase Admin client
    if (!supabaseUserId) {
      const { data: { user: sbUser }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !sbUser) {
        throw new AppError('Invalid or expired authentication session.', 401, 'UNAUTHORIZED');
      }
      supabaseUserId = sbUser.id;
    }

    if (!supabaseUserId) {
      throw new AppError('Invalid token subject.', 401, 'UNAUTHORIZED');
    }

    // 3. Resolve local User record
    const user = await prisma.user.findUnique({
      where: { supabaseUserId },
      include: {
        customerProfile: true,
        driverProfile: {
          include: { homeHub: true, vehicle: true },
        },
        hubStaffProfile: {
          include: { hub: true },
        },
      },
    });

    if (!user) {
      throw new AppError('User profile not found. Please contact support.', 401, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated. Please contact support.', 403, 'ACCOUNT_INACTIVE');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
