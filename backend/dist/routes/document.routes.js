"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const document_controller_1 = require("../controllers/document.controller");
const router = (0, express_1.Router)();
// 1. Route to list all pages the active tenant workspace possesses permissions for
router.get('/pages', document_controller_1.listAllPages);
// 2. Route to create a new page
router.post('/pages', document_controller_1.createPage);
// 3. Route to get page details
router.get('/pages/:pageId', document_controller_1.getPageDetails);
// 4. Route to update page contents (debounced auto-saves)
router.put('/pages/:pageId/content', document_controller_1.updatePageContent);
exports.default = router;
