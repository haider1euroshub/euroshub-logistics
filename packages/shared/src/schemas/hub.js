"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateHubSchema = exports.createHubSchema = void 0;
const zod_1 = require("zod");
exports.createHubSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'Hub name is required'),
    code: zod_1.z.string().trim().min(2, 'Hub code is required (e.g. KHI-01)').toUpperCase(),
    address: zod_1.z.string().trim().min(5, 'Hub address is required'),
    city: zod_1.z.string().trim().min(2, 'City is required'),
    phone: zod_1.z.string().trim().optional().nullable(),
    latitude: zod_1.z.number().min(-90).max(90).optional().nullable(),
    longitude: zod_1.z.number().min(-180).max(180).optional().nullable(),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateHubSchema = exports.createHubSchema.partial();
//# sourceMappingURL=hub.js.map