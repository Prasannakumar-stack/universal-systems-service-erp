import fs from 'node:fs';
import { appError } from '../utils/http.js';
import { normalizeWhatsappPhone } from '../utils/whatsappPdfMessage.js';

export function isWhatsappPdfApiConfigured() {
  return Boolean(process.env.WHATSAPP_PDF_API_URL && process.env.WHATSAPP_PDF_API_TOKEN);
}

export async function sendPdfViaWhatsappApi({ phone, message, filePath, filename }) {
  const apiUrl = process.env.WHATSAPP_PDF_API_URL;
  const token = process.env.WHATSAPP_PDF_API_TOKEN;
  if (!apiUrl || !token) throw appError('WhatsApp PDF API is not configured', 503);

  const normalizedPhone = normalizeWhatsappPhone(phone);
  if (!normalizedPhone) throw appError('Customer phone number not available', 400);

  const fileBuffer = fs.readFileSync(filePath);
  const useJson = String(process.env.WHATSAPP_PDF_API_FORMAT || 'multipart').toLowerCase() === 'json';

  let response;
  if (useJson) {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: normalizedPhone,
        to: normalizedPhone,
        message,
        caption: message,
        filename,
        mimetype: 'application/pdf',
        document: fileBuffer.toString('base64')
      })
    });
  } else {
    const form = new FormData();
    form.append('phone', normalizedPhone);
    form.append('to', normalizedPhone);
    form.append('message', message);
    form.append('caption', message);
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });
    form.append('file', blob, filename);
    form.append('document', blob, filename);
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw appError(detail || `WhatsApp PDF API failed (${response.status})`, 502);
  }

  return response.json().catch(() => ({}));
}
