import {
  deleteInvoiceDesignVersion,
  generatePdfTemplatePreview,
  getPdfTemplate,
  getPdfTemplateManifest,
  listPdfTemplates,
  publishInvoiceDesign,
  renameInvoiceDesignVersion,
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
  res.json({ success: true, template, message: 'PDF design published successfully.' });
}

export async function reset(req, res) {
  const template = await resetPdfTemplate(req.params.key, req.user);
  res.json({ success: true, template, message: 'Default design restored.' });
}

export async function restore(req, res) {
  const template = await restorePdfTemplateVersion(req.params.key, req.params.versionId, req.user);
  res.json({ success: true, template, message: 'PDF template version restored' });
}

export async function restoreDesignDraft(req, res) {
  const template = await restoreInvoiceDesignVersionAsDraft(req.params.key, req.params.versionId, req.user);
  res.json({ success: true, template, message: 'Version restored as draft. Preview and publish to make it live.' });
}

export async function deleteVersion(req, res) {
  const template = await deleteInvoiceDesignVersion(req.params.key, req.params.versionId, req.user);
  res.json({ success: true, template, message: 'Saved version deleted' });
}

export async function renameVersion(req, res) {
  const template = await renameInvoiceDesignVersion(req.params.key, req.params.versionId, req.body, req.user);
  res.json({ success: true, template, message: 'Version renamed successfully.' });
}

export async function preview(req, res) {
  try {
    const pdf = await generatePdfTemplatePreview(req.params.key, {
      config: req.body?.config,
      previewIntent: req.body?.previewIntent,
      draftCanvasHtml: req.body?.draftCanvasHtml,
      draftMeta: req.body?.draftMeta
    });
    res.set('Cache-Control', 'no-store, max-age=0');
    res.set('Pragma', 'no-cache');
    res.download(pdf.filePath, pdf.filename, (error) => {
      if (!error) return;
      console.error('[PDF template preview] Failed to send preview PDF.', error?.stack || error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Unable to prepare the PDF preview right now. Please try again.'
        });
      }
    });
  } catch (error) {
    console.error('[PDF template preview] Preview generation failed.', error?.stack || error);
    const status = Number(error?.statusCode || error?.status || 500);
    res.status(status === 404 ? 404 : 500).json({
      success: false,
      message: status === 404 ? error.message : 'Unable to prepare the PDF preview right now. Please try again.'
    });
  }
}

export async function manifest(req, res) {
  const layoutManifest = await getPdfTemplateManifest(req.params.key, {
    config: req.body?.config
  });
  res.json({ success: true, manifest: layoutManifest });
}
