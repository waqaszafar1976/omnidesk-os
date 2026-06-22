import { Request, Response } from 'express';
import pool from '../config/database';

export const getWorkspaceMembers = async (req: Request, res: Response) => {
  const { id: workspaceId } = req.params;
  const client = await pool.connect();
  try {
    const membersRes = await client.query(`
      SELECT u.id, u.name, u.email, u.avatar_color, tm.role, u.status
      FROM users u
      JOIN team_members tm ON u.id = tm.user_id
      WHERE tm.workspace_id = $1;
    `, [workspaceId]);

    res.json({
      success: true,
      data: membersRes.rows
    });
  } catch (error: any) {
    console.error('Error fetching workspace members:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
};
