"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FailureReason = exports.VehicleStatus = exports.PaymentStatus = exports.PaymentType = exports.ServiceType = exports.ShipmentStatus = exports.Role = void 0;
var Role;
(function (Role) {
    Role["ADMIN"] = "ADMIN";
    Role["HUB_STAFF"] = "HUB_STAFF";
    Role["DRIVER"] = "DRIVER";
    Role["CUSTOMER"] = "CUSTOMER";
})(Role || (exports.Role = Role = {}));
var ShipmentStatus;
(function (ShipmentStatus) {
    ShipmentStatus["CREATED"] = "CREATED";
    ShipmentStatus["PICKUP_SCHEDULED"] = "PICKUP_SCHEDULED";
    ShipmentStatus["PICKED_UP"] = "PICKED_UP";
    ShipmentStatus["AT_ORIGIN_HUB"] = "AT_ORIGIN_HUB";
    ShipmentStatus["IN_TRANSIT"] = "IN_TRANSIT";
    ShipmentStatus["AT_DESTINATION_HUB"] = "AT_DESTINATION_HUB";
    ShipmentStatus["ASSIGNED_TO_DRIVER"] = "ASSIGNED_TO_DRIVER";
    ShipmentStatus["OUT_FOR_DELIVERY"] = "OUT_FOR_DELIVERY";
    ShipmentStatus["DELIVERED"] = "DELIVERED";
    ShipmentStatus["DELIVERY_FAILED"] = "DELIVERY_FAILED";
    ShipmentStatus["RESCHEDULED"] = "RESCHEDULED";
    ShipmentStatus["CANCELLED"] = "CANCELLED";
    ShipmentStatus["RETURNED"] = "RETURNED";
})(ShipmentStatus || (exports.ShipmentStatus = ShipmentStatus = {}));
var ServiceType;
(function (ServiceType) {
    ServiceType["STANDARD"] = "STANDARD";
    ServiceType["EXPRESS"] = "EXPRESS";
})(ServiceType || (exports.ServiceType = ServiceType = {}));
var PaymentType;
(function (PaymentType) {
    PaymentType["PREPAID"] = "PREPAID";
    PaymentType["COD"] = "COD";
})(PaymentType || (exports.PaymentType = PaymentType = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["COLLECTED"] = "COLLECTED";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var VehicleStatus;
(function (VehicleStatus) {
    VehicleStatus["AVAILABLE"] = "AVAILABLE";
    VehicleStatus["ASSIGNED"] = "ASSIGNED";
    VehicleStatus["IN_USE"] = "IN_USE";
    VehicleStatus["MAINTENANCE"] = "MAINTENANCE";
    VehicleStatus["INACTIVE"] = "INACTIVE";
})(VehicleStatus || (exports.VehicleStatus = VehicleStatus = {}));
var FailureReason;
(function (FailureReason) {
    FailureReason["CUSTOMER_UNAVAILABLE"] = "CUSTOMER_UNAVAILABLE";
    FailureReason["WRONG_ADDRESS"] = "WRONG_ADDRESS";
    FailureReason["CUSTOMER_REFUSED"] = "CUSTOMER_REFUSED";
    FailureReason["PHONE_UNREACHABLE"] = "PHONE_UNREACHABLE";
    FailureReason["ADDRESS_INACCESSIBLE"] = "ADDRESS_INACCESSIBLE";
    FailureReason["OTHER"] = "OTHER";
})(FailureReason || (exports.FailureReason = FailureReason = {}));
//# sourceMappingURL=enums.js.map