import { Request, Response } from 'express';
import pool from '../config/database';

// Central audit logging event helper
export const logAuditEvent = async (
  client: any,
  userId: string,
  action: string,
  resource: string,
  metadata: any = {}
) => {
  try {
    const dbClient = client || pool;
    // Resolve workspace ID associated with the owner (or guest user)
    const wsRes = await dbClient.query(`
      SELECT id FROM workspaces WHERE owner_id = $1 LIMIT 1;
    `, [userId]);

    if (wsRes.rows && wsRes.rows.length > 0) {
      const workspaceId = wsRes.rows[0].id;
      await dbClient.query(`
        INSERT INTO audit_logs (workspace_id, user_id, action, resource, metadata)
        VALUES ($1, $2, $3, $4, $5);
      `, [workspaceId, userId, action, resource, JSON.stringify(metadata)]);
    }
  } catch (err) {
    console.error('Error logging audit event:', err);
  }
};

// Retrieve consumption metrics, credits, and audit ledger entries
export const getBillingMetrics = async (req: Request, res: Response) => {
  const userId = req.headers.user_id || '00000000-0000-0000-0000-000000000001';
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true);', ['request.jwt.user_id', userId as string]);

    // 1. Fetch current workspace details
    const wsRes = await client.query(`
      SELECT id, name, tier FROM workspaces WHERE owner_id = $1 LIMIT 1;
    `, [userId]);

    if (wsRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'WORKSPACE_NOT_FOUND' });
    }

    const workspace = wsRes.rows[0];

    // 2. Fetch resource consumption levels
    const metricsRes = await client.query(`
      SELECT resource_type, usage_count FROM consumption_metrics WHERE workspace_id = $1;
    `, [workspace.id]);

    // 3. Fetch latest audit trail entries
    const auditRes = await client.query(`
      SELECT id, action, resource, metadata, created_at
      FROM audit_logs
      WHERE workspace_id = $1
      ORDER BY created_at DESC
      LIMIT 25;
    `, [workspace.id]);

    await client.query('COMMIT');

    const metrics: Record<string, number> = {
      ai_tokens: 0,
      file_storage_bytes: 0,
      webhook_executions: 0
    };

    metricsRes.rows.forEach((row: any) => {
      metrics[row.resource_type] = Number(row.usage_count);
    });

    const isIndustrial = workspace.tier === 'industrial';
    const limit = isIndustrial ? 1000000 : 50000; // Mock tokens/credits threshold
    const used = isIndustrial 
      ? Math.floor(metrics.ai_tokens * 1.5 + metrics.webhook_executions * 10) 
      : Math.floor(metrics.ai_tokens * 1.2 + metrics.webhook_executions * 5);

    return res.json({
      success: true,
      tier: workspace.tier,
      workspaceName: workspace.name,
      creditLimit: limit,
      creditsUsed: Math.min(used, limit),
      metrics,
      auditLogs: auditRes.rows.map((row: any) => ({
        id: row.id,
        action: row.action,
        resource: row.resource,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
        createdAt: row.created_at
      }))
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error in getBillingMetrics:', err);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};
