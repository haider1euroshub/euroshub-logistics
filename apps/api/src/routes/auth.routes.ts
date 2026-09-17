import { Router, Request, Response, NextFunction } from 'express';
import { registerSchema, adminCreateUserSchema, Role } from '@eliteship/shared';
import { prisma } from '../lib/prisma.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { sendSuccess } from '../middleware/envelope.js';
import { AppError } from '../middleware/error-handler.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { AuditService } from '../services/audit.service.js';

const router = Router();

/**
 * POST /api/auth/register
 * Public customer self-registration.
 * Role is strictly forced to CUSTOMER on the server.
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if user already exists locally
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      throw new AppError('An account with this email address already exists.', 409, 'USER_ALREADY_EXISTS');
    }

    // 1. Create user in Supabase Auth with unconfirmed email
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: false,
      user_metadata: {
        fullName: data.fullName,
        role: Role.CUSTOMER,
      },
    });

    if (authError || !authData.user) {
      throw new AppError(authError?.message || 'Failed to create user account.', 400, 'AUTH_ERROR');
    }

    // 2. Trigger confirmation email via Supabase
    try {
      await supabaseAdmin.auth.resend({
        type: 'signup',
        email: data.email,
      });
    } catch {
      // Supabase email initiation logged if SMTP unconfigured; continue flow
    }

    // 3. Provision local User + CustomerProfile with rollback on failure
    let user;
    try {
      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            supabaseUserId: authData.user.id,
            email: data.email,
            fullName: data.fullName,
            phone: data.phone,
            role: Role.CUSTOMER, // ALWAYS forced to CUSTOMER
            isActive: true,
            customerProfile: {
              create: {},
            },
          },
          include: {
            customerProfile: true,
          },
        });
        return newUser;
      });
    } catch (dbError) {
      // Clean up orphaned Supabase auth user if local DB insert fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => {});
      throw dbError;
    }

    return sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        emailConfirmed: false,
      },
      message: 'Registration successful. A verification email has been sent. Please confirm your email address before logging in.',
    }, 201);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Returns authenticated user's profile and role.
 */
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    return sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        customerProfile: user.customerProfile,
        driverProfile: user.driverProfile,
        hubStaffProfile: user.hubStaffProfile,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/users
 * ADMIN ONLY — provision staff accounts (ADMIN, HUB_STAFF, DRIVER).
 */
router.post(
  '/admin/users',
  authenticate,
  requireRole([Role.ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = adminCreateUserSchema.parse(req.body);

      // 1. Create in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          fullName: data.fullName,
          role: data.role,
        },
      });

      if (authError || !authData.user) {
        throw new AppError(authError?.message || 'Failed to create staff user.', 400, 'AUTH_ERROR');
      }

      // 2. Create in DB with specific profile
      const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            supabaseUserId: authData.user.id,
            email: data.email,
            fullName: data.fullName,
            phone: data.phone,
            role: data.role,
            isActive: true,
          },
        });

        if (data.role === Role.HUB_STAFF) {
          await tx.hubStaffProfile.create({
            data: {
              userId: newUser.id,
              hubId: data.hubId!,
            },
          });
        } else if (data.role === Role.DRIVER) {
          await tx.driverProfile.create({
            data: {
              userId: newUser.id,
              homeHubId: data.homeHubId || null,
            },
          });
        }

        return newUser;
      });

      await AuditService.log({
        actorUserId: req.user!.id,
        actorRole: req.user!.role,
        action: 'CREATE_STAFF_USER',
        entityType: 'User',
        entityId: user.id,
        metadataJson: { email: user.email, role: user.role },
      });

      return sendSuccess(res, { user }, 201);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
