import {
  getBusinessSettings,
  getSystemInformation,
  updateBusinessSettingsSection
} from '../services/businessSettingsService.js';

export async function getBusiness(req, res) {
  const settings = await getBusinessSettings(req.user);
  res.json({ success: true, settings });
}

export async function updateBusinessSection(req, res) {
  const result = await updateBusinessSettingsSection(req.params.section, req.body, req.user);
  res.json({
    success: true,
    section: result.section,
    settings: result.settings,
    allSettings: result.allSettings,
    message: 'Business settings saved'
  });
}

export async function systemInfo(_req, res) {
  const info = await getSystemInformation();
  res.json({ success: true, info });
}
