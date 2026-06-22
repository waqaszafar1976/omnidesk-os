"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const workspace_controller_1 = require("../controllers/workspace.controller");
const router = (0, express_1.Router)();
router.get('/workspaces/:id/members', workspace_controller_1.getWorkspaceMembers);
exports.default = router;
