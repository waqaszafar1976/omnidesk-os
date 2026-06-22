import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { logAuditEvent } from '../controllers/billing.controller';

const router = Router();

// In-memory rate limiter tracking requests (max 100 req/min)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (token: string): { allowed: boolean; remaining: number; reset: number } => {
  const now = Date.now();
  const limitWindow = 60000; // 1 minute window
  const maxRequests = 100;

  const record = rateLimitMap.get(token);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(token, { count: 1, resetTime: now + limitWindow });
    return { allowed: true, remaining: maxRequests - 1, reset: Math.ceil((now + limitWindow) / 1000) };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, reset: Math.ceil(record.resetTime / 1000) };
  }

  record.count += 1;
  return { allowed: true, remaining: maxRequests - record.count, reset: Math.ceil(record.resetTime / 1000) };
};

// Middleware to authorize developer requests using base64 tokens
const authorizeDeveloper = async (req: Request, res: Response, next: any) => {
  let token = req.headers['x-api-key'] || req.headers['authorization'];
  if (typeof token === 'string' && token.startsWith('Bearer ')) {
    token = token.slice(7);
  }

  if (!token || typeof token !== 'string' || !token.startsWith('sk_live_')) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Provide a valid developer token via X-API-Key or Bearer Authorization header.'
    });
  }

  // Rate Limiting Check
  const rateLimitStatus = checkRateLimit(token);
  res.setHeader('X-RateLimit-Limit', '100');
  res.setHeader('X-RateLimit-Remaining', rateLimitStatus.remaining.toString());
  res.setHeader('X-RateLimit-Reset', rateLimitStatus.reset.toString());

  if (!rateLimitStatus.allowed) {
    return res.status(429).json({
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Rate limit exceeded. Maximum 100 requests per minute.'
    });
  }

  // Extract and decode base64 user identity directly
  const tokenPayload = token.replace('sk_live_', '');
  let userId = '00000000-0000-0000-0000-000000000001'; // Default fallback
  try {
    const decoded = Buffer.from(tokenPayload, 'base64').toString('utf8');
    if (decoded && decoded.includes('-')) {
      userId = decoded;
    }
  } catch (e) {
    // Ignore and fallback to default
  }

  req.headers.user_id = userId;
  next();
};

// 1. GET /developer/pages -> Read pages in this tenant workspace
router.get('/developer/pages', authorizeDeveloper, async (req: Request, res: Response) => {
  const userId = req.headers.user_id as string;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true);', ['request.jwt.user_id', userId]);

    // Fetch pages
    const pagesRes = await client.query(`
      SELECT p.id, p.title, p.type, p.workspace_id, p.created_at
      FROM pages p
    `);

    // Audit Log API access
    await logAuditEvent(client, userId, 'API_GET_PAGES', 'developer: pages list retrieved', { source: 'api_token' });

    await client.query('COMMIT');
    res.json({ success: true, count: pagesRes.rows.length, pages: pagesRes.rows });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// 2. POST /developer/pages -> Create page in this tenant workspace
router.post('/developer/pages', authorizeDeveloper, async (req: Request, res: Response) => {
  const userId = req.headers.user_id as string;
  const { title, type } = req.body;

  if (!type || !['document', 'table', 'canvas'].includes(type)) {
    return res.status(400).json({ success: false, error: 'INVALID_PAGE_TYPE' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true);', ['request.jwt.user_id', userId]);

    // Find workspace owned by user
    const wsRes = await client.query(`
      SELECT id FROM workspaces WHERE owner_id = $1 LIMIT 1;
    `, [userId]);

    if (wsRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'WORKSPACE_NOT_FOUND' });
    }

    const workspaceId = wsRes.rows[0].id;

    // Create page
    const pageRes = await client.query(`
      INSERT INTO pages (workspace_id, title, type, content)
      VALUES ($1, $2, $3, '{}')
      RETURNING id, title, type, workspace_id, created_at;
    `, [workspaceId, title || 'API Node', type]);

    const page = pageRes.rows[0];

    // Seed column schema if table
    if (type === 'table') {
      const metaRes = await client.query(`
        INSERT INTO table_metadata (page_id, row_count)
        VALUES ($1, 0)
        RETURNING id;
      `, [page.id]);

      const tableMetaId = metaRes.rows[0].id;
      await client.query(`
        INSERT INTO column_configs (table_id, name, internal_key, data_type, display_order)
        VALUES ($1, 'API Item Name', 'col_api_name', 'text', 1);
      `, [tableMetaId]);
    }

    // Increment consumption metering for API executions
    await client.query(`
      INSERT INTO consumption_metrics (workspace_id, resource_type, usage_count)
      VALUES ($1, 'webhook_executions', 1)
      ON CONFLICT DO NOTHING;
    `, [workspaceId]);

    await client.query(`
      UPDATE consumption_metrics
      SET usage_count = usage_count + 1, last_updated = CURRENT_TIMESTAMP
      WHERE workspace_id = $1 AND resource_type = 'webhook_executions';
    `, [workspaceId]);

    // Audit Log API access
    await logAuditEvent(client, userId, 'API_CREATE_PAGE', `developer: created page "${page.title}"`, { source: 'api_token' });

    await client.query('COMMIT');
    res.status(201).json({ success: true, page });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

export default router;
