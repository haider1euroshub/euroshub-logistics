"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateVehicleSchema = exports.createVehicleSchema = void 0;
const zod_1 = require("zod");
const enums_js_1 = require("../enums.js");
exports.createVehicleSchema = zod_1.z.object({
    registrationNo: zod_1.z.string().trim().min(3, 'Registration number is required').toUpperCase(),
    type: zod_1.z.string().trim().min(2, 'Vehicle type is required (e.g. Motorcycle, Van, Pickup)'),
    makeModel: zod_1.z.string().trim().optional().nullable(),
    status: zod_1.z.nativeEnum(enums_js_1.VehicleStatus).default(enums_js_1.VehicleStatus.AVAILABLE),
    currentMileage: zod_1.z.number().int().nonnegative().optional().nullable(),
    notes: zod_1.z.string().trim().optional().nullable(),
    driverId: zod_1.z.string().optional().nullable(),
    hubId: zod_1.z.string().optional().nullable(),
});
exports.updateVehicleSchema = exports.createVehicleSchema.partial();
//# sourceMappingURL=vehicle.js.map