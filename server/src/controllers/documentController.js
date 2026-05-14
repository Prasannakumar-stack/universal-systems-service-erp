import { createDocument, generateDocumentPdf, getDocument, listDocuments } from '../services/documentService.js';
import { required } from '../utils/http.js';

export async function create(req, res) {
  required(req.body, ['type', 'workOrderId']);
  const document = await createDocument(req.body, req.user);
  res.status(201).json({ document, message: 'Document created' });
}

export async function list(_req, res) {
  try {
    const { documents, pagination } = await listDocuments(_req.query);
    res.json({ success: true, data: documents, documents, pagination });
  } catch (error) {
    console.error('Document list failed', error);
    res.status(500).json({ success: false, message: 'Unable to load documents right now' });
  }
}

export async function getById(req, res) {
  const document = await getDocument(req.params.id);
  res.json({ document });
}

export async function downloadPdf(req, res) {
  const pdf = await generateDocumentPdf(req.params.id);
  res.download(pdf.filePath, pdf.filename);
}
