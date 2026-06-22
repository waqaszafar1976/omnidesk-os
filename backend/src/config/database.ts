import { Pool } from 'pg';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const inMemoryDb = {
  workspaces: [] as any[],
  pages: [] as any[],
  table_metadata: [] as any[],
  column_configs: [] as any[],
  table_rows: [] as any[],
  consumption_metrics: [] as any[],
  audit_logs: [] as any[],
  users: [] as any[],
  team_members: [] as any[],
  tasks: [] as any[],
  events: [] as any[],
};

// Helper to parse hardcoded SQL values when parameters are embedded inside the SQL text instead of being passed as bindings
const parseSqlValues = (sql: string, params: any[]): any[] => {
  const valuesMatch = sql.match(/values\s*\((.*)\)/i);
  if (!valuesMatch) return params;

  const valuesStr = valuesMatch[1];
  const tokens: any[] = [];
  let currentToken = '';
  let inQuotes = false;
  let quoteChar = '';
  let i = 0;
  while (i < valuesStr.length) {
    const char = valuesStr[i];
    if ((char === "'" || char === '"') && (i === 0 || valuesStr[i - 1] !== '\\')) {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuotes = false;
      } else {
        currentToken += char;
      }
    } else if (char === ',' && !inQuotes) {
      tokens.push(currentToken.trim());
      currentToken = '';
    } else {
      currentToken += char;
    }
    i++;
  }
  tokens.push(currentToken.trim());

  return tokens.map(t => {
    if (t.startsWith('$')) {
      const idx = parseInt(t.substring(1)) - 1;
      return params[idx];
    }
    if (t.toLowerCase() === 'null') return null;
    if (t.toLowerCase() === 'current_timestamp') return new Date();
    if (t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1);
    if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
    const num = Number(t);
    if (!isNaN(num) && t !== '') return num;
    return t;
  });
};

let activeMockUserId = '00000000-0000-0000-0000-000000000001';

// Mock Query Interpreter
const executeMockQuery = async (text: string, params: any[] = []): Promise<{ rows: any[] }> => {
  const sql = text.trim().replace(/\s+/g, ' ');
  const sqlLower = sql.toLowerCase();

  // 1. SET config / transaction controls
  if (sqlLower.startsWith('set local') || sqlLower.startsWith('select set_config') || sqlLower.startsWith('begin') || sqlLower.startsWith('commit') || sqlLower.startsWith('rollback')) {
    if (sqlLower.includes('request.jwt.user_id') || (params && params[0] === 'request.jwt.user_id')) {
      activeMockUserId = params[1] || activeMockUserId;
    }
    return { rows: [] };
  }

  // 2. CREATE EXTENSION / CREATE TABLE / ALTER TABLE / CREATE INDEX
  if (sqlLower.startsWith('create extension') || sqlLower.startsWith('create table') || sqlLower.startsWith('alter table') || sqlLower.startsWith('create index')) {
    return { rows: [] };
  }

  // 3. SELECT FROM workspaces
  if (sqlLower.includes('from workspaces')) {
    const userId = params[0] || activeMockUserId;
    const memberWsIds = inMemoryDb.team_members
      .filter(tm => tm.user_id === userId)
      .map(tm => tm.workspace_id);
    const workspaces = inMemoryDb.workspaces.filter(w => w.owner_id === userId || memberWsIds.includes(w.id));
    
    if (sqlLower.includes('limit 1')) {
      return { rows: workspaces.slice(0, 1) };
    }
    return { rows: workspaces };
  }

  // 4. INSERT INTO workspaces
  if (sqlLower.includes('insert into workspaces')) {
    const parsed = parseSqlValues(sql, params);
    let id, name, owner_id, tier;
    if (parsed.length === 4) {
      id = parsed[0];
      name = parsed[1];
      owner_id = parsed[2];
      tier = parsed[3];
    } else {
      name = parsed[0];
      owner_id = parsed[1];
      tier = parsed[2] || 'free';
      id = uuidv4();
    }
    const newWorkspace = { id, name, owner_id, tier, created_at: new Date(), updated_at: new Date() };
    inMemoryDb.workspaces.push(newWorkspace);
    return { rows: [newWorkspace] };
  }

  // 5. DELETE FROM pages WHERE workspace_id = $1
  if (sqlLower.startsWith('delete from pages') && sqlLower.includes('workspace_id = $1')) {
    const workspaceId = params[0];
    inMemoryDb.pages = inMemoryDb.pages.filter(p => p.workspace_id !== workspaceId);
    return { rows: [] };
  }

  // 6. INSERT INTO pages
  if (sqlLower.includes('insert into pages')) {
    const parsed = parseSqlValues(sql, params);
    const workspace_id = parsed[0];
    const title = parsed[1] || 'Untitled Page';
    const type = parsed[2];
    const content = parsed[3] || '{}';
    const id = uuidv4();
    const newPage = { id, workspace_id, title, type, content, created_at: new Date(), updated_at: new Date() };
    inMemoryDb.pages.push(newPage);
    return { rows: [newPage] };
  }

  // 7. INSERT INTO table_metadata
  if (sqlLower.includes('insert into table_metadata')) {
    const parsed = parseSqlValues(sql, params);
    const page_id = parsed[0];
    const row_count = parsed[1] || 0;
    const id = uuidv4();
    const newMeta = { id, page_id, row_count, created_at: new Date() };
    inMemoryDb.table_metadata.push(newMeta);
    return { rows: [{ id }] };
  }

  // 8. INSERT INTO column_configs
  if (sqlLower.includes('insert into column_configs')) {
    const parsed = parseSqlValues(sql, params);
    const table_id = parsed[0];
    const name = parsed[1];
    const internal_key = parsed[2];
    const data_type = parsed[3];
    let options = null;
    let display_order = 0;
    if (parsed.length === 6) {
      options = parsed[4] ? (typeof parsed[4] === 'string' ? JSON.parse(parsed[4]) : parsed[4]) : null;
      display_order = parsed[5];
    } else {
      display_order = parsed[4];
    }
    const id = uuidv4();
    const newCol = { id, table_id, name, internal_key, data_type, options, formula_expression: null, display_order, created_at: new Date(), updated_at: new Date() };
    inMemoryDb.column_configs.push(newCol);
    return { rows: [newCol] };
  }

  // 9. INSERT INTO table_rows
  if (sqlLower.includes('insert into table_rows')) {
    const parsed = parseSqlValues(sql, params);
    const table_id = parsed[0];
    const cells = typeof parsed[1] === 'string' ? JSON.parse(parsed[1]) : (parsed[1] || {});
    const id = uuidv4();
    const display_order = inMemoryDb.table_rows.length + 1;
    const newRow = { id, table_id, cells, display_order, created_at: new Date(), updated_at: new Date() };
    inMemoryDb.table_rows.push(newRow);
    return { rows: [newRow] };
  }

  // 10. UPDATE pages SET content = $1
  if (sqlLower.includes('update pages') && sqlLower.includes('content = $1')) {
    const content = params[0];
    const pageId = params[1];
    const page = inMemoryDb.pages.find(p => p.id === pageId);
    if (page) {
      page.content = content;
      page.updated_at = new Date();
      return { rows: [{ id: page.id, title: page.title }] };
    }
    return { rows: [] };
  }

  // 11. SELECT FROM pages WHERE id = $1
  if (sqlLower.includes('from pages') && (sqlLower.includes('where id = $1') || sqlLower.includes(' id = $1')) && !sqlLower.includes('workspace_id')) {
    const pageId = params[0];
    const page = inMemoryDb.pages.find(p => p.id === pageId);
    return { rows: page ? [page] : [] };
  }

  // 12. SELECT list all pages (listAllPages)
  if (sqlLower.includes('from pages')) {
    if (sqlLower.includes('workspace_id = $1') || sqlLower.includes('workspace_id =')) {
      const workspaceId = params[0];
      const filteredPages = inMemoryDb.pages.filter(p => p.workspace_id === workspaceId);
      return { rows: filteredPages };
    }
    const userWS = inMemoryDb.workspaces.filter(w => w.owner_id === activeMockUserId);
    const wsIds = userWS.map(w => w.id);
    const filteredPages = inMemoryDb.pages.filter(p => wsIds.includes(p.workspace_id));
    return { rows: filteredPages };
  }

  // 13. SELECT table column configs schema (getTableSchema)
  if (sqlLower.includes('select cc.id') && sqlLower.includes('from column_configs cc')) {
    const lookupId = params[0];
    // Find metadata first to get the correct table ID
    const metadata = inMemoryDb.table_metadata.find(m => m.id === lookupId || m.page_id === lookupId);
    if (!metadata) return { rows: [] };
    
    const cols = inMemoryDb.column_configs
      .filter(cc => cc.table_id === metadata.id)
      .sort((a, b) => a.display_order - b.display_order);
    return { rows: cols };
  }

  // 14. SELECT table rows (getTableRows)
  if (sqlLower.includes('select tr.id') && sqlLower.includes('from table_rows tr')) {
    const lookupId = params[0];
    const metadata = inMemoryDb.table_metadata.find(m => m.id === lookupId || m.page_id === lookupId);
    if (!metadata) return { rows: [] };

    const rows = inMemoryDb.table_rows
      .filter(tr => tr.table_id === metadata.id)
      .sort((a, b) => a.display_order - b.display_order);
    return { rows: rows };
  }

  // 15. SELECT table metadata (addTableRow)
  if (sqlLower.includes('select id from table_metadata') && sqlLower.includes('id = $1 or page_id = $1')) {
    const lookupId = params[0];
    const metadata = inMemoryDb.table_metadata.find(m => m.id === lookupId || m.page_id === lookupId);
    return { rows: metadata ? [{ id: metadata.id }] : [] };
  }

  // 16. UPDATE table_metadata SET row_count
  if (sqlLower.includes('update table_metadata set row_count')) {
    const tableId = params[0];
    const metadata = inMemoryDb.table_metadata.find(m => m.id === tableId);
    if (metadata) {
      metadata.row_count += 1;
    }
    return { rows: [] };
  }

  // 17. UPDATE table_rows (updateTableRow)
  if (sqlLower.includes('update table_rows') && sqlLower.includes('cells = cells || $1')) {
    const cellsToMerge = typeof params[0] === 'string' ? JSON.parse(params[0]) : (params[0] || {});
    const rowId = params[1];
    const tableId = params[2];

    const row = inMemoryDb.table_rows.find(tr => tr.id === rowId);
    if (row) {
      row.cells = { ...row.cells, ...cellsToMerge };
      row.updated_at = new Date();
      return { rows: [row] };
    }
    return { rows: [] };
  }

  // 18. SELECT next display order for column config
  if (sqlLower.includes('select coalesce(max(display_order), 0) + 1')) {
    const tableId = params[0];
    const cols = inMemoryDb.column_configs.filter(cc => cc.table_id === tableId);
    const maxOrder = cols.reduce((max, c) => c.display_order > max ? c.display_order : max, 0);
    return { rows: [{ next_order: maxOrder + 1 }] };
  }

  // 19. INSERT INTO audit_logs
  if (sqlLower.includes('insert into audit_logs')) {
    const parsed = parseSqlValues(sql, params);
    const workspace_id = parsed[0];
    const user_id = parsed[1];
    const action = parsed[2];
    const resource = parsed[3];
    const metadata = parsed[4] ? (typeof parsed[4] === 'string' ? JSON.parse(parsed[4]) : parsed[4]) : {};
    const id = uuidv4();
    const newLog = { id, workspace_id, user_id, action, resource, metadata, created_at: new Date() };
    inMemoryDb.audit_logs.push(newLog);
    return { rows: [newLog] };
  }

  // 20. SELECT FROM audit_logs
  if (sqlLower.includes('from audit_logs')) {
    // Return mock audit logs
    const sorted = [...inMemoryDb.audit_logs].sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    return { rows: sorted };
  }

  // 21. SELECT FROM consumption_metrics
  if (sqlLower.includes('from consumption_metrics')) {
    const workspaceId = params[0];
    const metrics = inMemoryDb.consumption_metrics.filter(m => m.workspace_id === workspaceId);
    return { rows: metrics };
  }

  // 22. INSERT/UPDATE consumption_metrics
  if (sqlLower.includes('insert into consumption_metrics') || sqlLower.includes('update consumption_metrics')) {
    const parsed = parseSqlValues(sql, params);
    const workspace_id = parsed[0];
    const resource_type = parsed[1];
    const usage_count = Number(parsed[2] || 0);

    let metric = inMemoryDb.consumption_metrics.find(m => m.workspace_id === workspace_id && m.resource_type === resource_type);
    if (metric) {
      metric.usage_count = usage_count;
      metric.last_updated = new Date();
    } else {
      metric = { id: uuidv4(), workspace_id, resource_type, usage_count, last_updated: new Date() };
      inMemoryDb.consumption_metrics.push(metric);
    }
    return { rows: [metric] };
  }

  // 23. DELETE tables (for seed cleanup)
  if (sqlLower.startsWith('delete from tasks')) {
    inMemoryDb.tasks = [];
    return { rows: [] };
  }
  if (sqlLower.startsWith('delete from events')) {
    inMemoryDb.events = [];
    return { rows: [] };
  }
  if (sqlLower.startsWith('delete from team_members')) {
    inMemoryDb.team_members = [];
    return { rows: [] };
  }
  if (sqlLower.startsWith('delete from users')) {
    inMemoryDb.users = [];
    return { rows: [] };
  }
  if (sqlLower.startsWith('delete from workspaces')) {
    inMemoryDb.workspaces = [];
    return { rows: [] };
  }
  if (sqlLower.startsWith('delete from audit_logs')) {
    inMemoryDb.audit_logs = [];
    return { rows: [] };
  }
  if (sqlLower.startsWith('delete from consumption_metrics')) {
    inMemoryDb.consumption_metrics = [];
    return { rows: [] };
  }
  if (sqlLower.startsWith('delete from pages')) {
    inMemoryDb.pages = [];
    return { rows: [] };
  }

  // UPDATE users SET status = $1 WHERE id = $2
  if (sqlLower.startsWith('update users') && sqlLower.includes('status =')) {
    const status = params[0];
    const userId = params[1];
    const user = inMemoryDb.users.find(u => u.id === userId);
    if (user) {
      user.status = status;
    }
    return { rows: [] };
  }

  // 24. INSERT INTO users
  if (sqlLower.includes('insert into users')) {
    const parsed = parseSqlValues(sql, params);
    const id = parsed[0] || uuidv4();
    const name = parsed[1];
    const email = parsed[2];
    const password_hash = parsed[3] || 'password123';
    const avatar_color = parsed[4] || 'bg-blue-500';
    const role = parsed[5];
    const status = parsed[6] || 'offline';
    const newUser = { id, name, email, password_hash, avatar_color, role, status, created_at: new Date() };
    inMemoryDb.users.push(newUser);
    return { rows: [newUser] };
  }

  // 25. INSERT INTO team_members
  if (sqlLower.includes('insert into team_members')) {
    const parsed = parseSqlValues(sql, params);
    const workspace_id = parsed[0];
    const user_id = parsed[1];
    const role = parsed[2];
    const newMember = { workspace_id, user_id, role };
    inMemoryDb.team_members.push(newMember);
    return { rows: [newMember] };
  }

  // 26. INSERT INTO tasks
  if (sqlLower.includes('insert into tasks')) {
    const parsed = parseSqlValues(sql, params);
    const id = parsed[0] || uuidv4();
    const workspace_id = parsed[1];
    const assignee_id = parsed[2];
    const title = parsed[3];
    const priority = parsed[4];
    const status = parsed[5];
    const progress = parsed[6] || 0;
    const newTask = { id, workspace_id, assignee_id, title, priority, status, progress, created_at: new Date() };
    inMemoryDb.tasks.push(newTask);
    return { rows: [newTask] };
  }

  // 27. INSERT INTO events
  if (sqlLower.includes('insert into events')) {
    const parsed = parseSqlValues(sql, params);
    const id = parsed[0] || uuidv4();
    const workspace_id = parsed[1];
    const title = parsed[2];
    const event_time = parsed[3] ? new Date(parsed[3]) : new Date();
    const priority = parsed[4];
    const newEvent = { id, workspace_id, title, event_time, priority, created_at: new Date() };
    inMemoryDb.events.push(newEvent);
    return { rows: [newEvent] };
  }

  // 28. SELECT FROM users
  if (sqlLower.includes('from users') && !sqlLower.includes('join team_members')) {
    if (sqlLower.includes('email = $1') || sqlLower.includes('email =')) {
      const email = params[0];
      const user = inMemoryDb.users.find(u => u.email === email);
      return { rows: user ? [user] : [] };
    }
    if (sqlLower.includes('id = $1') || sqlLower.includes('id =')) {
      const id = params[0];
      const user = inMemoryDb.users.find(u => u.id === id);
      return { rows: user ? [user] : [] };
    }
    return { rows: inMemoryDb.users };
  }

  // 29. SELECT FROM tasks
  if (sqlLower.includes('from tasks')) {
    let filtered = [...inMemoryDb.tasks];
    if (sqlLower.includes('workspace_id = $1') || sqlLower.includes('workspace_id =')) {
      const workspaceId = params[0];
      filtered = filtered.filter(t => t.workspace_id === workspaceId);
    } else {
      const userWorkspaces = inMemoryDb.team_members
        .filter(tm => tm.user_id === activeMockUserId)
        .map(tm => tm.workspace_id);
      const ownedWorkspaces = inMemoryDb.workspaces
        .filter(w => w.owner_id === activeMockUserId)
        .map(w => w.id);
      const allWs = Array.from(new Set([...userWorkspaces, ...ownedWorkspaces]));
      filtered = filtered.filter(t => allWs.includes(t.workspace_id));
    }
    return { rows: filtered };
  }

  // 30. SELECT FROM events
  if (sqlLower.includes('from events')) {
    let filtered = [...inMemoryDb.events];
    if (sqlLower.includes('workspace_id = $1') || sqlLower.includes('workspace_id =')) {
      const workspaceId = params[0];
      filtered = filtered.filter(e => e.workspace_id === workspaceId);
    } else {
      const userWorkspaces = inMemoryDb.team_members
        .filter(tm => tm.user_id === activeMockUserId)
        .map(tm => tm.workspace_id);
      const ownedWorkspaces = inMemoryDb.workspaces
        .filter(w => w.owner_id === activeMockUserId)
        .map(w => w.id);
      const allWs = Array.from(new Set([...userWorkspaces, ...ownedWorkspaces]));
      filtered = filtered.filter(e => allWs.includes(e.workspace_id));
    }
    return { rows: filtered };
  }

  // 31. SELECT FROM team_members & JOIN queries
  if (sqlLower.includes('from team_members') || (sqlLower.includes('join team_members') && sqlLower.includes('from users'))) {
    const workspaceId = params[0];
    const members = inMemoryDb.team_members.filter(tm => tm.workspace_id === workspaceId);
    const rows = members.map(tm => {
      const user = inMemoryDb.users.find(u => u.id === tm.user_id);
      return {
        id: user ? user.id : tm.user_id,
        name: user ? user.name : 'Unknown Member',
        email: user ? user.email : '',
        avatar_color: user ? user.avatar_color : 'bg-blue-500',
        role: tm.role,
        workspace_id: tm.workspace_id,
        user_id: tm.user_id
      };
    });
    return { rows };
  }

  // 32. SELECT audit_logs joined with users (recent activity)
  if (sqlLower.includes('from audit_logs') && sqlLower.includes('join users')) {
    const rows = inMemoryDb.audit_logs.map(log => {
      const user = inMemoryDb.users.find(u => u.id === log.user_id);
      return {
        ...log,
        user_name: user ? user.name : 'System',
        user_email: user ? user.email : '',
        user_avatar_color: user ? user.avatar_color : 'bg-blue-500'
      };
    });
    const sorted = rows.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    return { rows: sorted };
  }

  console.warn(`Unmatched mock query: ${text}`);
  return { rows: [] };
};

// Implement Pool Client Interface for Transactions
class MockClient {
  async query(text: string, params?: any[]) {
    return executeMockQuery(text, params);
  }
  release() {
    // No-op
  }
}

// Implement Pool Interface
class MockPool {
  async query(text: string, params?: any[]) {
    return executeMockQuery(text, params);
  }
  async connect(): Promise<any> {
    return new MockClient();
  }
}

// Check database connection and export either Real PostgreSQL or Mock In-Memory Database
let pool: any;
let isMockDb = false;

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL is missing. Using in-memory Mock Database fallback.');
  pool = new MockPool();
  isMockDb = true;
} else {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 2000 // 2 seconds timeout to fail fast
    });
    isMockDb = false;
  } catch (e) {
    console.error('Error instantiating pg Pool, falling back to in-memory Mock Database:', e);
    pool = new MockPool();
    isMockDb = true;
  }
}

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

export const initializeDatabase = async () => {
  if (isMockDb) {
    console.log('Database runs in mock memory mode. Scaffolding is emulated.');
    return;
  }

  let client;
  try {
    client = await pool.connect();
    console.log('Initializing database schema...');
    
    // Start Transaction
    await client.query('BEGIN');

    // 1. Enable extensions
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    
    // Try enabling vector extension
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS "vector";');
      console.log('pgvector extension enabled successfully.');
    } catch (e) {
      console.warn('Warning: pgvector extension is not available in local Postgres. Vector features will be mocked.');
    }

    // 2. WORKSPACES TABLE
    await client.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        owner_id UUID NOT NULL,
        tier VARCHAR(50) DEFAULT 'free' CHECK (tier IN ('free', 'student', 'corporate', 'industrial')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Enable RLS on Workspaces
    await client.query('ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;');
    await client.query('DROP POLICY IF EXISTS workspace_isolation_policy ON workspaces;');
    await client.query(`
      CREATE POLICY workspace_isolation_policy ON workspaces
      USING (owner_id = current_setting('request.jwt.user_id', true)::uuid);
    `);

    // 3. PAGES TABLE
    await client.query(`
      CREATE TABLE IF NOT EXISTS pages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        title VARCHAR(255) DEFAULT 'Untitled Page',
        type VARCHAR(50) NOT NULL CHECK (type IN ('document', 'table', 'canvas')),
        content TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Enable RLS on Pages
    await client.query('ALTER TABLE pages ENABLE ROW LEVEL SECURITY;');
    await client.query('DROP POLICY IF EXISTS page_isolation_policy ON pages;');
    await client.query(`
      CREATE POLICY page_isolation_policy ON pages
      USING (workspace_id IN (SELECT id FROM workspaces));
    `);

    // Try adding vector column dynamically
    try {
      await client.query('ALTER TABLE pages ADD COLUMN IF NOT EXISTS embedding VECTOR(1536);');
    } catch (e) {
      // Ignored if vector is disabled
    }

    // 4. TABLE METADATA TABLE
    await client.query(`
      CREATE TABLE IF NOT EXISTS table_metadata (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        page_id UUID UNIQUE NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        row_count INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Enable RLS on Table Metadata
    await client.query('ALTER TABLE table_metadata ENABLE ROW LEVEL SECURITY;');
    await client.query('DROP POLICY IF EXISTS metadata_isolation_policy ON table_metadata;');
    await client.query(`
      CREATE POLICY metadata_isolation_policy ON table_metadata
      USING (page_id IN (SELECT id FROM pages));
    `);

    // 5. COLUMN CONFIGURATIONS TABLE
    await client.query(`
      CREATE TABLE IF NOT EXISTS column_configs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        table_id UUID NOT NULL REFERENCES table_metadata(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        internal_key VARCHAR(100) NOT NULL,
        data_type VARCHAR(50) NOT NULL CHECK (
          data_type IN ('text', 'number', 'date', 'select', 'formula', 'boolean', 'relation', 'rollup')
        ),
        options JSONB DEFAULT NULL,
        formula_expression TEXT DEFAULT NULL,
        display_order INT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (table_id, internal_key)
      );
    `);

    // Enable RLS on Column Configs
    await client.query('ALTER TABLE column_configs ENABLE ROW LEVEL SECURITY;');
    await client.query('DROP POLICY IF EXISTS configs_isolation_policy ON column_configs;');
    await client.query(`
      CREATE POLICY configs_isolation_policy ON column_configs
      USING (table_id IN (SELECT id FROM table_metadata));
    `);

    // 6. TABLE ROWS TABLE
    await client.query(`
      CREATE TABLE IF NOT EXISTS table_rows (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        table_id UUID NOT NULL REFERENCES table_metadata(id) ON DELETE CASCADE,
        cells JSONB NOT NULL DEFAULT '{}'::jsonb,
        display_order SERIAL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Enable RLS on Table Rows
    await client.query('ALTER TABLE table_rows ENABLE ROW LEVEL SECURITY;');
    await client.query('DROP POLICY IF EXISTS rows_isolation_policy ON table_rows;');
    await client.query(`
      CREATE POLICY rows_isolation_policy ON table_rows
      USING (table_id IN (SELECT id FROM table_metadata));
    `);

    // 7. CONSUMPTION METERING LOGS TABLE
    await client.query(`
      CREATE TABLE IF NOT EXISTS consumption_metrics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        resource_type VARCHAR(50) NOT NULL CHECK (
          resource_type IN ('ai_tokens', 'file_storage_bytes', 'webhook_executions')
        ),
        usage_count BIGINT DEFAULT 0,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Enable RLS on Consumption Metrics
    await client.query('ALTER TABLE consumption_metrics ENABLE ROW LEVEL SECURITY;');
    await client.query('DROP POLICY IF EXISTS consumption_isolation_policy ON consumption_metrics;');
    await client.query(`
      CREATE POLICY consumption_isolation_policy ON consumption_metrics
      USING (workspace_id IN (SELECT id FROM workspaces));
    `);

    // 7.5. AUDIT LOGS TABLE
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        action VARCHAR(100) NOT NULL,
        resource VARCHAR(150) NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Enable RLS on Audit Logs
    await client.query('ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;');
    await client.query('DROP POLICY IF EXISTS audit_isolation_policy ON audit_logs;');
    await client.query(`
      CREATE POLICY audit_isolation_policy ON audit_logs
      USING (workspace_id IN (SELECT id FROM workspaces));
    `);

    // 7.6. USERS TABLE
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL DEFAULT 'password123',
        avatar_color VARCHAR(50) DEFAULT 'bg-blue-500',
        role VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'offline',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7.7. TEAM MEMBERS TABLE
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        role VARCHAR(50) NOT NULL,
        PRIMARY KEY (workspace_id, user_id)
      );
    `);

    // Enable RLS on Team Members
    await client.query('ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;');
    await client.query('DROP POLICY IF EXISTS team_members_isolation_policy ON team_members;');
    await client.query(`
      CREATE POLICY team_members_isolation_policy ON team_members
      USING (workspace_id IN (SELECT id FROM workspaces));
    `);

    // 7.8. TASKS TABLE
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
        assignee_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        priority VARCHAR(20) CHECK (priority IN ('high', 'medium', 'low')),
        status VARCHAR(20) CHECK (status IN ('todo', 'in-progress', 'done')),
        progress INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Enable RLS on Tasks
    await client.query('ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;');
    await client.query('DROP POLICY IF EXISTS tasks_isolation_policy ON tasks;');
    await client.query(`
      CREATE POLICY tasks_isolation_policy ON tasks
      USING (workspace_id IN (SELECT id FROM workspaces));
    `);

    // 7.9. EVENTS TABLE
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        event_time TIMESTAMP WITH TIME ZONE NOT NULL,
        priority VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Enable RLS on Events
    await client.query('ALTER TABLE events ENABLE ROW LEVEL SECURITY;');
    await client.query('DROP POLICY IF EXISTS events_isolation_policy ON events;');
    await client.query(`
      CREATE POLICY events_isolation_policy ON events
      USING (workspace_id IN (SELECT id FROM workspaces));
    `);

    // 8. Performance Indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_pages_workspace ON pages(workspace_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_columns_table ON column_configs(table_id, display_order);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_table_rows_table_id ON table_rows(table_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_table_rows_gin ON table_rows USING gin (cells);');

    await client.query('COMMIT');
    console.log('Database schema successfully initialized with RLS policies.');
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Connection pool failed to initialize. Falling back to Mock Database...');
    pool = new MockPool();
    isMockDb = true;
  } finally {
    if (client) client.release();
  }
};

export default pool;
