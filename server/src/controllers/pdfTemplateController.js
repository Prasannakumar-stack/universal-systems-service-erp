import {
  generatePdfTemplatePreview,
  getPdfTemplate,
  getPdfTemplateManifest,
  listPdfTemplates,
  publishInvoiceDesign,
  resetPdfTemplate,
  restoreInvoiceDesignVersionAsDraft,
  restorePdfTemplateVersion,
  saveInvoiceDesignDraft,
  updatePdfTemplate
} from '../services/pdfTemplateService.js';

export async function list(req, res) {
  const templates = await listPdfTemplates();
  res.json({ success: true, templates });
}

export async function getByKey(req, res) {
  const template = await getPdfTemplate(req.params.key);
  res.json({ success: true, template });
}

export async function update(req, res) {
  const template = await updatePdfTemplate(req.params.key, req.body, req.user);
  res.json({ success: true, template, message: 'PDF template saved' });
}

export async function saveDesignDraft(req, res) {
  const template = await saveInvoiceDesignDraft(req.params.key, req.body, req.user);
  res.json({ success: true, template, message: 'PDF design draft saved' });
}

export async function publishDesign(req, res) {
  const template = await publishInvoiceDesign(req.params.key, req.body, req.user);
  res.json({ success: true, template, message: 'Invoice design published successfully.' });
}

export async function reset(req, res) {
  const template = await resetPdfTemplate(req.params.key, req.user);
  res.json({ success: true, template, message: 'PDF template reset to default' });
}

export async function restore(req, res) {
  const template = await restorePdfTemplateVersion(req.params.key, req.params.versionId, req.user);
  res.json({ success: true, template, message: 'PDF template version restored' });
}

export async function restoreDesignDraft(req, res) {
  const template = await restoreInvoiceDesignVersionAsDraft(req.params.key, req.params.versionId, req.user);
  res.json({ success: true, template, message: 'Version restored as draft. Preview and publish to make it live.' });
}

export async function preview(req, res) {
  const pdf = await generatePdfTemplatePreview(req.params.key, {
    config: req.body?.config,
    previewIntent: req.body?.previewIntent,
    draftCanvasHtml: req.body?.draftCanvasHtml,
    draftMeta: req.body?.draftMeta
  });
  res.download(pdf.filePath, pdf.filename);
}

export async function manifest(req, res) {
  const layoutManifest = await getPdfTemplateManifest(req.params.key, {
    config: req.body?.config
  });
  res.json({ success: true, manifest: layoutManifest });
}
