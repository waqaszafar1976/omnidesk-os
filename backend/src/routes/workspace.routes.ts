import { Router } from 'express';
import { getWorkspaceMembers } from '../controllers/workspace.controller';

const router = Router();

router.get('/workspaces/:id/members', getWorkspaceMembers);

export default router;
