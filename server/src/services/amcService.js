import { randomUUID } from 'node:crypto';
import AuditLog from '../models/AuditLog.js';
import AMCContract from '../models/AMCContract.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import WorkOrder from '../models/WorkOrder.js';
import { assertPermission } from '../permissions.js';
import { clean, appError, numberValue } from '../utils/http.js';
import { validObjectId } from '../utils/pagination.js';
import { upsertCustomer } from './customerService.js';
import { createWorkOrder } from './workOrderService.js';
import { logAudit } from './auditService.js';
import { amcCoverageSummary, normalizeAmcCoverageType } from './amcCoverageEngine.js';
import { getTechnicianScope } from './technicianScopeService.js';

const contractTypes = ['Basic AMC', 'Comprehensive AMC', 'CCTV AMC', 'Printer AMC', 'Networking AMC', 'Solar / UPS AMC', 'Custom'];
const serviceFrequencies = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'];
const oneDay = 24 * 60 * 60 * 1000;
const activeContractFilter = (extra = {}) => ({ isDeleted: { $ne: true }, archivedAt: null, ...extra });

const coveredServiceByType = {
  'Basic AMC': 'Computer Service AMC',
  'Comprehensive AMC': 'Comprehensive Service AMC',
  'CCTV AMC': 'CCTV Service',
  'Printer AMC': 'Printer Service',
  'Networking AMC': 'Networking / AMC',
  'Solar / UPS AMC': 'Solar / UPS / Inverter Service',
  Custom: 'Custom AMC Service'
};

const frequencyMonths = {
  Monthly: 1,
  Quarterly: 3,
  'Half-Yearly': 6,
  Yearly: 12
};

function contractCode() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `AMC-${date}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

function normalizeDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function optionalDay(value) {
  const raw = clean(value);
  if (!raw) return null;
  const date = normalizeDay(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function booleanValue(value) {
  if (value === true) return true;
  const raw = clean(value).toLowerCase();
  return raw === 'true' || raw === 'yes' || raw === '1';
}

function addMonths(value, months) {
  const next = new Date(value);
  next.setMonth(next.getMonth() + months);
  return next;
}

function generateVisits({ startDate, endDate, serviceFrequency, includedVisits, coveredService }) {
  const visits = [];
  const months = frequencyMonths[serviceFrequency] || 12;
  const limit = Math.max(0, numberValue(includedVisits, 0));
  let scheduledDate = normalizeDay(startDate);
  const end = normalizeDay(endDate);

  while (scheduledDate <= end && (!limit || visits.length < limit)) {
    visits.push({
      serviceType: coveredService,
      scheduledDate: new Date(scheduledDate),
      status: 'Upcoming'
    });
    scheduledDate = addMonths(scheduledDate, months);
  }

  if (!visits.length) {
    visits.push({ serviceType: coveredService, scheduledDate: normalizeDay(startDate), status: 'Upcoming' });
  }

  return visits;
}

function renewalStatus(contract) {
  const today = normalizeDay(new Date());
  const end = normalizeDay(contract.endDate);
  const daysLeft = Math.ceil((end.getTime() - today.getTime()) / oneDay);
  if (daysLeft < 0) return 'Expired';
  if (daysLeft <= 30) return 'Renewal Due';
  return 'Active';
}

function contractStatus(contract) {
  if (contract.status === 'Cancelled') return 'Cancelled';
  return renewalStatus(contract) === 'Expired' ? 'Expired' : 'Active';
}

function visitStatus(visit) {
  if (visit.status === 'Completed') return 'Completed';
  const today = normalizeDay(new Date());
  const scheduled = normalizeDay(visit.scheduledDate);
  if (scheduled.getTime() === today.getTime()) return 'Due Today';
  if (scheduled < today) return 'Overdue';
  return 'Upcoming';
}

function serializeContract(contract) {
  const item = contract.toJSON();
  const coverage = amcCoverageSummary(item);
  const warrantyIncluded = Boolean(item.warrantyIncluded);
  const linked = item.linkedBusinessHistory || contract.linkedBusinessHistory || {};
  const hasLinkedBusinessHistory = Boolean(item.hasLinkedBusinessHistory || contract.hasLinkedBusinessHistory || linked.hasLinkedBusinessHistory);
  return {
    ...item,
    ...coverage,
    hasLinkedBusinessHistory,
    lifecycleAction: hasLinkedBusinessHistory ? 'archive' : 'delete',
    warrantyIncluded,
    warrantyStartDate: warrantyIncluded ? item.warrantyStartDate || null : null,
    warrantyEndDate: warrantyIncluded ? item.warrantyEndDate || null : null,
    warrantyCoveredItems: warrantyIncluded ? item.warrantyCoveredItems || '' : '',
    warrantyTerms: warrantyIncluded ? item.warrantyTerms || '' : '',
    status: contractStatus(contract),
    renewalStatus: renewalStatus(contract),
    visits: (contract.visits || []).map((visit) => {
      const visitItem = typeof visit.toJSON === 'function' ? visit.toJSON() : visit;
      return { ...visitItem, status: visitStatus(visit) };
    })
  };
}

function emptyExtraChargeSummary() {
  return {
    invoiceCount: 0,
    total: 0,
    paid: 0,
    pending: 0,
    status: 'None',
    invoiceIds: []
  };
}

function cleanDeviceDetail(value) {
  return clean(value).slice(0, 80);
}

async function extraChargeSummaries(contractIds = []) {
  const ids = contractIds.filter(Boolean);
  if (!ids.length) return new Map();

  const workOrders = await WorkOrder.find({ amcContractId: { $in: ids }, invoiceId: { $ne: null } }).select('amcContractId invoiceId').lean();
  const invoiceToContract = new Map(workOrders.map((order) => [String(order.invoiceId), String(order.amcContractId)]));
  const invoices = await Invoice.find({ _id: { $in: [...invoiceToContract.keys()] } }).select('_id total paidAmount balance status').lean();
  const summaries = new Map(ids.map((id) => [String(id), emptyExtraChargeSummary()]));

  invoices.forEach((invoice) => {
    const contractId = invoiceToContract.get(String(invoice._id));
    if (!contractId) return;
    const summary = summaries.get(contractId) || emptyExtraChargeSummary();
    summary.invoiceCount += 1;
    summary.total += Number(invoice.total || 0);
    summary.paid += Number(invoice.paidAmount || 0);
    summary.pending += Number(invoice.balance || 0);
    summary.invoiceIds.push(String(invoice._id));
    summaries.set(contractId, summary);
  });

  summaries.forEach((summary) => {
    if (!summary.invoiceCount) {
      summary.status = 'None';
    } else if (summary.pending <= 0) {
      summary.status = 'Paid';
    } else if (summary.paid > 0) {
      summary.status = 'Partial';
    } else {
      summary.status = 'Pending';
    }
  });

  return summaries;
}

async function linkedBusinessHistorySummaries(contracts = []) {
  const ids = contracts.map((contract) => contract._id).filter(Boolean);
  const summaries = new Map(ids.map((id) => [String(id), {
    workOrderCount: 0,
    invoiceCount: 0,
    paymentCount: 0,
    completedOrLinkedVisitCount: 0,
    auditCount: 0,
    hasLinkedBusinessHistory: false
  }]));
  if (!ids.length) return summaries;

  const workOrders = await WorkOrder.find({ amcContractId: { $in: ids } }).select('_id amcContractId invoiceId').lean();
  const workOrderIds = workOrders.map((order) => order._id).filter(Boolean);
  const invoiceQuery = [
    { amcContractId: { $in: ids } },
    { _id: { $in: contracts.map((contract) => contract.invoiceId).filter(Boolean) } }
  ];
  if (workOrderIds.length) invoiceQuery.push({ workOrderId: { $in: workOrderIds } });
  const invoices = await Invoice.find({ $or: invoiceQuery }).select('_id amcContractId workOrderId').lean();
  const invoiceIds = invoices.map((invoice) => invoice._id).filter(Boolean);
  const payments = invoiceIds.length
    ? await Payment.aggregate([
      { $match: { invoiceId: { $in: invoiceIds }, status: { $ne: 'Reversed' } } },
      { $group: { _id: '$invoiceId', count: { $sum: 1 } } }
    ])
    : [];
  const paymentCountsByInvoice = new Map(payments.map((row) => [String(row._id), row.count]));
  const auditRows = await AuditLog.aggregate([
    {
      $match: {
        module: 'amc',
        recordId: { $in: ids },
        action: { $nin: ['amc_contract_created'] }
      }
    },
    { $group: { _id: '$recordId', count: { $sum: 1 } } }
  ]);
  const auditCountsByContract = new Map(auditRows.map((row) => [String(row._id), row.count]));

  workOrders.forEach((order) => {
    const contractId = String(order.amcContractId || '');
    const summary = summaries.get(contractId);
    if (summary) summary.workOrderCount += 1;
  });

  invoices.forEach((invoice) => {
    let contractId = String(invoice.amcContractId || '');
    if (!contractId && invoice.workOrderId) {
      const sourceOrder = workOrders.find((order) => String(order._id) === String(invoice.workOrderId));
      contractId = String(sourceOrder?.amcContractId || '');
    }
    if (!contractId) {
      const sourceContract = contracts.find((contract) => String(contract.invoiceId || '') === String(invoice._id));
      contractId = String(sourceContract?._id || '');
    }
    const summary = summaries.get(contractId);
    if (!summary) return;
    summary.invoiceCount += 1;
    summary.paymentCount += paymentCountsByInvoice.get(String(invoice._id)) || 0;
  });

  contracts.forEach((contract) => {
    const summary = summaries.get(String(contract._id));
    if (!summary) return;
    summary.completedOrLinkedVisitCount = (contract.visits || []).filter((visit) => visit.status === 'Completed' || visit.workOrderId).length;
    summary.auditCount = auditCountsByContract.get(String(contract._id)) || 0;
    summary.hasLinkedBusinessHistory = Boolean(
      summary.workOrderCount
      || summary.invoiceCount
      || summary.paymentCount
      || summary.completedOrLinkedVisitCount
      || summary.auditCount
    );
  });

  return summaries;
}

function flattenSchedule(contracts = []) {
  return contracts.flatMap((contract) => {
    const item = serializeContract(contract);
    return (item.visits || []).map((visit) => ({
      id: visit.id || visit._id,
      contractId: item.id || item._id,
      contractCode: item.contractId,
      customerId: item.customerId,
      customerName: item.customerName,
      phone: item.phone,
      contractType: item.contractType,
      coverageType: item.coverageType,
      serviceType: visit.serviceType || item.coveredService,
      scheduledDate: visit.scheduledDate,
      technicianId: visit.technicianId,
      status: visit.status,
      workOrderId: visit.workOrderId
    }));
  }).sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
}

export async function getAmcSummary(scope = null) {
  const filter = activeContractFilter(scope ? { _id: { $in: scope.amcContractObjectIds } } : {});
  const contracts = await AMCContract.find(filter).populate('visits.technicianId visits.workOrderId customerId invoiceId technicianId').sort({ endDate: 1 });
  const serialized = contracts.map(serializeContract);
  const today = normalizeDay(new Date());
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const schedule = flattenSchedule(contracts);

  return {
    activeContracts: serialized.filter((contract) => contract.status === 'Active').length,
    renewalDue: serialized.filter((contract) => contract.renewalStatus === 'Renewal Due').length,
    expiredContracts: serialized.filter((contract) => contract.renewalStatus === 'Expired').length,
    visitsThisWeek: schedule.filter((visit) => {
      const scheduled = new Date(visit.scheduledDate);
      return scheduled >= today && scheduled <= weekEnd && visit.status !== 'Completed';
    }).length
  };
}

export async function listAmcContracts(query = {}, user = null) {
  const filter = activeContractFilter();
  const technicianScope = await getTechnicianScope(user);
  if (technicianScope) filter._id = { $in: technicianScope.amcContractObjectIds };
  const search = clean(query.search);
  if (search) {
    filter.$or = [
      { contractId: new RegExp(search, 'i') },
      { customerName: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') },
      { contractType: new RegExp(search, 'i') },
      { coverageType: new RegExp(search, 'i') },
      { coveredService: new RegExp(search, 'i') }
    ];
  }

  const contracts = await AMCContract.find(filter).populate('customerId technicianId visits.technicianId visits.workOrderId invoiceId').sort({ createdAt: -1 });
  const extras = await extraChargeSummaries(contracts.map((contract) => contract._id));
  const linkedHistory = await linkedBusinessHistorySummaries(contracts);
  const serialized = contracts.map((contract) => {
    const linked = linkedHistory.get(String(contract._id)) || {};
    return {
      ...serializeContract(Object.assign(contract, { linkedBusinessHistory: linked, hasLinkedBusinessHistory: Boolean(linked.hasLinkedBusinessHistory) })),
      extraCharges: extras.get(String(contract._id)) || emptyExtraChargeSummary()
    };
  });
  const summary = await getAmcSummary(technicianScope);
  return { contracts: serialized, summary };
}

export async function createAmcContract(payload, user) {
  assertPermission(user, 'create_amc');
  const contractType = clean(payload.contractType);
  const serviceFrequency = clean(payload.serviceFrequency);
  if (!contractTypes.includes(contractType)) throw appError('Select a valid AMC contract type');
  if (!serviceFrequencies.includes(serviceFrequency)) throw appError('Select a valid service frequency');

  const startDate = normalizeDay(payload.startDate);
  const endDate = normalizeDay(payload.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) throw appError('Start date and end date are required');
  if (endDate < startDate) throw appError('End date must be after start date');

  const customer = await upsertCustomer({
    name: payload.customerName || payload.customer,
    phone: payload.phone,
    address: payload.address,
    device: payload.coveredDevices
  });

  const coveredService = clean(payload.coveredService) || coveredServiceByType[contractType] || contractType;
  const deviceBrand = cleanDeviceDetail(payload.deviceBrand || payload.brand || '');
  const deviceModel = cleanDeviceDetail(payload.deviceModel || payload.model || '');
  if (!deviceBrand) throw appError('Device brand is required.', 400);
  const coverageType = normalizeAmcCoverageType(payload.coverageType);
  const coverage = amcCoverageSummary({
    coverageType,
    coverParts: payload.coverParts,
    coverService: payload.coverService,
    coverVisits: payload.coverVisits
  });
  let technicianId = payload.technicianId || null;
  if (technicianId) {
    const technician = await User.findOne({ _id: technicianId, role: 'technician', active: true });
    if (!technician) throw appError('Select a valid active technician');
    technicianId = technician._id;
  }
  const warrantyIncluded = booleanValue(payload.warrantyIncluded);
  const visits = generateVisits({
    startDate,
    endDate,
    serviceFrequency,
    includedVisits: payload.includedVisits,
    coveredService
  }).map((visit) => (technicianId ? { ...visit, technicianId } : user?.role === 'technician' ? { ...visit, technicianId: user._id } : visit));
  const contract = await AMCContract.create({
    contractId: contractCode(),
    customerId: customer._id,
    customerName: customer.name,
    phone: customer.phone,
    address: clean(payload.address) || customer.address,
    contractType,
    coverageType,
    coverParts: coverage.coverParts,
    coverService: coverage.coverService,
    coverVisits: coverage.coverVisits,
    coveredService,
    coveredDevices: clean(payload.coveredDevices || payload.assets),
    deviceBrand,
    deviceModel,
    warrantyIncluded,
    warrantyStartDate: warrantyIncluded ? optionalDay(payload.warrantyStartDate) : null,
    warrantyEndDate: warrantyIncluded ? optionalDay(payload.warrantyEndDate) : null,
    warrantyCoveredItems: warrantyIncluded ? clean(payload.warrantyCoveredItems) : '',
    warrantyTerms: warrantyIncluded ? clean(payload.warrantyTerms) : '',
    serviceFrequency,
    startDate,
    endDate,
    contractValue: Math.max(0, numberValue(payload.contractValue, 0)),
    technicianId,
    includedVisits: Math.max(0, numberValue(payload.includedVisits, 0)),
    notes: clean(payload.notes),
    visits
  });

  try {
    await logAudit({
      userId: user?._id || null,
      action: 'amc_contract_created',
      module: 'amc',
      recordId: contract._id,
      after: {
        entityType: 'AMCContract',
        contractId: contract.contractId,
        customerName: contract.customerName,
        phone: contract.phone,
        contractType: contract.contractType,
        coverageType: contract.coverageType,
        contractValue: contract.contractValue
      }
    });
  } catch (error) {
    console.warn('Audit log failed for AMC contract create:', error.message);
  }

  return serializeContract(await contract.populate('customerId technicianId visits.technicianId visits.workOrderId invoiceId'));
}

export async function listAmcSchedule(query = {}, user = null) {
  const technicianScope = await getTechnicianScope(user);
  const filter = activeContractFilter(technicianScope ? { _id: { $in: technicianScope.amcContractObjectIds } } : {});
  const contracts = await AMCContract.find(filter).populate('customerId technicianId visits.technicianId visits.workOrderId invoiceId').sort({ startDate: -1 });
  let schedule = flattenSchedule(contracts);
  const status = clean(query.status);
  if (status) schedule = schedule.filter((visit) => visit.status === status);
  return { schedule };
}

export async function listAmcRenewals(user = null) {
  const technicianScope = await getTechnicianScope(user);
  const filter = activeContractFilter(technicianScope ? { _id: { $in: technicianScope.amcContractObjectIds } } : {});
  const contracts = await AMCContract.find(filter).populate('customerId technicianId visits.technicianId visits.workOrderId invoiceId').sort({ endDate: 1 });
  const renewals = contracts.map(serializeContract).filter((contract) => ['Renewal Due', 'Expired'].includes(contract.renewalStatus));
  return { renewals };
}

export async function updateAmcContractAssignment(contractId, payload = {}, user) {
  assertPermission(user, 'assign_technician', 'You do not have permission to assign AMC contracts');
  const contract = await AMCContract.findOne(activeContractFilter({ _id: contractId }));
  if (!contract) throw appError('AMC contract not found', 404);

  const rawTechnicianId = clean(payload.technicianId);
  const before = {
    technicianId: contract.technicianId || null,
    visitTechnicianIds: (contract.visits || []).map((visit) => ({ id: visit._id, technicianId: visit.technicianId || null, status: visit.status }))
  };
  let nextTechnician = null;

  if (rawTechnicianId) {
    const technicianId = validObjectId(rawTechnicianId);
    if (!technicianId) throw appError('Select a valid active technician');
    nextTechnician = await User.findOne({ _id: technicianId, role: 'technician', active: true });
    if (!nextTechnician) throw appError('Select a valid active technician');
    contract.technicianId = nextTechnician._id;
  } else {
    contract.technicianId = null;
  }

  (contract.visits || []).forEach((visit) => {
    if (visit.status === 'Completed') return;
    visit.technicianId = nextTechnician?._id || null;
  });

  await contract.save();
  await logAudit({
    userId: user?._id || null,
    action: 'amc_contract_reassigned',
    module: 'amc',
    recordId: contract._id,
    before,
    after: {
      contractId: contract.contractId,
      customerName: contract.customerName,
      technicianId: nextTechnician?._id || null,
      technicianName: nextTechnician?.name || 'Admin'
    }
  });

  const populated = await contract.populate('customerId technicianId visits.technicianId visits.workOrderId invoiceId');
  const linked = await linkedBusinessHistorySummaries([populated]);
  populated.linkedBusinessHistory = linked.get(String(populated._id)) || {};
  populated.hasLinkedBusinessHistory = Boolean(populated.linkedBusinessHistory.hasLinkedBusinessHistory);
  return serializeContract(populated);
}

export async function deleteOrArchiveAmcContract(contractId, user) {
  assertPermission(user, 'create_amc', 'You do not have permission to delete AMC contracts');
  const contract = await AMCContract.findById(contractId).populate('customerId technicianId visits.technicianId visits.workOrderId invoiceId');
  if (!contract || contract.isDeleted || contract.archivedAt) throw appError('AMC contract not found', 404);

  const linked = await linkedBusinessHistorySummaries([contract]);
  const summary = linked.get(String(contract._id)) || {};
  const hasLinkedBusinessHistory = Boolean(summary.hasLinkedBusinessHistory);
  const before = {
    contractId: contract.contractId,
    customerName: contract.customerName,
    status: contract.status,
    technicianId: contract.technicianId || null,
    linkedBusinessHistory: summary
  };

  if (hasLinkedBusinessHistory) {
    contract.archivedAt = new Date();
    contract.archivedBy = user?._id || null;
    await contract.save();
  }

  await logAudit({
    userId: user?._id || null,
    action: hasLinkedBusinessHistory ? 'amc_contract_archived' : 'amc_contract_deleted',
    module: 'amc',
    recordId: contract._id,
    before,
    after: {
      contractId: contract.contractId,
      customerName: contract.customerName,
      deleted: !hasLinkedBusinessHistory,
      archivedAt: contract.archivedAt,
      linkedBusinessHistory: summary
    }
  });

  if (!hasLinkedBusinessHistory) {
    await AMCContract.deleteOne({ _id: contract._id });
  }

  return {
    id: String(contract._id),
    action: hasLinkedBusinessHistory ? 'archive' : 'delete',
    message: hasLinkedBusinessHistory ? 'AMC contract archived' : 'AMC contract deleted'
  };
}

export async function createWorkOrderFromAmc(contractId, payload, user) {
  assertPermission(user, 'create_amc_job');
  const contract = await AMCContract.findOne(activeContractFilter({ _id: contractId }));
  if (!contract) throw appError('AMC contract not found', 404);
  const visit = payload.visitId ? contract.visits.id(payload.visitId) : contract.visits.find((item) => item.status !== 'Completed');

  const workOrder = await createWorkOrder({
    customerId: contract.customerId,
    serviceType: visit?.serviceType || contract.coveredService,
    bookingSource: 'AMC',
    device: contract.coveredDevices || contract.contractType,
    deviceBrand: contract.deviceBrand || '',
    deviceModel: contract.deviceModel || '',
    issue: clean(payload.issue) || `AMC visit for ${contract.contractType}`,
    technicianId: payload.technicianId || visit?.technicianId || null,
    amcContractId: contract._id,
    amcVisitId: visit?._id || null
  }, user);

  if (visit) {
    visit.status = 'Completed';
    visit.completedAt = new Date();
    visit.workOrderId = workOrder._id || workOrder.id;
    await contract.save();
  }

  try {
    await logAudit({
      userId: user?._id || null,
      action: 'amc_visit_work_order_created',
      module: 'amc',
      recordId: contract._id,
      after: {
        contractId: contract.contractId,
        workOrderId: workOrder._id || workOrder.id,
        customerName: contract.customerName,
        serviceType: visit?.serviceType || contract.coveredService
      }
    });
  } catch (error) {
    console.warn('Audit log failed for AMC visit conversion:', error.message);
  }

  return { workOrder, contract: serializeContract(await contract.populate('customerId technicianId visits.technicianId visits.workOrderId invoiceId')) };
}
