import { Router } from 'express';
import { authenticate } from '../auth.js';
import { login, me, profileActivity, removeAvatar, updateProfile, uploadAvatar } from '../controllers/authController.js';
import { loginRateLimit } from '../middleware/loginRateLimit.js';
import { profileAvatarUpload, handleUploadErrors } from '../upload.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.post('/login', loginRateLimit, asyncHandler(login));
router.get('/me', authenticate, asyncHandler(me));
router.get('/profile/activity', authenticate, asyncHandler(profileActivity));
router.patch('/profile', authenticate, asyncHandler(updateProfile));
router.post('/profile/avatar', authenticate, profileAvatarUpload.single('avatar'), handleUploadErrors, asyncHandler(uploadAvatar));
router.delete('/profile/avatar', authenticate, asyncHandler(removeAvatar));

export default router;
