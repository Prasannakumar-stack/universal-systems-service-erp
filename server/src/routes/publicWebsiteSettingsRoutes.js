import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { requirePermission } from '../permissions.js';
import { backupUpload, companyLogoUpload, websiteSettingsUpload, handleUploadErrors } from '../upload.js';
import { create, download, getStorage, remove, restore, updateStorage, validateExisting } from '../controllers/backupController.js';
import { getBusiness, systemInfo, updateBusinessSection } from '../controllers/businessSettingsController.js';
import { deleteLogo, getProfile, updateProfile, uploadLogo } from '../controllers/companyProfileController.js';
import { adminSettings, resetSettings, updateSettings, uploadAsset } from '../controllers/publicWebsiteSettingsController.js';
import { forceStaffPasswordReset, getSecurity, logoutAll, resetAllSessions, securityEvents, updateSecurity } from '../controllers/securitySettingsController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate);
router.get('/company-profile', requirePermission('view_settings'), asyncHandler(getProfile));
router.patch('/company-profile', requireRole('admin'), requirePermission('manage_company_profile'), asyncHandler(updateProfile));
router.post('/company-profile/logo', requireRole('admin'), requirePermission('manage_company_profile'), companyLogoUpload.single('logo'), handleUploadErrors, asyncHandler(uploadLogo));
router.delete('/company-profile/logo', requireRole('admin'), requirePermission('manage_company_profile'), asyncHandler(deleteLogo));
router.get('/backup-storage', requirePermission('view_settings'), asyncHandler(getStorage));
router.patch('/backup-storage', requireRole('admin', 'super_admin'), requirePermission('manage_backup_storage'), asyncHandler(updateStorage));
router.post('/backups', requireRole('admin', 'super_admin'), requirePermission('manage_backup_storage'), asyncHandler(create));
router.get('/backups/:id/download', requireRole('admin', 'super_admin'), requirePermission('manage_backup_storage'), asyncHandler(download));
router.post('/backups/:id/restore', requireRole('admin', 'super_admin'), requirePermission('manage_backup_storage'), asyncHandler(validateExisting));
router.delete('/backups/:id', requireRole('admin', 'super_admin'), requirePermission('manage_backup_storage'), asyncHandler(remove));
router.post('/backups/restore', requireRole('admin', 'super_admin'), requirePermission('manage_backup_storage'), backupUpload.single('backup'), handleUploadErrors, asyncHandler(restore));
router.get('/business', requirePermission('view_settings'), asyncHandler(getBusiness));
router.patch('/business/:section', requireRole('admin'), requirePermission('edit_settings'), asyncHandler(updateBusinessSection));
router.get('/security', requireRole('admin'), requirePermission('edit_settings'), asyncHandler(getSecurity));
router.put('/security', requireRole('admin'), requirePermission('edit_settings'), asyncHandler(updateSecurity));
router.get('/security/events', requireRole('admin'), requirePermission('view_audit_logs'), asyncHandler(securityEvents));
router.post('/security/logout-all-users', requireRole('admin'), requirePermission('edit_settings'), asyncHandler(logoutAll));
router.post('/security/reset-sessions', requireRole('admin'), requirePermission('edit_settings'), asyncHandler(resetAllSessions));
router.post('/security/force-password-reset-staff', requireRole('admin'), requirePermission('edit_settings'), asyncHandler(forceStaffPasswordReset));
router.get('/system-info', requireRole('admin'), requirePermission('view_system_information'), asyncHandler(systemInfo));
router.get('/public-website', requirePermission('view_settings'), asyncHandler(adminSettings));
router.patch('/public-website', requireRole('admin'), requirePermission('manage_public_website_settings'), asyncHandler(updateSettings));
router.post('/public-website/reset', requireRole('admin'), requirePermission('manage_public_website_settings'), asyncHandler(resetSettings));
router.post(
  '/public-website/assets',
  requireRole('admin'),
  requirePermission('manage_public_website_settings'),
  websiteSettingsUpload.single('image'),
  handleUploadErrors,
  asyncHandler(uploadAsset)
);

export default router;
