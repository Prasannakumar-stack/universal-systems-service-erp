import { randomUUID } from 'node:crypto';
import AMCContract from '../models/AMCContract.js';
import Invoice from '../models/Invoice.js';
import WorkOrder from '../models/WorkOrder.js';
import { appError, clean, numberValue } from '../utils/http.js';
import { calculateAmcCoverageBreakdown, amcCoverageSummary } from './amcCoverageEngine.js';
import { logAudit } from './auditService.js';
import { applyStockMovement } from './stockMovementService.js';

function invoiceNumber() {
  return `INV-${new Date().getFullYear()}-${randomUUID().slice(0, 7).toUpperCase()}`;
}

function invoiceStatus(total, paidAmount) {
  if (paidAmount >= total && total > 0) return 'Paid';
  if (paidAmount > 0) return 'Partial';
  return 'Pending';
}

function normalizeInvoiceId(value) {
  if (!value) return null;
  if (typeof value === 'object') return value._id || value.id || null;
  return value;
}

function workOrderAmcContractId(workOrder) {
  return workOrder.amcContractId?._id || workOrder.amcContractId || null;
}

function invoiceIsUnpaid(invoice) {
  return invoice && invoice.status === 'Pending' && numberValue(invoice.paidAmount, 0) <= 0;
}

function invoiceHasPayment(invoice) {
  return Boolean(invoice && (['Paid', 'Partial'].includes(invoice.status) || numberValue(invoice.paidAmount, 0) > 0));
}

function appendInvoiceNote(notes, line) {
  return [clean(notes), line].filter(Boolean).join('\n');
}

function assertInvoiceBelongsToWorkOrder(invoice, workOrder) {
  if (!invoice?.workOrderId || String(invoice.workOrderId) !== String(workOrder._id)) {
    throw appError('Extra invoice does not belong to this work order', 400);
  }
}

function buildWorkOrderInvoiceItems(workOrder, labour, payloadItems = []) {
  const items = [];
  const isAmcWorkOrder = Boolean(workOrder.amcContractId);
  const breakdown = isAmcWorkOrder ? calculateAmcCoverageBreakdown(workOrder, { serviceCharge: labour }) : null;

  if (isAmcWorkOrder) {
    if (breakdown.chargeableServiceTotal > 0) {
      items.push({ description: 'Service charge', quantity: 1, rate: breakdown.chargeableServiceTotal, amount: breakdown.chargeableServiceTotal });
    }
    breakdown.chargeableParts.forEach((part) => {
      items.push({ description: part.name, quantity: part.quantity, rate: part.unitPrice, amount: part.total });
    });
  } else {
    if (labour > 0) items.push({ description: 'Labour charge', quantity: 1, rate: labour, amount: labour });
    workOrder.partsUsed.forEach((part) => {
      items.push({ description: part.name, quantity: part.quantity, rate: part.unitPrice, amount: part.total });
    });
  }

  payloadItems.forEach((item) => {
    const quantity = Math.max(1, numberValue(item.quantity, 1));
    const rate = numberValue(item.rate, 0);
    items.push({ description: clean(item.description), quantity, rate, amount: quantity * rate });
  });

  return { items, isAmcWorkOrder, breakdown };
}

async function applyWorkOrderInvoiceStock(workOrder, invoice, user) {
  let stockFlagsUpdated = false;
  for (const part of workOrder.partsUsed) {
    if (!part.inventoryPartId) continue;
    if (part.stockDeducted === true) continue;
    await applyStockMovement({
      partId: part.inventoryPartId,
      type: 'USED',
      quantity: part.quantity,
      source: invoice.invoiceNumber,
      sourceId: workOrder._id,
      note: `Billed for ${workOrder.device}`,
      userId: user?._id || user?.id || null
    });
    part.stockDeducted = true;
    part.stockDeductedAt = new Date();
    stockFlagsUpdated = true;
  }
  if (stockFlagsUpdated) await workOrder.save();
}

async function auditInvoiceGenerated(invoice, workOrder, user, action = 'invoice_generated') {
  try {
    await logAudit({
      userId: user?._id || user?.id || null,
      action,
      module: 'invoice',
      recordId: invoice._id,
      after: {
        entityType: 'Invoice',
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        workOrderId: workOrder._id,
        bookingId: workOrder.bookingId || null,
        customerId: workOrder.customerId,
        amount: invoice.total,
        amcContractId: workOrderAmcContractId(workOrder),
        adjustmentForInvoiceId: invoice.adjustmentForInvoiceId || null,
        timestamp: invoice.createdAt
      }
    });
  } catch (error) {
    console.warn('Audit log failed for invoice generation:', error.message);
  }
}

async function createWorkOrderInvoiceDocument({
  workOrder,
  user,
  items,
  total,
  isAmcWorkOrder,
  title = '',
  notes = '',
  adjustmentForInvoiceId = null,
  timelineMessage,
  applyStock = true,
  auditAction = 'invoice_generated'
}) {
  const invoice = await Invoice.create({
    invoiceNumber: invoiceNumber(),
    workOrderId: workOrder._id,
    amcContractId: isAmcWorkOrder ? workOrderAmcContractId(workOrder) : null,
    customerId: workOrder.customerId,
    title,
    notes,
    items,
    total,
    paidAmount: 0,
    balance: total,
    status: 'Pending',
    adjustmentForInvoiceId
  });

  workOrder.invoiceId = invoice._id;
  workOrder.timeline.push({
    status: workOrder.status,
    message: typeof timelineMessage === 'function' ? timelineMessage(invoice) : (timelineMessage || `Invoice ${invoice.invoiceNumber} generated`)
  });
  await workOrder.save();

  if (applyStock) await applyWorkOrderInvoiceStock(workOrder, invoice, user);
  await auditInvoiceGenerated(invoice, workOrder, user, auditAction);
  return invoice;
}

async function resolveWorkOrderInvoice(payload, workOrder) {
  const requestedId = normalizeInvoiceId(payload.invoiceId || payload.extraInvoiceId);
  if (requestedId) {
    const invoice = await Invoice.findById(requestedId);
    if (invoice) return invoice;
  }
  if (!workOrder.invoiceId) return null;
  return Invoice.findById(workOrder.invoiceId);
}

async function resolveBaseInvoiceForAdjustment(payload, workOrder) {
  const invoice = await resolveWorkOrderInvoice(payload, workOrder);
  if (invoice?.adjustmentForInvoiceId) {
    const parent = await Invoice.findById(invoice.adjustmentForInvoiceId);
    if (parent) return parent;
  }
  return invoice;
}

async function voidAndRegenerateExtraInvoice(payload, workOrder, user, labour) {
  if (!workOrder.amcContractId) throw appError('Extra invoice refresh is available only for AMC-linked work orders', 400);
  const existing = await resolveWorkOrderInvoice(payload, workOrder);
  if (!existing) throw appError('Existing extra invoice not found', 404);
  assertInvoiceBelongsToWorkOrder(existing, workOrder);
  if (existing.status === 'Void') throw appError('Extra invoice is already void', 400);
  if (!invoiceIsUnpaid(existing)) throw appError('Only unpaid extra invoices can be voided and regenerated', 400);
  const activeInvoices = await Invoice.find({
    workOrderId: workOrder._id,
    amcContractId: workOrderAmcContractId(workOrder),
    status: { $ne: 'Void' }
  });
  if (activeInvoices.some((invoice) => !invoiceIsUnpaid(invoice))) {
    throw appError('Only fully unpaid extra invoices can be voided and regenerated', 400);
  }

  const { items, isAmcWorkOrder, breakdown } = buildWorkOrderInvoiceItems(workOrder, labour);
  if (!items.length || numberValue(breakdown?.extraPayable, 0) <= 0) {
    throw appError('No extra payable amount is available for regeneration', 400);
  }

  for (const invoice of activeInvoices.length ? activeInvoices : [existing]) {
    invoice.status = 'Void';
    invoice.balance = 0;
    invoice.notes = appendInvoiceNote(invoice.notes, `Voided and regenerated from current AMC billing calculation on ${new Date().toISOString()}.`);
    await invoice.save();
  }

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  return createWorkOrderInvoiceDocument({
    workOrder,
    user,
    items,
    total,
    isAmcWorkOrder,
    title: `AMC Extra Charges - ${workOrder.device || workOrder.serviceType || 'AMC Visit'}`,
    notes: `Regenerated extra chargeable repairs for AMC contract ${workOrder.amcContractId?.contractId || ''}. Coverage Type: ${amcCoverageSummary(workOrder.amcContractId).coverageType}. Previous invoice ${existing.invoiceNumber} was voided.`,
    timelineMessage: (invoice) => `Extra invoice ${existing.invoiceNumber} voided and regenerated as ${invoice.invoiceNumber}`,
    applyStock: false,
    auditAction: 'extra_invoice_regenerated'
  });
}

async function voidExtraInvoiceAndUnlockParts(payload, workOrder, user) {
  if (!workOrder.amcContractId) throw appError('Extra invoice unlock is available only for AMC-linked work orders', 400);
  const existing = await resolveWorkOrderInvoice(payload, workOrder);
  if (!existing) throw appError('Existing extra invoice not found', 404);
  assertInvoiceBelongsToWorkOrder(existing, workOrder);
  if (existing.status === 'Void') throw appError('Extra invoice is already void', 400);

  const activeInvoices = await Invoice.find({
    workOrderId: workOrder._id,
    amcContractId: workOrderAmcContractId(workOrder),
    status: { $ne: 'Void' }
  });
  const invoicesToVoid = activeInvoices.length ? activeInvoices : [existing];
  if (invoicesToVoid.some((invoice) => !invoiceIsUnpaid(invoice))) {
    throw appError('Payment already exists. Create an adjustment invoice instead.', 400);
  }

  for (const invoice of invoicesToVoid) {
    invoice.status = 'Void';
    invoice.balance = 0;
    invoice.notes = appendInvoiceNote(invoice.notes, `Voided to unlock AMC parts editing on ${new Date().toISOString()}.`);
    await invoice.save();
  }

  workOrder.invoiceId = null;
  workOrder.timeline.push({
    status: workOrder.status,
    message: `Unpaid extra invoice ${existing.invoiceNumber} voided. Parts Used unlocked for editing.`,
    userId: user?._id || user?.id || null
  });
  await workOrder.save();

  try {
    await logAudit({
      userId: user?._id || user?.id || null,
      action: 'extra_invoice_voided_unlock_parts',
      module: 'invoice',
      recordId: existing._id,
      after: {
        invoiceId: existing._id,
        invoiceNumber: existing.invoiceNumber,
        workOrderId: workOrder._id,
        amcContractId: workOrderAmcContractId(workOrder),
        voidedInvoiceCount: invoicesToVoid.length
      }
    });
  } catch (error) {
    console.warn('Audit log failed for invoice void unlock:', error.message);
  }

  return existing;
}

async function createAdjustmentExtraInvoice(payload, workOrder, user, labour) {
  if (!workOrder.amcContractId) throw appError('Adjustment invoice is available only for AMC-linked work orders', 400);
  const baseInvoice = await resolveBaseInvoiceForAdjustment(payload, workOrder);
  if (!baseInvoice) throw appError('Existing extra invoice not found', 404);
  assertInvoiceBelongsToWorkOrder(baseInvoice, workOrder);
  if (baseInvoice.status === 'Void') throw appError('Cannot adjust a void invoice', 400);
  if (!invoiceHasPayment(baseInvoice)) throw appError('Use void and regenerate for unpaid extra invoices', 400);

  const { breakdown, isAmcWorkOrder } = buildWorkOrderInvoiceItems(workOrder, labour);
  const currentExtraPayable = numberValue(breakdown?.extraPayable, 0);
  if (currentExtraPayable <= 0) throw appError('No extra payable amount is available for adjustment', 400);

  const contractId = workOrderAmcContractId(workOrder);
  const activeExtraInvoices = await Invoice.find({
    workOrderId: workOrder._id,
    amcContractId: contractId,
    status: { $ne: 'Void' }
  });
  const alreadyInvoiced = activeExtraInvoices.reduce((sum, invoice) => sum + numberValue(invoice.total, 0), 0);
  const difference = Math.round((currentExtraPayable - alreadyInvoiced) * 100) / 100;

  if (difference <= 0.5) {
    const existingAdjustment = activeExtraInvoices.find((invoice) => String(invoice.adjustmentForInvoiceId || '') === String(baseInvoice._id));
    if (existingAdjustment) return existingAdjustment;
    throw appError('No positive adjustment amount is available for this extra invoice', 400);
  }

  const existingSameAdjustment = activeExtraInvoices.find((invoice) => {
    return String(invoice.adjustmentForInvoiceId || '') === String(baseInvoice._id) &&
      Math.abs(numberValue(invoice.total, 0) - difference) <= 0.5;
  });
  if (existingSameAdjustment) return existingSameAdjustment;

  const items = [{
    description: `AMC billing adjustment for ${baseInvoice.invoiceNumber}`,
    quantity: 1,
    rate: difference,
    amount: difference
  }];

  return createWorkOrderInvoiceDocument({
    workOrder,
    user,
    items,
    total: difference,
    isAmcWorkOrder,
    title: `AMC Extra Charges Adjustment - ${workOrder.device || workOrder.serviceType || 'AMC Visit'}`,
    notes: `Adjustment Invoice for AMC extra charges. Existing active extra invoices total ${alreadyInvoiced}. Current AMC billing total ${currentExtraPayable}. Difference ${difference}.`,
    adjustmentForInvoiceId: baseInvoice._id,
    timelineMessage: (invoice) => `Adjustment invoice ${invoice.invoiceNumber} generated for extra AMC billing difference`,
    applyStock: false,
    auditAction: 'extra_invoice_adjustment_generated'
  });
}

export async function createInvoice(payload, user = null) {
  if (payload.amcContractId && !payload.workOrderId) {
    return createAmcInvoice(payload, user);
  }

  const workOrder = await WorkOrder.findById(payload.workOrderId).populate('amcContractId');
  if (!workOrder) throw appError('Work order not found', 404);
  const amcExtraAction = clean(payload.amcExtraAction || payload.extraInvoiceAction);
  const labour = numberValue(payload.labourCharge ?? workOrder.serviceCharge, 0);

  if (amcExtraAction === 'void-regenerate') {
    return voidAndRegenerateExtraInvoice(payload, workOrder, user, labour);
  }
  if (amcExtraAction === 'void-unlock') {
    return voidExtraInvoiceAndUnlockParts(payload, workOrder, user);
  }
  if (amcExtraAction === 'adjustment') {
    return createAdjustmentExtraInvoice(payload, workOrder, user, labour);
  }

  if (workOrder.invoiceId) {
    const existing = await Invoice.findById(workOrder.invoiceId);
    if (existing && existing.status !== 'Void') return existing;
  }

  const { items, isAmcWorkOrder } = buildWorkOrderInvoiceItems(workOrder, labour, payload.items || []);
  if (!items.length) throw appError('Invoice needs at least one charge or part');

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  return createWorkOrderInvoiceDocument({
    workOrder,
    user,
    items,
    total,
    isAmcWorkOrder,
    title: isAmcWorkOrder ? `AMC Extra Charges - ${workOrder.device || workOrder.serviceType || 'AMC Visit'}` : '',
    notes: isAmcWorkOrder ? `Extra chargeable repairs for AMC contract ${workOrder.amcContractId?.contractId || ''}. Coverage Type: ${amcCoverageSummary(workOrder.amcContractId).coverageType}` : '',
  });
}

async function createAmcInvoice(payload, user = null) {
  const contract = await AMCContract.findById(payload.amcContractId);
  if (!contract) throw appError('AMC contract not found', 404);

  if (contract.invoiceId) {
    const existingByContract = await Invoice.findById(contract.invoiceId);
    if (existingByContract) return existingByContract;
  }

  const existingInvoice = await Invoice.findOne({ amcContractId: contract._id, workOrderId: null });
  if (existingInvoice) {
    if (!contract.invoiceId) {
      contract.invoiceId = existingInvoice._id;
      await contract.save();
    }
    return existingInvoice;
  }

  const contractValue = numberValue(payload.contractValue ?? contract.contractValue, 0);
  if (contractValue <= 0) throw appError('AMC contract value must be greater than zero');

  const coverage = amcCoverageSummary(contract);
  const title = `AMC Contract - ${contract.contractType}`;
  const coverageText = clean(payload.coverage || contract.coveredService || contract.coveredDevices || contract.contractType);
  const notes = clean(payload.notes) || `AMC Coverage Type: ${coverage.coverageType}\nCoverage Rules:\n${coverage.coverageRules.join('\n')}\nCoverage:\n${coverageText || contract.contractType}`;
  const invoice = await Invoice.create({
    invoiceNumber: invoiceNumber(),
    amcContractId: contract._id,
    customerId: contract.customerId,
    title,
    notes,
    items: [{ description: title, quantity: 1, rate: contractValue, amount: contractValue }],
    total: contractValue,
    paidAmount: 0,
    balance: contractValue,
    status: 'Pending'
  });

  contract.invoiceId = invoice._id;
  await contract.save();

  try {
    await logAudit({
      userId: user?._id || user?.id || null,
      action: 'invoice_generated',
      module: 'invoice',
      recordId: invoice._id,
      after: {
        entityType: 'Invoice',
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        amcContractId: contract._id,
        contractId: contract.contractId,
        customerId: contract.customerId,
        amount: invoice.total,
        timestamp: invoice.createdAt
      }
    });
  } catch (error) {
    console.warn('Audit log failed for AMC invoice generation:', error.message);
  }

  return invoice;
}

export async function applyPaymentToInvoice(invoiceId, paidAmount) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw appError('Invoice not found', 404);
  if (invoice.status === 'Void') throw appError('Cannot record payment against a void invoice', 400);
  invoice.paidAmount = Math.min(invoice.total, invoice.paidAmount + paidAmount);
  invoice.balance = Math.max(0, invoice.total - invoice.paidAmount);
  invoice.status = invoiceStatus(invoice.total, invoice.paidAmount);
  await invoice.save();
  return invoice;
}
