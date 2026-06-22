import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'omnidesk_secret_key_2026';

// Redesigned JWT-based SSO login handler
export const ssoLoginMock = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'INVALID_EMAIL_ADDRESS', message: 'Please provide a valid email.' });
  }

  if (!password) {
    return res.status(400).json({ success: false, error: 'MISSING_PASSWORD', message: 'Password is required.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Look up user by email in database
    const userRes = await client.query('SELECT * FROM users WHERE email = $1 LIMIT 1;', [email]);
    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Invalid email or password.' });
    }

    const user = userRes.rows[0];

    // 2. Verify password (for demo, simple comparison is used)
    if (user.password_hash !== password) {
      await client.query('ROLLBACK');
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Invalid email or password.' });
    }

    // 3. Update status to 'online' in db
    await client.query('UPDATE users SET status = $1 WHERE id = $2;', ['online', user.id]);
    user.status = 'online';

    // 4. Resolve workspace for the user
    // First try workspaces where they are owner, then workspaces where they are a team member
    const wsRes = await client.query(`
      SELECT w.id, w.name, w.tier FROM workspaces w
      LEFT JOIN team_members tm ON w.id = tm.workspace_id
      WHERE w.owner_id = $1 OR tm.user_id = $1
      LIMIT 1;
    `, [user.id]);

    await client.query('COMMIT');

    if (wsRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'WORKSPACE_NOT_FOUND', message: 'No workspace assigned to user.' });
    }

    const workspace = wsRes.rows[0];

    // 5. Generate signed JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_color: user.avatar_color,
        role: user.role,
        status: user.status
      },
      workspace,
      token
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error in JWT login:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

// Generate Developer API tokens
export const generateDeveloperToken = async (req: Request, res: Response) => {
  const userId = req.headers.user_id || '00000000-0000-0000-0000-000000000001';
  
  // Return a mock token representing the workspace credentials
  const mockToken = `sk_live_${Buffer.from(userId as string).toString('base64')}`;
  
  res.json({
    success: true,
    token: mockToken,
    expires_in: 31536000, // 1 year
    rate_limit: '100 requests/min'
  });
};
