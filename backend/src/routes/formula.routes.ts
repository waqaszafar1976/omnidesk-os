import { Router } from 'express';
import { runFormulaEvaluate } from '../controllers/formula.controller';

const router = Router();

// Evaluate formula sandbox endpoint
router.post('/formula/evaluate', runFormulaEvaluate);

export default router;
