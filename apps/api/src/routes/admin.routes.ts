import { Router, Request, Response, NextFunction } from 'express';
import {
  Role,
  createHubSchema,
  updateHubSchema,
  createVehicleSchema,
  updateVehicleSchema,
  createPricingRuleSchema,
  updatePricingRuleSchema,
  estimatePricingSchema,
} from '@eliteship/shared';
import { prisma } from '../lib/prisma.js';
import { sendSuccess } from '../middleware/envelope.js';
import { AppError } from '../middleware/error-handler.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { AuditService } from '../services/audit.service.js';
import { PricingService } from '../services/pricing.service.js';

const router = Router();

// =============================================================================
// PRICING ESTIMATION (Public/Authenticated)
// =============================================================================
router.post('/pricing/estimate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = estimatePricingSchema.parse(req.body);
    const estimation = await PricingService.calculatePrice({
      serviceType: data.serviceType,
      originCity: data.originZone,
      destinationCity: data.destinationZone,
      weightKg: data.weightKg,
      paymentType: data.paymentType,
      codAmount: data.declaredOrCodAmount,
      declaredValue: data.declaredOrCodAmount,
    });
    return sendSuccess(res, { estimation });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// HUBS CRUD
// =============================================================================
router.get(
  '/admin/hubs',
  authenticate,
  requireRole([Role.ADMIN, Role.HUB_STAFF]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const where: any = {};

      // Hub staff can only view own hub per matrix
      if (user.role === Role.HUB_STAFF) {
        where.id = user.hubStaffProfile?.hubId;
      }

      const hubs = await prisma.hub.findMany({
        where,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { staff: true, drivers: true, vehicles: true },
          },
        },
      });

      return sendSuccess(res, { hubs });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/admin/hubs/:id/details',
  authenticate,
  requireRole([Role.ADMIN, Role.HUB_STAFF]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = req.user!;
      if (user.role === Role.HUB_STAFF && user.hubStaffProfile?.hubId !== id) {
        throw new AppError('Access denied. You can only view details for your assigned hub.', 403);
      }

      const hub = await prisma.hub.findUnique({
        where: { id },
        include: {
          staff: {
            include: {
              user: {
                select: { id: true, fullName: true, email: true, phone: true, isActive: true, createdAt: true },
              },
            },
          },
          drivers: {
            include: {
              user: {
                select: { id: true, fullName: true, email: true, phone: true, isActive: true, createdAt: true },
              },
              vehicle: {
                select: { id: true, registrationNo: true, type: true, status: true },
              },
              assignments: {
                where: { isActive: true },
                select: { id: true, shipmentId: true },
              },
            },
          },
          vehicles: {
            include: {
              driver: {
                include: {
                  user: { select: { fullName: true, phone: true, email: true } },
                },
              },
            },
            orderBy: { registrationNo: 'asc' },
          },
          _count: {
            select: { staff: true, drivers: true, vehicles: true },
          },
        },
      });

      if (!hub) {
        throw new AppError('Hub not found', 404);
      }

      // Count active shipments at this hub
      const activeShipmentsCount = await prisma.shipment.count({
        where: {
          OR: [
            { originHubId: id, status: 'AT_ORIGIN_HUB' },
            { destinationHubId: id, status: { in: ['AT_DESTINATION_HUB', 'ASSIGNED_TO_DRIVER', 'OUT_FOR_DELIVERY'] } },
          ],
        },
      });

      return sendSuccess(res, {
        hub,
        activeShipmentsCount,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/admin/hubs',
  authenticate,
  requireRole([Role.ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createHubSchema.parse(req.body);
      const hub = await prisma.hub.create({ data });

      await AuditService.log({
        actorUserId: req.user!.id,
        actorRole: req.user!.role,
        action: 'CREATE_HUB',
        entityType: 'Hub',
        entityId: hub.id,
        metadataJson: data,
      });

      return sendSuccess(res, { hub }, 201);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/admin/hubs/:id',
  authenticate,
  requireRole([Role.ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      const data = updateHubSchema.parse(req.body);
      const hub = await prisma.hub.update({
        where: { id },
        data,
      });

      await AuditService.log({
        actorUserId: req.user!.id,
        actorRole: req.user!.role,
        action: 'UPDATE_HUB',
        entityType: 'Hub',
        entityId: hub.id,
        metadataJson: data,
      });

      return sendSuccess(res, { hub });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/admin/hubs/:id',
  authenticate,
  requireRole([Role.ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const shipmentsCount = await prisma.shipment.count({
        where: {
          OR: [{ originHubId: id }, { destinationHubId: id }],
        },
      });

      if (shipmentsCount > 0) {
        throw new AppError(
          'Cannot delete this hub because it is referenced by existing shipments. Deactivate it instead.',
          409,
          'HUB_IN_USE'
        );
      }

      const staffCount = await prisma.hubStaffProfile.count({ where: { hubId: id } });
      const driverCount = await prisma.driverProfile.count({ where: { homeHubId: id } });
      if (staffCount > 0 || driverCount > 0) {
        throw new AppError(
          'Cannot delete this hub because staff or drivers are assigned to it. Reassign personnel first.',
          409,
          'HUB_HAS_PERSONNEL'
        );
      }

      await prisma.hub.delete({ where: { id } });

      await AuditService.log({
        actorUserId: req.user!.id,
        actorRole: req.user!.role,
        action: 'DELETE_HUB',
        entityType: 'Hub',
        entityId: id,
      });

      return sendSuccess(res, { message: 'Hub deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }
);

// =============================================================================
// VEHICLES CRUD & OPERATIONAL MANAGEMENT
// =============================================================================
router.get(
  '/admin/vehicles',
  authenticate,
  requireRole([Role.ADMIN, Role.DRIVER, Role.HUB_STAFF]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const where: any = {};

      if (user.role === Role.DRIVER) {
        where.driverId = user.driverProfile?.id;
      } else if (user.role === Role.HUB_STAFF) {
        where.hubId = user.hubStaffProfile?.hubId;
      }

      const vehicles = await prisma.vehicle.findMany({
        where,
        include: {
          hub: true,
          driver: {
            include: {
              user: { select: { fullName: true, phone: true, email: true } },
              homeHub: true,
            },
          },
        },
        orderBy: { registrationNo: 'asc' },
      });

      return sendSuccess(res, { vehicles });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/admin/vehicles',
  authenticate,
  requireRole([Role.ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createVehicleSchema.parse(req.body);

      // If driver is provided, ensure driver exists and validate hub
      if (data.driverId) {
        const driver = await prisma.driverProfile.findUnique({
          where: { id: data.driverId },
          include: { vehicle: true, user: true },
        });
        if (!driver || !driver.user.isActive) {
          throw new AppError('Assigned driver does not exist or is inactive', 400);
        }
        if (driver.vehicle) {
          throw new AppError('This driver is already assigned to vehicle ' + driver.vehicle.registrationNo, 400);
        }
        if (data.hubId && driver.homeHubId && data.hubId !== driver.homeHubId) {
          throw new AppError('Assigned driver home hub does not match the vehicle stationed hub', 400);
        }
        if (!data.hubId && driver.homeHubId) {
          data.hubId = driver.homeHubId;
        }
      }

      const vehicle = await prisma.vehicle.create({
        data,
        include: {
          hub: true,
          driver: { include: { user: true } },
        },
      });

      await AuditService.log({
        actorUserId: req.user!.id,
        actorRole: req.user!.role,
        action: 'CREATE_VEHICLE',
        entityType: 'Vehicle',
        entityId: vehicle.id,
        metadataJson: data,
      });

      return sendSuccess(res, { vehicle }, 201);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/admin/vehicles/:id',
  authenticate,
  requireRole([Role.ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      const data = updateVehicleSchema.parse(req.body);
      const vehicle = await prisma.vehicle.update({
        where: { id },
        data,
        include: {
          hub: true,
          driver: { include: { user: true } },
        },
      });

      await AuditService.log({
        actorUserId: req.user!.id,
        actorRole: req.user!.role,
        action: 'UPDATE_VEHICLE',
        entityType: 'Vehicle',
        entityId: vehicle.id,
        metadataJson: data,
      });

      return sendSuccess(res, { vehicle });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/admin/vehicles/:id/assign-driver',
  authenticate,
  requireRole([Role.ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { driverId } = req.body;

      if (!driverId) {
        throw new AppError('driverId is required', 400);
      }

      const vehicle = await prisma.vehicle.findUnique({
        where: { id },
        include: { driver: true },
      });

      if (!vehicle) {
        throw new AppError('Vehicle not found', 404);
      }

      const driver = await prisma.driverProfile.findUnique({
        where: { id: driverId },
        include: { vehicle: true, user: true },
      });

      if (!driver || !driver.user.isActive) {
        throw new AppError('Driver not found or is inactive', 400);
      }

      if (driver.vehicle && driver.vehicle.id !== vehicle.id) {
        throw new AppError(
          `Driver is already assigned to vehicle ${driver.vehicle.registrationNo}. Unassign them first.`,
          400
        );
      }

      // Check hub compatibility
      if (vehicle.hubId && driver.homeHubId && vehicle.hubId !== driver.homeHubId) {
        throw new AppError('Driver home hub does not match the vehicle stationed hub.', 400);
      }

      const updatedVehicle = await prisma.vehicle.update({
        where: { id },
        data: {
          driverId: driver.id,
          status: 'ASSIGNED',
          ...(driver.homeHubId && !vehicle.hubId ? { hubId: driver.homeHubId } : {}),
        },
        include: {
          hub: true,
          driver: { include: { user: { select: { fullName: true, phone: true } } } },
        },
      });

      await AuditService.log({
        actorUserId: req.user!.id,
        actorRole: req.user!.role,
        action: 'ASSIGN_VEHICLE_DRIVER',
        entityType: 'Vehicle',
        entityId: vehicle.id,
        metadataJson: { driverId, driverName: driver.user.fullName },
      });

      return sendSuccess(res, { vehicle: updatedVehicle });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/admin/vehicles/:id/unassign',
  authenticate,
  requireRole([Role.ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const vehicle = await prisma.vehicle.findUnique({
        where: { id },
        include: { driver: { include: { user: true } } },
      });

      if (!vehicle) {
        throw new AppError('Vehicle not found', 404);
      }

      const previousDriverName = vehicle.driver?.user.fullName;

      const updatedVehicle = await prisma.vehicle.update({
        where: { id },
        data: {
          driverId: null,
          status: 'AVAILABLE',
        },
        include: { hub: true },
      });

      await AuditService.log({
        actorUserId: req.user!.id,
        actorRole: req.user!.role,
        action: 'UNASSIGN_VEHICLE_DRIVER',
        entityType: 'Vehicle',
        entityId: vehicle.id,
        metadataJson: { previousDriverId: vehicle.driverId, previousDriverName },
      });

      return sendSuccess(res, { vehicle: updatedVehicle });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/admin/vehicles/:id/hub',
  authenticate,
  requireRole([Role.ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { hubId } = req.body;

      const vehicle = await prisma.vehicle.findUnique({
        where: { id },
        include: { driver: true },
      });

      if (!vehicle) {
        throw new AppError('Vehicle not found', 404);
      }

      if (hubId) {
        const hub = await prisma.hub.findUnique({ where: { id: hubId } });
        if (!hub) {
          throw new AppError('Hub not found', 404);
        }
      }

      // If vehicle has an assigned driver and new hub doesn't match driver's home hub, unassign driver
      let unassignedDriverId: string | null = null;
      if (vehicle.driver && vehicle.driver.homeHubId !== hubId) {
        unassignedDriverId = vehicle.driver.id;
      }

      const updatedVehicle = await prisma.vehicle.update({
        where: { id },
        data: {
          hubId: hubId || null,
          ...(unassignedDriverId ? { driverId: null, status: 'AVAILABLE' } : {}),
        },
        include: {
          hub: true,
          driver: { include: { user: true } },
        },
      });

      await AuditService.log({
        actorUserId: req.user!.id,
        actorRole: req.user!.role,
        action: 'UPDATE_VEHICLE_HUB',
        entityType: 'Vehicle',
        entityId: vehicle.id,
        metadataJson: { previousHubId: vehicle.hubId, newHubId: hubId, unassignedDriverId },
      });

      return sendSuccess(res, { vehicle: updatedVehicle });
    } catch (error) {
      next(error);
    }
  }
);

// =============================================================================
// PRICING RULES CRUD
// =============================================================================
router.get(
  '/admin/pricing-rules',
  authenticate,
  requireRole([Role.ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rules = await prisma.pricingRule.findMany({
        orderBy: [{ originZone: 'asc' }, { destinationZone: 'asc' }],
      });
      return sendSuccess(res, { rules });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/admin/pricing-rules',
  authenticate,
  requireRole([Role.ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createPricingRuleSchema.parse(req.body);
      const originZone = PricingService.normalizeZone(data.originZone);
      const destinationZone = PricingService.normalizeZone(data.destinationZone);
      const effectiveFrom = data.effectiveFrom ? new Date(data.effectiveFrom) : new Date();
      const effectiveTo = data.effectiveTo ? new Date(data.effectiveTo) : null;

      // Prevent duplicate active overlapping rules
      if (data.isActive !== false) {
        await PricingService.checkOverlap({
          serviceType: data.serviceType,
          originZone,
          destinationZone,
          effectiveFrom,
          effectiveTo,
        });
      }

      const rule = await prisma.pricingRule.create({
        data: {
          ...data,
          originZone,
          destinationZone,
          effectiveFrom,
          effectiveTo,
        },
      });

      await AuditService.log({
        actorUserId: req.user!.id,
        actorRole: req.user!.role,
        action: 'CREATE_PRICING_RULE',
        entityType: 'PricingRule',
        entityId: rule.id,
        metadataJson: { ...data, originZone, destinationZone },
      });

      return sendSuccess(res, { rule }, 201);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/admin/pricing-rules/:id',
  authenticate,
  requireRole([Role.ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      const data = updatePricingRuleSchema.parse(req.body);

      const existingRule = await prisma.pricingRule.findUnique({ where: { id } });
      if (!existingRule) {
        throw new AppError('Pricing rule not found', 404);
      }

      const serviceType = data.serviceType || existingRule.serviceType;
      const originZone = data.originZone ? PricingService.normalizeZone(data.originZone) : existingRule.originZone;
      const destinationZone = data.destinationZone ? PricingService.normalizeZone(data.destinationZone) : existingRule.destinationZone;
      const isActive = data.isActive !== undefined ? data.isActive : existingRule.isActive;
      const effectiveFrom = data.effectiveFrom !== undefined
        ? (data.effectiveFrom ? new Date(data.effectiveFrom) : new Date())
        : existingRule.effectiveFrom;
      const effectiveTo = data.effectiveTo !== undefined
        ? (data.effectiveTo ? new Date(data.effectiveTo) : null)
        : existingRule.effectiveTo;

      // Check overlap if resulting rule is active
      if (isActive) {
        await PricingService.checkOverlap({
          serviceType,
          originZone,
          destinationZone,
          effectiveFrom,
          effectiveTo,
          excludeRuleId: id,
        });
      }

      const rule = await prisma.pricingRule.update({
        where: { id },
        data: {
          ...data,
          ...(data.originZone ? { originZone } : {}),
          ...(data.destinationZone ? { destinationZone } : {}),
          ...(data.effectiveFrom !== undefined ? { effectiveFrom } : {}),
          ...(data.effectiveTo !== undefined ? { effectiveTo } : {}),
        },
      });

      await AuditService.log({
        actorUserId: req.user!.id,
        actorRole: req.user!.role,
        action: 'UPDATE_PRICING_RULE',
        entityType: 'PricingRule',
        entityId: rule.id,
        metadataJson: { previous: existingRule, updated: data },
      });

      return sendSuccess(res, { rule });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/admin/pricing-rules/:id',
  authenticate,
  requireRole([Role.ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;

      // Check FK usage in PricingSnapshot per Section 4.1
      const snapshotCount = await prisma.pricingSnapshot.count({
        where: { pricingRuleId: id },
      });

      if (snapshotCount > 0) {
        throw new AppError(
          'Cannot delete a pricing rule that is linked to existing shipments. Deactivate it instead.',
          409,
          'RULE_IN_USE'
        );
      }

      await prisma.pricingRule.delete({ where: { id } });

      await AuditService.log({
        actorUserId: req.user!.id,
        actorRole: req.user!.role,
        action: 'DELETE_PRICING_RULE',
        entityType: 'PricingRule',
        entityId: id,
      });

      return sendSuccess(res, { message: 'Pricing rule deleted.' });
    } catch (error) {
      next(error);
    }
  }
);

// =============================================================================
// USERS & ROLES MANAGEMENT
// =============================================================================
router.get(
  '/admin/users',
  authenticate,
  requireRole([Role.ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = req.query.role as Role | undefined;
      const where = role ? { role } : {};

      const users = await prisma.user.findMany({
        where,
        include: {
          hubStaffProfile: { include: { hub: true } },
          driverProfile: { include: { homeHub: true, vehicle: true } },
          customerProfile: { select: { id: true, _count: { select: { shipments: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return sendSuccess(res, { users });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/admin/users/:id',
  authenticate,
  requireRole([Role.ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      const { isActive, fullName, phone } = req.body;

      const targetUser = await prisma.user.findUnique({ where: { id } });
      if (!targetUser) {
        throw new AppError('User not found', 404);
      }

      // Last active admin protection
      if (targetUser.role === Role.ADMIN && isActive === false) {
        const activeAdminsCount = await prisma.user.count({
          where: { role: Role.ADMIN, isActive: true },
        });
        if (activeAdminsCount <= 1) {
          throw new AppError('Cannot deactivate the last active administrator.', 400);
        }
      }

      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(isActive !== undefined ? { isActive } : {}),
          ...(fullName ? { fullName } : {}),
          ...(phone !== undefined ? { phone } : {}),
        },
      });

      await AuditService.log({
        actorUserId: req.user!.id,
        actorRole: req.user!.role,
        action: 'UPDATE_USER',
        entityType: 'User',
        entityId: user.id,
        metadataJson: { isActive, fullName, phone },
      });

      return sendSuccess(res, { user });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/admin/users/:id/role',
  authenticate,
  requireRole([Role.ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { role: newRole, hubId, notes } = req.body;

      if (!newRole || !Object.values(Role).includes(newRole)) {
        throw new AppError('A valid role is required (ADMIN, HUB_STAFF, DRIVER, CUSTOMER)', 400);
      }

      const targetUser = await prisma.user.findUnique({
        where: { id },
        include: {
          driverProfile: { include: { vehicle: true } },
          hubStaffProfile: true,
          customerProfile: true,
        },
      });

      if (!targetUser) {
        throw new AppError('User not found', 404);
      }

      // Lockout protection: Cannot demote the last active ADMIN
      if (targetUser.role === Role.ADMIN && newRole !== Role.ADMIN) {
        const activeAdminsCount = await prisma.user.count({
          where: { role: Role.ADMIN, isActive: true },
        });
        if (activeAdminsCount <= 1) {
          throw new AppError(
            'Cannot change role of the last active administrator. Create or promote another active administrator first.',
            400
          );
        }
      }

      // Validate Hub ID for HUB_STAFF and DRIVER
      if (newRole === Role.HUB_STAFF) {
        if (!hubId) {
          throw new AppError('Assigned hub is required when setting role to Hub Staff', 400);
        }
        const hub = await prisma.hub.findUnique({ where: { id: hubId } });
        if (!hub || !hub.isActive) {
          throw new AppError('Specified hub not found or is inactive', 400);
        }
      } else if (newRole === Role.DRIVER) {
        if (!hubId) {
          throw new AppError('Home hub is required when setting role to Driver', 400);
        }
        const hub = await prisma.hub.findUnique({ where: { id: hubId } });
        if (!hub || !hub.isActive) {
          throw new AppError('Specified hub not found or is inactive', 400);
        }
      }

      // If leaving DRIVER role, unassign any assigned vehicle
      if (targetUser.role === Role.DRIVER && newRole !== Role.DRIVER && targetUser.driverProfile?.vehicle) {
        await prisma.vehicle.update({
          where: { id: targetUser.driverProfile.vehicle.id },
          data: { driverId: null, status: 'AVAILABLE' },
        });
      }

      // Ensure profile exists according to new role
      if (newRole === Role.CUSTOMER) {
        await prisma.customerProfile.upsert({
          where: { userId: targetUser.id },
          update: {},
          create: { userId: targetUser.id },
        });
      } else if (newRole === Role.HUB_STAFF) {
        await prisma.hubStaffProfile.upsert({
          where: { userId: targetUser.id },
          update: { hubId: hubId! },
          create: { userId: targetUser.id, hubId: hubId! },
        });
      } else if (newRole === Role.DRIVER) {
        await prisma.driverProfile.upsert({
          where: { userId: targetUser.id },
          update: { homeHubId: hubId! },
          create: { userId: targetUser.id, homeHubId: hubId! },
        });
      }

      // Update User role
      const updatedUser = await prisma.user.update({
        where: { id: targetUser.id },
        data: { role: newRole },
        include: {
          hubStaffProfile: { include: { hub: true } },
          driverProfile: { include: { homeHub: true, vehicle: true } },
          customerProfile: true,
        },
      });

      await AuditService.log({
        actorUserId: req.user!.id,
        actorRole: req.user!.role,
        action: 'CHANGE_USER_ROLE',
        entityType: 'User',
        entityId: targetUser.id,
        metadataJson: {
          previousRole: targetUser.role,
          newRole,
          hubId,
          notes,
        },
      });

      return sendSuccess(res, { user: updatedUser });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/admin/users/:id/hub',
  authenticate,
  requireRole([Role.ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { hubId } = req.body;

      if (!hubId) {
        throw new AppError('hubId is required', 400);
      }

      const hub = await prisma.hub.findUnique({ where: { id: hubId } });
      if (!hub || !hub.isActive) {
        throw new AppError('Hub not found or is inactive', 400);
      }

      const targetUser = await prisma.user.findUnique({
        where: { id },
        include: {
          hubStaffProfile: true,
          driverProfile: { include: { vehicle: true } },
        },
      });

      if (!targetUser) {
        throw new AppError('User not found', 404);
      }

      if (targetUser.role === Role.HUB_STAFF) {
        await prisma.hubStaffProfile.upsert({
          where: { userId: targetUser.id },
          update: { hubId },
          create: { userId: targetUser.id, hubId },
        });
      } else if (targetUser.role === Role.DRIVER) {
        await prisma.driverProfile.upsert({
          where: { userId: targetUser.id },
          update: { homeHubId: hubId },
          create: { userId: targetUser.id, homeHubId: hubId },
        });

        // If driver has a vehicle stationed at a different hub, unassign driver
        if (targetUser.driverProfile?.vehicle && targetUser.driverProfile.vehicle.hubId !== hubId) {
          await prisma.vehicle.update({
            where: { id: targetUser.driverProfile.vehicle.id },
            data: { driverId: null, status: 'AVAILABLE' },
          });
        }
      } else {
        throw new AppError('Only Hub Staff and Drivers can have an assigned operational hub', 400);
      }

      const updatedUser = await prisma.user.findUnique({
        where: { id },
        include: {
          hubStaffProfile: { include: { hub: true } },
          driverProfile: { include: { homeHub: true, vehicle: true } },
        },
      });

      await AuditService.log({
        actorUserId: req.user!.id,
        actorRole: req.user!.role,
        action: 'REASSIGN_USER_HUB',
        entityType: 'User',
        entityId: targetUser.id,
        metadataJson: {
          userRole: targetUser.role,
          newHubId: hubId,
          hubName: hub.name,
        },
      });

      return sendSuccess(res, { user: updatedUser });
    } catch (error) {
      next(error);
    }
  }
);

// =============================================================================
// SYSTEM SETTINGS
// =============================================================================
router.get(
  '/settings/public',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await prisma.systemSettings.findUnique({
        where: { id: 'singleton' },
        select: {
          companyName: true,
          companyPhone: true,
          companyEmail: true,
          companyAddress: true,
          currency: true,
        },
      });
      return sendSuccess(res, {
        settings: settings || {
          companyName: 'Euroshub Logistics',
          companyPhone: null,
          companyEmail: null,
          companyAddress: null,
          currency: 'PKR',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/admin/settings',
  authenticate,
  requireRole([Role.ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await prisma.systemSettings.findUnique({
        where: { id: 'singleton' },
      });
      return sendSuccess(res, { settings });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/admin/settings',
  authenticate,
  requireRole([Role.ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        companyName,
        companyPhone,
        companyEmail,
        companyAddress,
        trackingPrefix,
        maxDeliveryAttempts,
      } = req.body;

      if (trackingPrefix && !/^[A-Z]{2,6}$/.test(trackingPrefix)) {
        throw new AppError('Tracking prefix must be 2 to 6 uppercase letters', 400);
      }
      if (maxDeliveryAttempts !== undefined) {
        const attempts = Number(maxDeliveryAttempts);
        if (isNaN(attempts) || attempts < 1 || attempts > 10) {
          throw new AppError('Max delivery attempts must be an integer between 1 and 10', 400);
        }
      }

      const settings = await prisma.systemSettings.upsert({
        where: { id: 'singleton' },
        update: {
          ...(companyName ? { companyName } : {}),
          ...(companyPhone !== undefined ? { companyPhone } : {}),
          ...(companyEmail !== undefined ? { companyEmail } : {}),
          ...(companyAddress !== undefined ? { companyAddress } : {}),
          ...(trackingPrefix ? { trackingPrefix } : {}),
          ...(maxDeliveryAttempts !== undefined ? { maxDeliveryAttempts: Number(maxDeliveryAttempts) } : {}),
        },
        create: {
          id: 'singleton',
          companyName: companyName || 'Euroshub Logistics',
          companyPhone: companyPhone || null,
          companyEmail: companyEmail || null,
          companyAddress: companyAddress || null,
          trackingPrefix: trackingPrefix || 'ESH',
          maxDeliveryAttempts: Number(maxDeliveryAttempts) || 3,
        },
      });

      await AuditService.log({
        actorUserId: req.user!.id,
        actorRole: req.user!.role,
        action: 'UPDATE_SYSTEM_SETTINGS',
        entityType: 'SystemSettings',
        entityId: 'singleton',
        metadataJson: req.body,
      });

      return sendSuccess(res, { settings });
    } catch (error) {
      next(error);
    }
  }
);

// =============================================================================
// AUDIT LOGS
// =============================================================================
router.get(
  '/admin/audit-logs',
  authenticate,
  requireRole([Role.ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const pageSize = 30;
      const skip = (page - 1) * pageSize;

      const entityType = req.query.entityType as string | undefined;
      const action = req.query.action as string | undefined;

      const where: any = {};
      if (entityType) where.entityType = entityType;
      if (action) where.action = action;

      const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return sendSuccess(res, {
        logs,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
