import { Request, Response } from 'express';
import pool from '../config/database';

export const getTasks = async (req: Request, res: Response) => {
  const userId = req.headers.user_id;
  const statusFilter = req.query.status || 'all'; // active | all | done
  const client = await pool.connect();
  try {
    await client.query('SELECT set_config($1, $2, true);', ['request.jwt.user_id', userId as string]);
    
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

    const tasksRes = await client.query(`
      SELECT t.*, u.name as assignee_name, u.email as assignee_email, u.avatar_color as assignee_avatar_color
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.workspace_id = $1
      ORDER BY t.created_at DESC;
    `, [workspaceId]);

    let tasksList = tasksRes.rows;
    if (statusFilter === 'active') {
      tasksList = tasksList.filter((t: any) => t.status !== 'done');
    } else if (statusFilter === 'done') {
      tasksList = tasksList.filter((t: any) => t.status === 'done');
    }

    res.json({
      success: true,
      data: tasksList
    });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
};

export const getEvents = async (req: Request, res: Response) => {
  const userId = req.headers.user_id;
  const client = await pool.connect();
  try {
    await client.query('SELECT set_config($1, $2, true);', ['request.jwt.user_id', userId as string]);
    
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

    const eventsRes = await client.query(`
      SELECT * FROM events 
      WHERE workspace_id = $1 
      ORDER BY event_time ASC;
    `, [workspaceId]);

    res.json({
      success: true,
      data: eventsRes.rows
    });
  } catch (error: any) {
    console.error('Error fetching events:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
};
