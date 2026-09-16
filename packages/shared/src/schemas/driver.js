"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignDriverSchema = void 0;
const zod_1 = require("zod");
exports.assignDriverSchema = zod_1.z.object({
    driverId: zod_1.z.string().min(1, 'Driver ID is required'),
});
//# sourceMappingURL=driver.js.map