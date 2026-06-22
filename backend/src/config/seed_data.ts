import pool from './database';

export const seedMockData = async () => {
  const client = await pool.connect();
  try {
    console.log('Seeding mock tables for Omnidesk OS...');
    await client.query('BEGIN');

    // 1. Setup mock session credentials for RLS testing
    await client.query("SET LOCAL request.jwt.user_id = '00000000-0000-0000-0000-000000000001';");

    // 2. Clear all previous data for a clean state
    await client.query('DELETE FROM tasks');
    await client.query('DELETE FROM events');
    await client.query('DELETE FROM team_members');
    await client.query('DELETE FROM audit_logs');
    await client.query('DELETE FROM consumption_metrics');
    await client.query('DELETE FROM pages');
    await client.query('DELETE FROM workspaces');
    await client.query('DELETE FROM users');

    // 3. Create Default Workspace
    const insertWS = await client.query(`
      INSERT INTO workspaces (id, name, owner_id, tier)
      VALUES ('00000000-0000-0000-0000-000000000001', 'Industrial Sales & Recovery Hub', '00000000-0000-0000-0000-000000000001', 'industrial')
      RETURNING id;
    `);
    const workspaceId = insertWS.rows[0].id;

    // 4. Seed 5 Demo Users
    const demoUsers = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Demo User',
        email: 'demo@omnidesk.com',
        password_hash: 'password123',
        avatar_color: 'bg-blue-500',
        role: 'owner',
        status: 'online'
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Sarah Chen',
        email: 'sarah@omnidesk.os',
        password_hash: 'password123',
        avatar_color: 'bg-gradient-to-br from-indigo-500 to-purple-600',
        role: 'Product Lead',
        status: 'online'
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        name: 'Marcus Webb',
        email: 'marcus@omnidesk.os',
        password_hash: 'password123',
        avatar_color: 'bg-gradient-to-br from-indigo-500 to-purple-600',
        role: 'Engineer',
        status: 'online'
      },
      {
        id: '00000000-0000-0000-0000-000000000004',
        name: 'Aisha Patel',
        email: 'aisha@omnidesk.os',
        password_hash: 'password123',
        avatar_color: 'bg-gradient-to-br from-indigo-500 to-purple-600',
        role: 'Designer',
        status: 'online'
      },
      {
        id: '00000000-0000-0000-0000-000000000005',
        name: 'Diego Lopez',
        email: 'diego@omnidesk.os',
        password_hash: 'password123',
        avatar_color: 'bg-gradient-to-br from-indigo-500 to-purple-600',
        role: 'PM',
        status: 'online'
      },
      {
        id: '00000000-0000-0000-0000-000000000006',
        name: 'Yuki Tanaka',
        email: 'yuki@omnidesk.os',
        password_hash: 'password123',
        avatar_color: 'bg-gradient-to-br from-indigo-500 to-purple-600',
        role: 'Analyst',
        status: 'online'
      }
    ];

    for (const u of demoUsers) {
      await client.query(`
        INSERT INTO users (id, name, email, password_hash, avatar_color, role, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7);
      `, [u.id, u.name, u.email, u.password_hash, u.avatar_color, u.role, u.status]);
    }

    // 5. Assign all 6 users to the Default Workspace
    const teamMembers = [
      { user_id: '00000000-0000-0000-0000-000000000001', role: 'owner' },
      { user_id: '00000000-0000-0000-0000-000000000002', role: 'member' },
      { user_id: '00000000-0000-0000-0000-000000000003', role: 'member' },
      { user_id: '00000000-0000-0000-0000-000000000004', role: 'member' },
      { user_id: '00000000-0000-0000-0000-000000000005', role: 'member' },
      { user_id: '00000000-0000-0000-0000-000000000006', role: 'member' }
    ];

    for (const tm of teamMembers) {
      await client.query(`
        INSERT INTO team_members (workspace_id, user_id, role)
        VALUES ($1, $2, $3);
      `, [workspaceId, tm.user_id, tm.role]);
    }

    // 6. Create Module A Document Page
    const insertDoc = await client.query(`
      INSERT INTO pages (workspace_id, title, type, content)
      VALUES ($1, 'Sales Policy Guidelines', 'document', '{"blocks":[{"type":"heading","data":{"level":1,"text":"Sales Policy Guidelines"}},{"type":"paragraph","data":{"text":"Welcome to the Sales & Recovery policy file for our distributor network. Edit this document collaboratively in real time."}}]}')
      RETURNING id;
    `, [workspaceId]);

    // 7. Create Module B Smart Table Page
    const insertTable = await client.query(`
      INSERT INTO pages (workspace_id, title, type, content)
      VALUES ($1, 'Daily Sales & Recovery', 'table', NULL)
      RETURNING id;
    `, [workspaceId]);
    const tablePageId = insertTable.rows[0].id;

    // 8. Create Table Metadata registry
    const insertMeta = await client.query(`
      INSERT INTO table_metadata (page_id, row_count)
      VALUES ($1, 3)
      RETURNING id;
    `, [tablePageId]);
    const tableMetadataId = insertMeta.rows[0].id;

    // 9. Create Table Column configs (DataType enforcement)
    const columns = [
      { name: 'Invoice ID', key: 'col_invoice_id', type: 'number', order: 1, options: null },
      { name: 'Customer Name', key: 'col_customer_name', type: 'text', order: 2, options: null },
      { name: 'Date', key: 'col_date', type: 'date', order: 3, options: null },
      { name: 'Amount Due', key: 'col_amount_due', type: 'number', order: 4, options: null },
      { name: 'Received Amount', key: 'col_received_amount', type: 'number', order: 5, options: null },
      { name: 'Status', key: 'col_status', type: 'select', order: 6, options: { choices: ['Paid', 'Pending', 'Overdue'] } }
    ];

    for (const col of columns) {
      await client.query(`
        INSERT INTO column_configs (table_id, name, internal_key, data_type, options, display_order)
        VALUES ($1, $2, $3, $4, $5, $6);
      `, [tableMetadataId, col.name, col.key, col.type, col.options ? JSON.stringify(col.options) : null, col.order]);
    }

    // 10. Insert Smart Table Rows (JSONB Cells)
    const rows = [
      {
        cells: {
          col_invoice_id: 1001,
          col_customer_name: 'Ali Ahmed',
          col_date: '2026-06-21',
          col_amount_due: 15000,
          col_received_amount: 15000,
          col_status: 'Paid'
        }
      },
      {
        cells: {
          col_invoice_id: 1002,
          col_customer_name: 'Corporate Client A',
          col_date: '2026-06-21',
          col_amount_due: 50000,
          col_received_amount: 0,
          col_status: 'Pending'
        }
      },
      {
        cells: {
          col_invoice_id: 1003,
          col_customer_name: 'Wholesale Distributor B',
          col_date: '2026-06-20',
          col_amount_due: 20000,
          col_received_amount: 10000,
          col_status: 'Pending'
        }
      }
    ];

    for (const r of rows) {
      await client.query(`
        INSERT INTO table_rows (table_id, cells)
        VALUES ($1, $2);
      `, [tableMetadataId, JSON.stringify(r.cells)]);
    }

    // 11. Create Module C Canvas Page
    const canvasConfig = {
      layout: [
        {
          id: 'block_001',
          type: 'metric_card',
          position: { x: 0, y: 0, w: 4, h: 2 },
          properties: {
            title: 'Total Outstanding due',
            source_table_id: tableMetadataId,
            source_column_key: 'col_amount_due',
            operation: 'SUM',
            text_color: '#EF4444'
          }
        },
        {
          id: 'block_002',
          type: 'metric_card',
          position: { x: 4, y: 0, w: 4, h: 2 },
          properties: {
            title: 'Total Recovery SUM',
            source_table_id: tableMetadataId,
            source_column_key: 'col_received_amount',
            operation: 'SUM',
            text_color: '#10B981'
          }
        },
        {
          id: 'block_003',
          type: 'smart_grid',
          position: { x: 0, y: 3, w: 12, h: 6 },
          properties: {
            table_id: tableMetadataId,
            default_view: 'table',
            rows_per_page: 10
          }
        }
      ]
    };

    await client.query(`
      INSERT INTO pages (workspace_id, title, type, content)
      VALUES ($1, 'Wholesale Performance Dashboard', 'canvas', $2)
    `, [workspaceId, JSON.stringify(canvasConfig)]);

    // 12. Seed consumption metrics
    const resourceTypes = ['ai_tokens', 'file_storage_bytes', 'webhook_executions'];
    const mockCounts = {
      ai_tokens: 34200,
      file_storage_bytes: 471859200, // 450 MB
      webhook_executions: 1250
    };

    for (const rType of resourceTypes) {
      await client.query(`
        INSERT INTO consumption_metrics (workspace_id, resource_type, usage_count)
        VALUES ($1, $2, $3);
      `, [workspaceId, rType, mockCounts[rType as keyof typeof mockCounts]]);
    }

    // 13. Seed audit logs
    const mockAuditLogs = [
      { action: 'CREATE_PAGE', resource: 'document: Sales Policy Guidelines', meta: { format: 'document' } },
      { action: 'CREATE_PAGE', resource: 'table: Daily Sales & Recovery', meta: { format: 'table' } },
      { action: 'ADD_TABLE_ROW', resource: 'row_1001', meta: { table: 'Daily Sales & Recovery', amount: 15000 } },
      { action: 'ADD_TABLE_ROW', resource: 'row_1002', meta: { table: 'Daily Sales & Recovery', amount: 50000 } },
      { action: 'ADD_TABLE_ROW', resource: 'row_1003', meta: { table: 'Daily Sales & Recovery', amount: 20000 } },
      { action: 'CREATE_PAGE', resource: 'canvas: Wholesale Performance Dashboard', meta: { format: 'canvas' } },
      { action: 'GENERATE_API_TOKEN', resource: 'sk_live_****', meta: { expiration: '1 year' } }
    ];

    const userId = '00000000-0000-0000-0000-000000000001';
    for (const log of mockAuditLogs) {
      await client.query(`
        INSERT INTO audit_logs (workspace_id, user_id, action, resource, metadata)
        VALUES ($1, $2, $3, $4, $5);
      `, [workspaceId, userId, log.action, log.resource, JSON.stringify(log.meta)]);
    }

    // 14. Seed 4 Tasks
    const tasks = [
      {
        id: '10000000-0000-0000-0000-000000000001',
        assignee_id: '00000000-0000-0000-0000-000000000002', // Sarah Chen
        title: 'Review Q4 budget proposal',
        priority: 'high',
        status: 'in-progress',
        progress: 65
      },
      {
        id: '10000000-0000-0000-0000-000000000002',
        assignee_id: '00000000-0000-0000-0000-000000000003', // Marcus Webb
        title: 'Onboard new team members',
        priority: 'medium',
        status: 'in-progress',
        progress: 40
      },
      {
        id: '10000000-0000-0000-0000-000000000003',
        assignee_id: '00000000-0000-0000-0000-000000000004', // Aisha Patel
        title: 'Update product documentation',
        priority: 'low',
        status: 'todo',
        progress: 15
      },
      {
        id: '10000000-0000-0000-0000-000000000004',
        assignee_id: '00000000-0000-0000-0000-000000000005', // Diego Lopez
        title: 'Design system audit',
        priority: 'medium',
        status: 'in-progress',
        progress: 80
      }
    ];

    for (const t of tasks) {
      await client.query(`
        INSERT INTO tasks (id, workspace_id, assignee_id, title, priority, status, progress)
        VALUES ($1, $2, $3, $4, $5, $6, $7);
      `, [t.id, workspaceId, t.assignee_id, t.title, t.priority, t.status, t.progress]);
    }

    // 15. Seed 4 Events
    const events = [
      {
        id: '20000000-0000-0000-0000-000000000001',
        title: 'Product Review',
        event_time: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
        priority: 'high'
      },
      {
        id: '20000000-0000-0000-0000-000000000002',
        title: 'Sprint Planning',
        event_time: new Date(Date.now() + 86400000).toISOString(),
        priority: 'high'
      },
      {
        id: '20000000-0000-0000-0000-000000000003',
        title: 'Design Sync',
        event_time: new Date(Date.now() + 172800000).toISOString(),
        priority: 'medium'
      },
      {
        id: '20000000-0000-0000-0000-000000000004',
        title: 'Q4 Strategy',
        event_time: new Date(Date.now() + 345600000).toISOString(),
        priority: 'high'
      }
    ];

    for (const e of events) {
      await client.query(`
        INSERT INTO events (id, workspace_id, title, event_time, priority)
        VALUES ($1, $2, $3, $4, $5);
      `, [e.id, workspaceId, e.title, e.event_time, e.priority]);
    }

    await client.query('COMMIT');
    console.log('Mock workspace, users, tasks, events, documents, and dashboards successfully seeded.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding mock workspace:', error);
    throw error;
  } finally {
    client.release();
  }
};
