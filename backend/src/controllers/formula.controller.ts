import { Request, Response } from 'express';
import { evaluateFormula } from '../services/formula_engine.service';

export const runFormulaEvaluate = async (req: Request, res: Response) => {
  const { expression, variables } = req.body;

  if (!expression) {
    return res.status(400).json({ success: false, error: 'MISSING_EXPRESSION_PARAMETER' });
  }

  try {
    const result = await evaluateFormula(expression, variables || {});
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
