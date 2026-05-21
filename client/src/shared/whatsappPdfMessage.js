function clean(value) {
  return String(value ?? '').trim();
}

export function resolveServiceLabel(source = {}) {
  const value =
    source.serviceType ||
    source.service ||
    source.bookingId?.serviceType ||
    source.booking?.serviceType ||
    source.invoiceId?.serviceType ||
    source.invoice?.serviceType;
  return clean(value) || 'Service';
}

export function resolveDeviceLabel(source = {}) {
  const value =
    source.device ||
    source.bookingId?.device ||
    source.booking?.device ||
    source.invoiceId?.device ||
    source.invoice?.device;
  return clean(value) || 'Device';
}

export function formatWhatsappCurrency(amount) {
  return `₹${Number(amount || 0).toFixed(2)}`;
}

export function workOrderPdfTotal(order) {
  if (order?.invoiceId?.total != null) return Number(order.invoiceId.total);
  if (order?.amcContractId?.invoiceId?.total != null) return Number(order.amcContractId.invoiceId.total);
  if (order?.amcContractId?.contractValue != null) return Number(order.amcContractId.contractValue);
  const partsTotal = (order?.partsUsed || []).reduce((sum, part) => sum + Number(part.total || 0), 0);
  return partsTotal + Number(order?.serviceCharge || 0);
}

export function buildWhatsappPdfMessage(pdfType, context = {}) {
  const customerName = clean(context.customerName) || 'Customer';
  const service = resolveServiceLabel(context);
  const device = resolveDeviceLabel(context);
  const total = formatWhatsappCurrency(context.total ?? 0);
  const pdfUrl = clean(context.pdfUrl);

  const lines = [`Hello ${customerName},`, ''];

  if (pdfType === 'quotation') {
    lines.push(
      'Your Quotation PDF from Universal Systems is ready.',
      '',
      `Service: ${service}`,
      `Device: ${device}`,
      `Total: ${total}`,
      '',
      pdfUrl
        ? 'Please review the quotation at the link below and reply with:'
        : 'Please review the attached quotation and reply with:',
      'APPROVE',
      'DENY'
    );
    if (pdfUrl) lines.push('', pdfUrl);
  } else if (pdfType === 'work') {
    lines.push(
      'Your Invoice PDF from Universal Systems is ready.',
      '',
      `Service: ${service}`,
      `Device: ${device}`,
      `Total: ${total}`,
      '',
      pdfUrl ? 'Please find the invoice PDF at the link below.' : 'Please find the invoice PDF attached.'
    );
    if (pdfUrl) lines.push('', pdfUrl);
  } else if (pdfType === 'amc-contract') {
    lines.push(
      'Your AMC Contract PDF from Universal Systems is ready.',
      '',
      `Service: ${service}`,
      `Device: ${device}`,
      `Contract Value: ${total}`,
      '',
      pdfUrl ? 'Please find the AMC contract PDF at the link below.' : 'Please find the AMC contract PDF attached.'
    );
    if (pdfUrl) lines.push('', pdfUrl);
  } else if (pdfType === 'amc-service-visit') {
    lines.push(
      'Your AMC Service Visit PDF from Universal Systems is ready.',
      '',
      `Service: ${service}`,
      `Device: ${device}`,
      '',
      pdfUrl ? 'Please find the service visit PDF at the link below.' : 'Please find the service visit PDF attached.'
    );
    if (pdfUrl) lines.push('', pdfUrl);
  } else if (pdfType === 'amc-invoice') {
    lines.push(
      'Your AMC Invoice / Receipt PDF from Universal Systems is ready.',
      '',
      `Service: ${service}`,
      `Device: ${device}`,
      `Total: ${total}`,
      '',
      pdfUrl ? 'Please find the AMC invoice PDF at the link below.' : 'Please find the AMC invoice PDF attached.'
    );
    if (pdfUrl) lines.push('', pdfUrl);
  } else {
    lines.push(
      'Your Service Completed PDF from Universal Systems is ready.',
      '',
      `Service: ${service}`,
      `Device: ${device}`,
      `Total: ${total}`,
      '',
      pdfUrl
        ? 'Your service has been completed. Please find the completed service PDF at the link below.'
        : 'Your service has been completed. Please find the completed service PDF attached.'
    );
    if (pdfUrl) lines.push('', pdfUrl);
  }

  if (context.manualAttachNote) {
    lines.push('', 'Note: Please attach the downloaded PDF manually before sending.');
  }

  lines.push('', 'Thank you,', 'Universal Systems');
  return lines.join('\n');
}

export function normalizeWhatsappPhone(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  if (digits.length === 10) return `91${digits}`;
  return digits.startsWith('91') ? digits : digits;
}

export function buildWhatsappWebUrl(phone, message) {
  const whatsappPhone = normalizeWhatsappPhone(phone);
  if (!whatsappPhone) return '';
  return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
}

export function documentTypeToPdfType(documentType) {
  if (documentType === 'amc-contract') return 'amc-contract';
  if (documentType === 'amc-service-visit') return 'amc-service-visit';
  if (documentType === 'amc-invoice') return 'amc-invoice';
  if (documentType === 'invoice') return 'work';
  if (documentType === 'service') return 'service-completed';
  return 'quotation';
}

export function isPdfSentViaWhatsapp(order, pdfType) {
  return (order?.documentsSent || []).some(
    (item) => item.type === pdfType && /whatsapp/i.test(String(item.sentVia || ''))
  );
}
