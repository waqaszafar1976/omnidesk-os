import { Router } from 'express';
import { getBillingMetrics } from '../controllers/billing.controller';

const router = Router();

// Expose workspace telemetry and credit limits
router.get('/billing/metrics', getBillingMetrics);

export default router;
