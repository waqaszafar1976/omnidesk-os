"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAllPages = exports.getPageDetails = exports.updatePageContent = exports.createPage = void 0;
const database_1 = __importDefault(require("../config/database"));
const billing_controller_1 = require("./billing.controller");
const createPage = async (req, res) => {
    const { title, type } = req.body;
    const userId = req.headers.user_id || '00000000-0000-0000-0000-000000000001';
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT set_config($1, $2, true);', ['request.jwt.user_id', userId]);
        // 1. Resolve workspace ID owned by the active user
        const workspaceRes = await client.query(`
      SELECT id FROM workspaces WHERE owner_id = $1 LIMIT 1;
    `, [userId]);
        if (workspaceRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'WORKSPACE_NOT_FOUND' });
        }
        const workspaceId = workspaceRes.rows[0].id;
        // 2. Insert the page
        const pageResult = await client.query(`
      INSERT INTO pages (workspace_id, title, type, content)
      VALUES ($1, $2, $3, '{}')
      RETURNING id, title, type, workspace_id;
    `, [workspaceId, title || 'Untitled Page', type]);
        const page = pageResult.rows[0];
        // 3. If type is table, initialize table_metadata and column_configs automatically
        if (type === 'table') {
            const metaResult = await client.query(`
        INSERT INTO table_metadata (page_id, row_count)
        VALUES ($1, 0)
        RETURNING id;
      `, [page.id]);
            const tableMetadataId = metaResult.rows[0].id;
            // Seed standard default columns for convenience
            const columns = [
                { name: 'Column 1', key: 'col_1', type: 'text', order: 1 },
                { name: 'Column 2', key: 'col_2', type: 'number', order: 2 }
            ];
            for (const col of columns) {
                await client.query(`
          INSERT INTO column_configs (table_id, name, internal_key, data_type, display_order)
          VALUES ($1, $2, $3, $4, $5);
        `, [tableMetadataId, col.name, col.key, col.type, col.order]);
            }
        }
        await (0, billing_controller_1.logAuditEvent)(client, userId, 'CREATE_PAGE', `${type}: ${title || 'Untitled Page'}`, { pageId: page.id });
        await client.query('COMMIT');
        res.json({ success: true, page });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating page with RLS:', error);
        res.status(500).json({ success: false, error: error.message });
    }
    finally {
        client.release();
    }
};
exports.createPage = createPage;
const updatePageContent = async (req, res) => {
    const { pageId } = req.params;
    const { content } = req.body;
    const userId = req.headers.user_id || '00000000-0000-0000-0000-000000000001';
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT set_config($1, $2, true);', ['request.jwt.user_id', userId]);
        const updateResult = await client.query(`
      UPDATE pages 
      SET content = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, title;
    `, [content, pageId]);
        if (updateResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'PAGE_NOT_FOUND_OR_ACCESS_DENIED',
                message: 'The page was not found or you do not have permission to write to this workspace.'
            });
        }
        await (0, billing_controller_1.logAuditEvent)(client, userId, 'UPDATE_PAGE_CONTENT', `Edited document "${updateResult.rows[0].title}"`, { pageId });
        await client.query('COMMIT');
        res.json({ success: true, page: updateResult.rows[0] });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating page content with RLS:', error);
        res.status(500).json({ success: false, error: error.message });
    }
    finally {
        client.release();
    }
};
exports.updatePageContent = updatePageContent;
const getPageDetails = async (req, res) => {
    const { pageId } = req.params;
    const userId = req.headers.user_id || '00000000-0000-0000-0000-000000000001';
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT set_config($1, $2, true);', ['request.jwt.user_id', userId]);
        const result = await client.query(`
      SELECT id, title, type, content, workspace_id 
      FROM pages 
      WHERE id = $1;
    `, [pageId]);
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'PAGE_NOT_FOUND_OR_ACCESS_DENIED',
                message: 'The page was not found or you do not have permission to view it.'
            });
        }
        await client.query('COMMIT');
        res.json({ success: true, page: result.rows[0] });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error retrieving page details with RLS:', error);
        res.status(500).json({ success: false, error: error.message });
    }
    finally {
        client.release();
    }
};
exports.getPageDetails = getPageDetails;
const listAllPages = async (req, res) => {
    const userId = req.headers.user_id || '00000000-0000-0000-0000-000000000001';
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT set_config($1, $2, true);', ['request.jwt.user_id', userId]);
        const result = await client.query(`
      SELECT p.id, p.title, p.type, p.workspace_id 
      FROM pages p
      JOIN workspaces w ON p.workspace_id = w.id
      ORDER BY p.created_at ASC;
    `);
        await client.query('COMMIT');
        res.json({ success: true, pages: result.rows });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error listing workspace pages with RLS:', error);
        res.status(500).json({ success: false, error: error.message });
    }
    finally {
        client.release();
    }
};
exports.listAllPages = listAllPages;
