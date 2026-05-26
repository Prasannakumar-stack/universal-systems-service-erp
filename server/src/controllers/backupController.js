import {
  createBackup,
  deleteBackupRecord,
  getBackupRecordForDownload,
  getBackupStorageSettings,
  restoreValidatedBackup,
  updateBackupStorageSettings,
  validateExistingBackupForRestore,
  validateRestoreUpload
} from '../services/backupService.js';

export async function getStorage(req, res) {
  const payload = await getBackupStorageSettings(req.user);
  res.json({ success: true, ...payload });
}

export async function updateStorage(req, res) {
  const settings = await updateBackupStorageSettings(req.body, req.user);
  res.json({ success: true, settings, message: 'Backup settings saved' });
}

export async function create(req, res) {
  const backup = await createBackup({ user: req.user, kind: 'manual' });
  res.json({ success: true, backup, message: 'Backup created' });
}

export async function download(req, res) {
  const backup = await getBackupRecordForDownload(req.params.id, req.user);
  res.download(backup.filePath, backup.filename || 'universal-systems-backup.zip');
}

export async function remove(req, res) {
  const backup = await deleteBackupRecord(req.params.id, req.user);
  res.json({ success: true, backup, message: 'Backup deleted' });
}

export async function validateExisting(req, res) {
  const result = await validateExistingBackupForRestore(req.params.id, req.user);
  res.json({ success: true, ...result, message: 'Backup validated. Confirm restore to continue.' });
}

export async function restore(req, res) {
  if (req.file) {
    const result = await validateRestoreUpload(req.file, req.user);
    res.json({ success: true, ...result, message: 'Backup validated. Confirm restore to continue.' });
    return;
  }
  const result = await restoreValidatedBackup({
    restoreToken: req.body.restoreToken,
    confirmed: req.body.confirmRestore === true || req.body.confirmed === true,
    user: req.user
  });
  res.json({ success: true, ...result, message: 'Backup restored' });
}
