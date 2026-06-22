"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyJWT = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'omnidesk_secret_key_2026';
const verifyJWT = (req, res, next) => {
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
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.headers.user_id = decoded.id;
        // Store decoded token in request for downstream use if needed
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            error: 'INVALID_TOKEN',
            message: 'Access denied. Invalid or expired token.'
        });
    }
};
exports.verifyJWT = verifyJWT;
