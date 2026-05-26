import {
  assertPublicBookingOpen,
  assertPublicWebsiteOpen,
  getPublicWebsiteSettings,
  resetPublicWebsiteSettings,
  updatePublicWebsiteSettings
} from '../services/publicWebsiteSettingsService.js';

export async function publicSettings(_req, res) {
  const settings = await getPublicWebsiteSettings();
  res.json({ success: true, settings });
}

export async function adminSettings(_req, res) {
  const settings = await getPublicWebsiteSettings();
  res.json({ success: true, settings });
}

export async function updateSettings(req, res) {
  const settings = await updatePublicWebsiteSettings(req.body, req.user);
  res.json({ success: true, settings, message: 'Public website settings saved' });
}

export async function resetSettings(req, res) {
  const settings = await resetPublicWebsiteSettings(req.user);
  res.json({ success: true, settings, message: 'Public website settings reset to default' });
}

export async function uploadAsset(req, res) {
  if (!req.file) return res.status(400).json({ message: 'Image file is required' });
  res.json({
    success: true,
    asset: {
      filename: req.file.filename,
      originalName: req.file.originalname || '',
      url: `/uploads/${req.file.filename}`,
      mimetype: req.file.mimetype || '',
      size: req.file.size || 0
    }
  });
}

export async function publicWebsiteOpenGate(req, _res, next) {
  const settings = await assertPublicWebsiteOpen();
  req.publicWebsiteSettings = settings;
  next();
}

export async function publicBookingOpenGate(req, _res, next) {
  const settings = await assertPublicBookingOpen();
  req.publicWebsiteSettings = settings;
  req.body = {
    ...req.body,
    status: settings.booking.defaultBookingStatus || 'Pending'
  };
  next();
}
