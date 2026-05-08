import { Router } from 'express';
import { authenticate } from '../auth.js';
import { login, me, updateProfile } from '../controllers/authController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.post('/login', asyncHandler(login));
router.get('/me', authenticate, asyncHandler(me));
router.patch('/profile', authenticate, asyncHandler(updateProfile));

export default router;
