"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addTableColumn = exports.updateTableRow = exports.addTableRow = exports.getTableRows = exports.getTableSchema = void 0;
const database_1 = __importDefault(require("../config/database"));
const formula_engine_service_1 = require("../services/formula_engine.service");
const billing_controller_1 = require("./billing.controller");
const recalculateFormulas = async (client, dbTableId, cells) => {
    const colConfigs = await client.query(`
    SELECT internal_key, data_type, formula_expression
    FROM column_configs
    WHERE table_id = $1 AND data_type = 'formula';
  `, [dbTableId]);
    if (colConfigs.rows.length === 0) {
        return cells;
    }
    const updatedCells = { ...cells };
    for (const col of colConfigs.rows) {
        if (col.formula_expression) {
            const result = await (0, formula_engine_service_1.evaluateFormula)(col.formula_expression, updatedCells);
            updatedCells[col.internal_key] = result;
        }
    }
    return updatedCells;
};
// 1. Get Table Schema Configuration (Columnsconfigs)
const getTableSchema = async (req, res) => {
    const { tableId } = req.params;
    const userId = req.headers.user_id || '00000000-0000-0000-0000-000000000001';
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT set_config($1, $2, true);', ['request.jwt.user_id', userId]);
        const result = await client.query(`
      SELECT cc.id, cc.name, cc.internal_key, cc.data_type, cc.options, cc.formula_expression, cc.display_order
      FROM column_configs cc
      JOIN table_metadata tm ON cc.table_id = tm.id
      WHERE tm.id = $1 OR tm.page_id = $1
      ORDER BY cc.display_order ASC;
    `, [tableId]);
        await client.query('COMMIT');
        res.json({ success: true, columns: result.rows });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error fetching table schema with RLS:', error);
        res.status(500).json({ success: false, error: error.message });
    }
    finally {
        client.release();
    }
};
exports.getTableSchema = getTableSchema;
// 2. Get Table Data Rows
const getTableRows = async (req, res) => {
    const { tableId } = req.params;
    const userId = req.headers.user_id || '00000000-0000-0000-0000-000000000001';
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT set_config($1, $2, true);', ['request.jwt.user_id', userId]);
        const result = await client.query(`
      SELECT tr.id, tr.cells, tr.display_order
      FROM table_rows tr
      JOIN table_metadata tm ON tr.table_id = tm.id
      WHERE tm.id = $1 OR tm.page_id = $1
      ORDER BY tr.display_order ASC;
    `, [tableId]);
        await client.query('COMMIT');
        res.json({ success: true, rows: result.rows });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error fetching table rows with RLS:', error);
        res.status(500).json({ success: false, error: error.message });
    }
    finally {
        client.release();
    }
};
exports.getTableRows = getTableRows;
// 3. Add a New Row (with JSONB cell key-values)
const addTableRow = async (req, res) => {
    const { tableId } = req.params;
    const { cells } = req.body;
    const userId = req.headers.user_id || '00000000-0000-0000-0000-000000000001';
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT set_config($1, $2, true);', ['request.jwt.user_id', userId]);
        // Resolve table metadata ID first (could be passed as pageId or metadataId)
        const tableRes = await client.query(`
      SELECT id FROM table_metadata WHERE id = $1 OR page_id = $1 LIMIT 1;
    `, [tableId]);
        if (tableRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'TABLE_METADATA_NOT_FOUND' });
        }
        const dbTableId = tableRes.rows[0].id;
        // Recalculate formula values
        const processedCells = await recalculateFormulas(client, dbTableId, cells || {});
        // Insert the row (RLS rules are checked here)
        const result = await client.query(`
      INSERT INTO table_rows (table_id, cells)
      VALUES ($1, $2)
      RETURNING id, cells, display_order;
    `, [dbTableId, JSON.stringify(processedCells)]);
        // Update row count
        await client.query(`
      UPDATE table_metadata SET row_count = row_count + 1 WHERE id = $1;
    `, [dbTableId]);
        await (0, billing_controller_1.logAuditEvent)(client, userId, 'ADD_TABLE_ROW', `Added row in table ${dbTableId}`, { rowId: result.rows[0].id });
        await client.query('COMMIT');
        res.json({ success: true, row: result.rows[0] });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding table row with RLS:', error);
        res.status(500).json({ success: false, error: error.message });
    }
    finally {
        client.release();
    }
};
exports.addTableRow = addTableRow;
// 4. Update a Row cell values
const updateTableRow = async (req, res) => {
    const { tableId, rowId } = req.params;
    const { cells } = req.body;
    const userId = req.headers.user_id || '00000000-0000-0000-0000-000000000001';
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT set_config($1, $2, true);', ['request.jwt.user_id', userId]);
        // To update correctly, we first get the existing row's cells so we can merge them and calculate formulas
        const existingRowRes = await client.query(`
      SELECT cells, table_id FROM table_rows WHERE id = $1 LIMIT 1;
    `, [rowId]);
        if (existingRowRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'ROW_NOT_FOUND_OR_ACCESS_DENIED' });
        }
        const dbTableId = existingRowRes.rows[0].table_id;
        const existingCells = existingRowRes.rows[0].cells || {};
        const mergedCells = { ...existingCells, ...cells };
        // Recalculate formula values
        const processedCells = await recalculateFormulas(client, dbTableId, mergedCells);
        const result = await client.query(`
      UPDATE table_rows
      SET cells = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, cells, display_order;
    `, [JSON.stringify(processedCells), rowId]);
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'ROW_NOT_FOUND_OR_ACCESS_DENIED' });
        }
        await (0, billing_controller_1.logAuditEvent)(client, userId, 'UPDATE_TABLE_ROW', `Updated row ${rowId} in table ${dbTableId}`, { rowId });
        await client.query('COMMIT');
        res.json({ success: true, row: result.rows[0] });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating table row with RLS:', error);
        res.status(500).json({ success: false, error: error.message });
    }
    finally {
        client.release();
    }
};
exports.updateTableRow = updateTableRow;
// 5. Add a Dynamic Column configuration to dynamic metadata schema
const addTableColumn = async (req, res) => {
    const { tableId } = req.params;
    const { name, data_type, options, formula_expression } = req.body;
    const userId = req.headers.user_id || '00000000-0000-0000-0000-000000000001';
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT set_config($1, $2, true);', ['request.jwt.user_id', userId]);
        const tableRes = await client.query(`
      SELECT id FROM table_metadata WHERE id = $1 OR page_id = $1 LIMIT 1;
    `, [tableId]);
        if (tableRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'TABLE_METADATA_NOT_FOUND' });
        }
        const dbTableId = tableRes.rows[0].id;
        // Generate safe internal database key, e.g. "col_rec_amount"
        const cleanKey = 'col_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        // Get display order index
        const orderRes = await client.query(`
      SELECT COALESCE(MAX(display_order), 0) + 1 as next_order 
      FROM column_configs 
      WHERE table_id = $1;
    `, [dbTableId]);
        const nextOrder = orderRes.rows[0].next_order;
        const result = await client.query(`
      INSERT INTO column_configs (table_id, name, internal_key, data_type, options, formula_expression, display_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, internal_key, data_type, options, formula_expression, display_order;
    `, [dbTableId, name, cleanKey, data_type, options ? JSON.stringify(options) : null, formula_expression, nextOrder]);
        await client.query('COMMIT');
        res.json({ success: true, column: result.rows[0] });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding table column with RLS:', error);
        res.status(500).json({ success: false, error: error.message });
    }
    finally {
        client.release();
    }
};
exports.addTableColumn = addTableColumn;
