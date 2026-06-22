"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const task_controller_1 = require("../controllers/task.controller");
const router = (0, express_1.Router)();
router.get('/tasks', task_controller_1.getTasks);
router.get('/events', task_controller_1.getEvents);
exports.default = router;
