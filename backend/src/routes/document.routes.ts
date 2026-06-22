import { Router } from 'express';
import { updatePageContent, getPageDetails, listAllPages, createPage } from '../controllers/document.controller';

const router = Router();

// 1. Route to list all pages the active tenant workspace possesses permissions for
router.get('/pages', listAllPages);

// 2. Route to create a new page
router.post('/pages', createPage);

// 3. Route to get page details
router.get('/pages/:pageId', getPageDetails);

// 4. Route to update page contents (debounced auto-saves)
router.put('/pages/:pageId/content', updatePageContent);

export default router;
