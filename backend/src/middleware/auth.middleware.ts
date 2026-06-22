import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'omnidesk_secret_key_2026';

export interface DecodedToken {
  id: string;
  email: string;
  role: string;
}

export const verifyJWT = (req: Request, res: Response, next: NextFunction) => {
  // Allow bypassing for auth login, seed, and health routes
  const bypassPaths = ['/auth/login', '/api/v1/auth/login', '/api/v1/seed', '/seed', '/health'];
  const fullPath = req.originalUrl.split('?')[0];
  if (bypassPaths.includes(req.path) || bypassPaths.includes(fullPath)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Access denied. No token provided.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    req.headers.user_id = decoded.id;
    // Store decoded token in request for downstream use if needed
    (req as any).user = decoded;
    next();
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Access denied. Invalid or expired token.'
    });
  }
};
