"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentActivity = exports.getTopWorkspaces = exports.getWorkspaceDistribution = exports.getUsageTrend = exports.getKpis = void 0;
const database_1 = __importDefault(require("../config/database"));
const getKpis = async (req, res) => {
    const userId = req.headers.user_id;
    const view = req.query.view || 'user'; // admin | user
    const client = await database_1.default.connect();
    try {
        await client.query('SELECT set_config($1, $2, true);', ['request.jwt.user_id', userId]);
        // Resolve active workspace
        const wsRes = await client.query(`
      SELECT w.id FROM workspaces w
      LEFT JOIN team_members tm ON w.id = tm.workspace_id
      WHERE w.owner_id = $1 OR tm.user_id = $1
      LIMIT 1;
    `, [userId]);
        if (wsRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'WORKSPACE_NOT_FOUND', message: 'No active workspace found for user.' });
        }
        const workspaceId = wsRes.rows[0].id;
        // Fetch counts
        const usersRes = await client.query('SELECT * FROM users;');
        const activeUsersVal = usersRes.rows.filter((u) => u.status === 'online').length;
        const pagesRes = await client.query('SELECT * FROM pages WHERE workspace_id = $1;', [workspaceId]);
        const totalDocsVal = pagesRes.rows.filter((p) => p.type === 'document').length;
        const smartTablesVal = pagesRes.rows.filter((p) => p.type === 'table').length;
        const metricsRes = await client.query('SELECT * FROM consumption_metrics WHERE workspace_id = $1;', [workspaceId]);
        const storageMetric = metricsRes.rows.find((m) => m.resource_type === 'file_storage_bytes');
        const aiMetric = metricsRes.rows.find((m) => m.resource_type === 'ai_tokens');
        const storageUsedVal = storageMetric ? Number(storageMetric.usage_count) : 0;
        const aiCreditsVal = aiMetric ? Number(aiMetric.usage_count) : 0;
        const tasksRes = await client.query('SELECT * FROM tasks WHERE workspace_id = $1;', [workspaceId]);
        const openTasksVal = tasksRes.rows.filter((t) => t.status !== 'done').length;
        const logsRes = await client.query('SELECT * FROM audit_logs WHERE workspace_id = $1;', [workspaceId]);
        const teamActivityVal = logsRes.rows.length;
        res.json({
            success: true,
            data: {
                activeUsers: { value: view === 'admin' ? activeUsersVal : 1, delta: 2, trend: 'up' },
                totalDocuments: { value: totalDocsVal, delta: 5, trend: 'up' },
                smartTables: { value: smartTablesVal, delta: 1, trend: 'up' },
                storageUsed: { value: storageUsedVal, delta: 12, trend: 'up' },
                aiCredits: { value: aiCreditsVal, delta: -8, trend: 'down' },
                openTasks: { value: openTasksVal, delta: -3, trend: 'down' },
                teamActivity: { value: teamActivityVal, delta: 15, trend: 'up' },
                myDocuments: { value: totalDocsVal + smartTablesVal, delta: 3, trend: 'up' }
            }
        });
    }
    catch (error) {
        console.error('Error fetching KPIs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
    finally {
        client.release();
    }
};
exports.getKpis = getKpis;
const getUsageTrend = async (req, res) => {
    const range = req.query.range || '7d';
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 7;
    const labels = [];
    const activeUsersData = [];
    const operationsData = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        // Generate deterministic mock telemetry values
        activeUsersData.push(Math.floor(Math.sin(i * 0.5) * 2) + 3);
        operationsData.push(Math.floor(Math.cos(i * 0.3) * 15) + 40);
    }
    res.json({
        success: true,
        data: {
            labels,
            datasets: [
                { label: 'Active Users', data: activeUsersData },
                { label: 'Operations Conducted', data: operationsData }
            ]
        }
    });
};
exports.getUsageTrend = getUsageTrend;
const getWorkspaceDistribution = async (req, res) => {
    const client = await database_1.default.connect();
    try {
        const wsRes = await client.query('SELECT tier FROM workspaces;');
        const counts = { free: 0, student: 0, corporate: 0, industrial: 0 };
        for (const r of wsRes.rows) {
            const tier = r.tier || 'free';
            if (tier in counts) {
                counts[tier]++;
            }
        }
        // Fallbacks if only 1 workspace exists
        if (counts.industrial === 0)
            counts.industrial = 1;
        if (counts.free === 0)
            counts.free = 4;
        if (counts.corporate === 0)
            counts.corporate = 2;
        if (counts.student === 0)
            counts.student = 1;
        res.json({
            success: true,
            data: {
                labels: ['Free Tier', 'Student Space', 'Corporate Enterprise', 'Industrial Power'],
                data: [counts.free, counts.student, counts.corporate, counts.industrial]
            }
        });
    }
    catch (error) {
        console.error('Error fetching workspace distribution:', error);
        res.status(500).json({ success: false, error: error.message });
    }
    finally {
        client.release();
    }
};
exports.getWorkspaceDistribution = getWorkspaceDistribution;
const getTopWorkspaces = async (req, res) => {
    const limit = Number(req.query.limit) || 4;
    const client = await database_1.default.connect();
    try {
        const wsRes = await client.query('SELECT * FROM workspaces;');
        const workspaces = [];
        for (const ws of wsRes.rows) {
            const pagesRes = await client.query('SELECT id FROM pages WHERE workspace_id = $1;', [ws.id]);
            const logsRes = await client.query('SELECT id FROM audit_logs WHERE workspace_id = $1;', [ws.id]);
            workspaces.push({
                id: ws.id,
                name: ws.name,
                tier: ws.tier,
                documentCount: pagesRes.rows.length,
                activityCount: logsRes.rows.length
            });
        }
        workspaces.sort((a, b) => b.activityCount - a.activityCount);
        if (workspaces.length < limit) {
            const extra = [
                { id: 'mock-ws-1', name: 'Alpha Research Labs', tier: 'industrial', documentCount: 14, activityCount: 95 },
                { id: 'mock-ws-2', name: 'Beta Logistics Group', tier: 'corporate', documentCount: 8, activityCount: 42 },
                { id: 'mock-ws-3', name: 'Gamma Creative Agency', tier: 'free', documentCount: 5, activityCount: 18 }
            ];
            workspaces.push(...extra);
        }
        res.json({
            success: true,
            data: workspaces.slice(0, limit)
        });
    }
    catch (error) {
        console.error('Error fetching top workspaces:', error);
        res.status(500).json({ success: false, error: error.message });
    }
    finally {
        client.release();
    }
};
exports.getTopWorkspaces = getTopWorkspaces;
const getRecentActivity = async (req, res) => {
    const limit = Number(req.query.limit) || 10;
    const userId = req.headers.user_id;
    const client = await database_1.default.connect();
    try {
        await client.query('SELECT set_config($1, $2, true);', ['request.jwt.user_id', userId]);
        const logsRes = await client.query(`
      SELECT a.*, u.name as user_name, u.email as user_email, u.avatar_color as user_avatar_color 
      FROM audit_logs a 
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC;
    `);
        res.json({
            success: true,
            data: logsRes.rows.slice(0, limit)
        });
    }
    catch (error) {
        console.error('Error fetching recent activity:', error);
        res.status(500).json({ success: false, error: error.message });
    }
    finally {
        client.release();
    }
};
exports.getRecentActivity = getRecentActivity;
