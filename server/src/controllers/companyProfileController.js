import {
  getCompanyProfile,
  removeCompanyLogo,
  updateCompanyLogo,
  updateCompanyProfile
} from '../services/companyProfileService.js';

export async function getProfile(_req, res) {
  const company = await getCompanyProfile();
  res.json({ success: true, company });
}

export async function updateProfile(req, res) {
  const company = await updateCompanyProfile(req.body, req.user);
  res.json({ success: true, company, message: 'Company profile saved' });
}

export async function uploadLogo(req, res) {
  const company = await updateCompanyLogo(req.file, req.user);
  res.json({ success: true, company, message: 'Company logo updated' });
}

export async function deleteLogo(req, res) {
  const company = await removeCompanyLogo(req.user);
  res.json({ success: true, company, message: 'Company logo removed' });
}
