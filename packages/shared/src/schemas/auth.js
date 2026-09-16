"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminCreateUserSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const enums_js_1 = require("../enums.js");
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().trim().toLowerCase().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters long'),
    fullName: zod_1.z.string().trim().min(2, 'Full name must be at least 2 characters'),
    phone: zod_1.z.string().trim().min(10, 'Valid phone number is required'),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().trim().toLowerCase().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.adminCreateUserSchema = zod_1.z.object({
    email: zod_1.z.string().trim().toLowerCase().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters long'),
    fullName: zod_1.z.string().trim().min(2, 'Full name must be at least 2 characters'),
    phone: zod_1.z.string().trim().optional(),
    role: zod_1.z.enum([enums_js_1.Role.ADMIN, enums_js_1.Role.HUB_STAFF, enums_js_1.Role.DRIVER], {
        errorMap: () => ({ message: 'Staff role must be ADMIN, HUB_STAFF, or DRIVER' }),
    }),
    hubId: zod_1.z.string().optional(), // For HUB_STAFF
    homeHubId: zod_1.z.string().optional(), // For DRIVER
}).superRefine((data, ctx) => {
    if (data.role === enums_js_1.Role.HUB_STAFF && !data.hubId) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'hubId is required for HUB_STAFF role',
            path: ['hubId'],
        });
    }
});
//# sourceMappingURL=auth.js.map