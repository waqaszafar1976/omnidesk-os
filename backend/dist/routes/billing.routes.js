"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const billing_controller_1 = require("../controllers/billing.controller");
const router = (0, express_1.Router)();
// Expose workspace telemetry and credit limits
router.get('/billing/metrics', billing_controller_1.getBillingMetrics);
exports.default = router;
