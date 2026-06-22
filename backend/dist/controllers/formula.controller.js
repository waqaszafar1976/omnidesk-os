"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runFormulaEvaluate = void 0;
const formula_engine_service_1 = require("../services/formula_engine.service");
const runFormulaEvaluate = async (req, res) => {
    const { expression, variables } = req.body;
    if (!expression) {
        return res.status(400).json({ success: false, error: 'MISSING_EXPRESSION_PARAMETER' });
    }
    try {
        const result = await (0, formula_engine_service_1.evaluateFormula)(expression, variables || {});
        res.json({ success: true, result });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.runFormulaEvaluate = runFormulaEvaluate;
