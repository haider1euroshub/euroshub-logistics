import { z } from 'zod';
import { VehicleStatus } from '../enums.js';

export const createVehicleSchema = z.object({
  registrationNo: z.string().trim().min(3, 'Registration number is required').toUpperCase(),
  type: z.string().trim().min(2, 'Vehicle type is required (e.g. Motorcycle, Van, Pickup)'),
  makeModel: z.string().trim().optional().nullable(),
  status: z.nativeEnum(VehicleStatus).default(VehicleStatus.AVAILABLE),
  currentMileage: z.number().int().nonnegative().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  driverId: z.string().optional().nullable(),
  hubId: z.string().optional().nullable(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = createVehicleSchema.partial();
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
