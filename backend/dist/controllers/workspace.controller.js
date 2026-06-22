"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkspaceMembers = void 0;
const database_1 = __importDefault(require("../config/database"));
const getWorkspaceMembers = async (req, res) => {
    const { id: workspaceId } = req.params;
    const client = await database_1.default.connect();
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
    }
    catch (error) {
        console.error('Error fetching workspace members:', error);
        res.status(500).json({ success: false, error: error.message });
    }
    finally {
        client.release();
    }
};
exports.getWorkspaceMembers = getWorkspaceMembers;
