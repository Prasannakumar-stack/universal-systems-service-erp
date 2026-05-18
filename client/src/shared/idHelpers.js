function recordId(record) {
  if (typeof record === 'string') return record;
  return record?.id || record?._id || '';
}

function recordYear(dateValue) {
  const date = dateValue ? new Date(dateValue) : new Date();
  const year = date.getFullYear();
  return Number.isFinite(year) ? year : new Date().getFullYear();
}

function mongoSuffix(id, length = 6) {
  const raw = String(id || '').replace(/[^a-fA-F0-9]/g, '');
  return raw.slice(-length).toUpperCase() || '000000'.slice(0, length);
}

function paddedFromId(id, digits = 4) {
  const raw = String(id || '').replace(/[^a-fA-F0-9]/g, '');
  const mod = 10 ** digits;
  const num = parseInt(raw.slice(-8) || '0', 16) % mod;
  return String(num).padStart(digits, '0');
}

function isProfessionalId(value, prefix) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  const patterns = {
    CUS: /^CUS-\d{4}-\d{4}$/i,
    WO: /^WO-\d{4}-[A-Z0-9]{4,8}$/i,
    INV: /^INV-\d{4}-[A-Z0-9]{4,8}$/i,
    PAY: /^PAY-\d{4}-\d{4}$/i
  };
  return patterns[prefix]?.test(trimmed) || false;
}

function pickProfessionalId(record, fields, prefix) {
  for (const field of fields) {
    const value = typeof field === 'function' ? field(record) : record?.[field];
    if (!value || typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (prefix === 'INV' && /^INV-/i.test(trimmed)) return trimmed;
    if (isProfessionalId(trimmed, prefix)) return trimmed.toUpperCase();
  }
  return '';
}

export function getCustomerDisplayId(customer) {
  if (!customer) return '';
  const existing = pickProfessionalId(customer, ['customerCode', 'customerId', 'displayId', 'code'], 'CUS');
  if (existing) return existing;
  const id = recordId(customer);
  if (!id) return '';
  return `CUS-${recordYear(customer.createdAt)}-${paddedFromId(id, 4)}`;
}

export function getWorkOrderDisplayId(workOrder) {
  if (!workOrder) return '';
  const existing = pickProfessionalId(workOrder, [
    'workOrderNumber',
    'workOrderId',
    'displayId',
    (order) => (isProfessionalId(order?.bookingId?.bookingCode, 'WO') ? order.bookingId.bookingCode : '')
  ], 'WO');
  if (existing) return existing;
  const id = recordId(workOrder);
  if (!id) return '';
  return `WO-${recordYear(workOrder.createdAt)}-${mongoSuffix(id, 6)}`;
}

export function getInvoiceDisplayId(invoice) {
  if (!invoice) return '';
  if (invoice.invoiceNumber) return String(invoice.invoiceNumber).trim();
  const existing = pickProfessionalId(invoice, ['displayId'], 'INV');
  if (existing) return existing;
  const id = recordId(invoice);
  if (!id) return '';
  return `INV-${recordYear(invoice.createdAt)}-${mongoSuffix(id, 7)}`;
}

export function getPaymentDisplayId(payment) {
  if (!payment) return '';
  const existing = pickProfessionalId(payment, ['paymentNumber', 'paymentId', 'displayId', 'reference'], 'PAY');
  if (existing) return existing;
  const id = recordId(payment);
  if (!id) return '';
  return `PAY-${recordYear(payment.createdAt)}-${paddedFromId(id, 4)}`;
}

const COMPLETED_WORK_ORDER_STATUSES = ['Completed', 'Delivered', 'Returned'];

export function workOrderCompletedDateDisplay(order, formatDate) {
  if (!COMPLETED_WORK_ORDER_STATUSES.includes(order?.status)) return 'Not completed yet';
  if (!order?.completedAt || typeof formatDate !== 'function') return 'Not completed yet';
  return formatDate(order.completedAt);
}

export function workOrderSearchText(workOrder, customer) {
  const customerRecord = customer || workOrder?.customerId;
  return [
    getWorkOrderDisplayId(workOrder),
    getCustomerDisplayId(customerRecord),
    workOrder?.invoiceId ? getInvoiceDisplayId(workOrder.invoiceId) : '',
    customerRecord?.name,
    customerRecord?.phone,
    workOrder?.device,
    workOrder?.issue,
    workOrder?.serviceType,
    workOrder?.service,
    workOrder?.status,
    workOrder?.priority,
    workOrder?.technicianId?.name
  ].filter(Boolean).join(' ');
}

export function invoiceSearchText(invoice) {
  return [
    getInvoiceDisplayId(invoice),
    getWorkOrderDisplayId(invoice?.workOrderId),
    invoice?.amcContractId?.contractId,
    getCustomerDisplayId(invoice?.customerId),
    invoice?.customerId?.name,
    invoice?.customerId?.phone,
    invoice?.title,
    invoice?.notes,
    invoice?.workOrderId?.device,
    invoice?.amcContractId?.contractType,
    invoice?.amcContractId?.coveredService,
    invoice?.amcContractId?.coveredDevices,
    invoice?.status
  ].filter(Boolean).join(' ');
}

export function paymentSearchText(payment) {
  return [
    getPaymentDisplayId(payment),
    getInvoiceDisplayId(payment?.invoiceId),
    getWorkOrderDisplayId(payment?.invoiceId?.workOrderId),
    payment?.invoiceId?.amcContractId?.contractId,
    getCustomerDisplayId(payment?.customerId),
    payment?.customerId?.name,
    payment?.customerId?.phone,
    payment?.method,
    payment?.status,
    payment?.transactionId
  ].filter(Boolean).join(' ');
}

export function customerSearchText(customer, metrics = {}) {
  const jobs = metrics.jobs || [];
  const invoices = metrics.invoices || [];
  const payments = metrics.payments || [];
  return [
    getCustomerDisplayId(customer),
    customer?.name,
    customer?.phone,
    customer?.email,
    customer?.address,
    customer?.devices?.join(' '),
    ...jobs.map((order) => workOrderSearchText(order, customer)),
    ...invoices.map((invoice) => invoiceSearchText(invoice)),
    ...payments.map((payment) => paymentSearchText(payment))
  ].filter(Boolean).join(' ');
}

export function matchesDisplaySearch(query, haystack) {
  const term = String(query || '').trim().toLowerCase();
  if (!term) return true;
  return String(haystack || '').toLowerCase().includes(term);
}
