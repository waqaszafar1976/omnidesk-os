import { Router } from 'express';
import { getTasks, getEvents } from '../controllers/task.controller';

const router = Router();

router.get('/tasks', getTasks);
router.get('/events', getEvents);

export default router;
