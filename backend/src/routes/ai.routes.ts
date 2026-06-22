import { Router } from 'express';
import { streamAICompletion } from '../controllers/ai.controller';

const router = Router();

// Expose POST endpoint to request streaming AI completions
router.post('/ai/complete', streamAICompletion);

export default router;
