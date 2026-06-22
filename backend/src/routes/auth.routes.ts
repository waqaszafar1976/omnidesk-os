import { Router } from 'express';
import { ssoLoginMock, generateDeveloperToken } from '../controllers/auth.controller';

const router = Router();

// SSO organization domain login route
router.post('/auth/login', ssoLoginMock);

// Developer API key generation route
router.post('/auth/tokens', generateDeveloperToken);

export default router;
