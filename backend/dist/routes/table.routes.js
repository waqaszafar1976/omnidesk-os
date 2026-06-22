"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const table_controller_1 = require("../controllers/table.controller");
const router = (0, express_1.Router)();
// 1. Fetch table columns metadata schema
router.get('/tables/:tableId/schema', table_controller_1.getTableSchema);
// 2. Fetch table rows cell metrics
router.get('/tables/:tableId/rows', table_controller_1.getTableRows);
// 3. Add a new row to a smart grid table
router.post('/tables/:tableId/rows', table_controller_1.addTableRow);
// 4. Update cells within a specific table row
router.put('/tables/:tableId/rows/:rowId', table_controller_1.updateTableRow);
// 5. Add a dynamic column header setup
router.post('/tables/:tableId/columns', table_controller_1.addTableColumn);
exports.default = router;
