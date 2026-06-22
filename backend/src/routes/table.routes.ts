import { Router } from 'express';
import { getTableSchema, getTableRows, addTableRow, updateTableRow, addTableColumn } from '../controllers/table.controller';

const router = Router();

// 1. Fetch table columns metadata schema
router.get('/tables/:tableId/schema', getTableSchema);

// 2. Fetch table rows cell metrics
router.get('/tables/:tableId/rows', getTableRows);

// 3. Add a new row to a smart grid table
router.post('/tables/:tableId/rows', addTableRow);

// 4. Update cells within a specific table row
router.put('/tables/:tableId/rows/:rowId', updateTableRow);

// 5. Add a dynamic column header setup
router.post('/tables/:tableId/columns', addTableColumn);

export default router;
