"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const formula_controller_1 = require("../controllers/formula.controller");
const router = (0, express_1.Router)();
// Evaluate formula sandbox endpoint
router.post('/formula/evaluate', formula_controller_1.runFormulaEvaluate);
exports.default = router;
