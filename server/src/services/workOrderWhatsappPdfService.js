import path from 'node:path';
import { WHATSAPP_PDF_PUBLIC_BASE_URL } from '../config.js';
import { appError } from '../utils/http.js';
import {
  buildWhatsappPdfMessage,
  buildWhatsappWebUrl,
  workOrderPdfTotal
} from '../utils/whatsappPdfMessage.js';
import { generateWorkOrderPdf } from './workOrderPdfService.js';
import { getWorkOrder, markDocumentSent } from './workOrderService.js';
import { isWhatsappPdfApiConfigured, sendPdfViaWhatsappApi } from './whatsappPdfService.js';

export async function sendWorkOrderPdfViaWhatsapp({ workOrderId, type, user }) {
  const pdf = await generateWorkOrderPdf({ workOrderId, type, user });
  const workOrder = pdf.workOrder;
  const customer = workOrder.customerId || {};
  const phone = customer.phone || '';
  if (!phone) throw appError('Customer phone number not available', 400);

  const pdfUrl = WHATSAPP_PDF_PUBLIC_BASE_URL
    ? `${WHATSAPP_PDF_PUBLIC_BASE_URL.replace(/\/$/, '')}/${path.basename(pdf.filePath)}`
    : '';

  const total = workOrderPdfTotal(workOrder);
  const apiConfigured = isWhatsappPdfApiConfigured();

  if (apiConfigured) {
    const message = buildWhatsappPdfMessage(type, {
      customerName: customer.name,
      serviceType: workOrder.serviceType,
      service: workOrder.service,
      device: workOrder.device,
      bookingId: workOrder.bookingId,
      invoiceId: workOrder.invoiceId,
      total,
      pdfUrl
    });

    await sendPdfViaWhatsappApi({
      phone,
      message,
      filePath: pdf.filePath,
      filename: pdf.filename
    });

    const updated = await markDocumentSent(workOrderId, type, { sentVia: 'WhatsApp' }, user);
    return {
      sentViaApi: true,
      apiConfigured: true,
      message,
      whatsappUrl: buildWhatsappWebUrl(phone, message),
      pdfUrl,
      workOrder: updated
    };
  }

  const message = buildWhatsappPdfMessage(type, {
    customerName: customer.name,
    serviceType: workOrder.serviceType,
    service: workOrder.service,
    device: workOrder.device,
    bookingId: workOrder.bookingId,
    invoiceId: workOrder.invoiceId,
    total,
    pdfUrl,
    manualAttachNote: true
  });

  return {
    sentViaApi: false,
    apiConfigured: false,
    fallback: true,
    message,
    whatsappUrl: buildWhatsappWebUrl(phone, message),
    pdfUrl,
    pdfFilename: pdf.filename,
    fallbackNote:
      'WhatsApp PDF sending API is not configured. PDF was opened/downloaded. Please attach it manually.',
    workOrder: await getWorkOrder(workOrderId, user)
  };
}
