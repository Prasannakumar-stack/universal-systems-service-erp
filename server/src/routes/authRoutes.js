import { Router } from 'express';
import { authenticate } from '../auth.js';
import { login, me } from '../controllers/authController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.post('/login', asyncHandler(login));
router.get('/me', authenticate, asyncHandler(me));

export default router;
