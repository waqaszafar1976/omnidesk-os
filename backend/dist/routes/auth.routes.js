"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const router = (0, express_1.Router)();
// SSO organization domain login route
router.post('/auth/login', auth_controller_1.ssoLoginMock);
// Developer API key generation route
router.post('/auth/tokens', auth_controller_1.generateDeveloperToken);
exports.default = router;
