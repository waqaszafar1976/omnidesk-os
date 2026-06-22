import { Router } from 'express';
import { 
  getKpis, 
  getUsageTrend, 
  getWorkspaceDistribution, 
  getTopWorkspaces, 
  getRecentActivity 
} from '../controllers/analytics.controller';

const router = Router();

router.get('/analytics/kpis', getKpis);
router.get('/analytics/usage-trend', getUsageTrend);
router.get('/analytics/workspace-distribution', getWorkspaceDistribution);
router.get('/analytics/top-workspaces', getTopWorkspaces);
router.get('/analytics/recent-activity', getRecentActivity);

export default router;
