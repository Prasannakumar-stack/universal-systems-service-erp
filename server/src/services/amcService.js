import { randomUUID } from 'node:crypto';
import AuditLog from '../models/AuditLog.js';
import AMCContract from '../models/AMCContract.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import WorkOrder from '../models/WorkOrder.js';
import { assertPermission, normalizeRole } from '../permissions.js';
import { clean, appError, numberValue } from '../utils/http.js';
import { validObjectId } from '../utils/pagination.js';
import { upsertCustomer } from './customerService.js';
import { createWorkOrder, getWorkOrder } from './workOrderService.js';
import { logAudit } from './auditService.js';
import { amcCoverageSummary, normalizeAmcCoverageType } from './amcCoverageEngine.js';
import { getTechnicianScope } from './technicianScopeService.js';

const contractTypes = ['Basic AMC', 'Comprehensive AMC', 'CCTV AMC', 'Printer AMC', 'Networking AMC', 'Solar / UPS AMC', 'Custom'];
const serviceFrequencies = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'];
const oneDay = 24 * 60 * 60 * 1000;
const TRASH_RETENTION_DAYS = 30;
const AMC_LIFECYCLE_AUDIT_ACTIONS = [
  'amc_contract_archived',
  'amc_contract_moved_to_trash',
  'amc_contract_restored',
  'amc_contract_permanently_deleted'
];
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

function isAdminUser(user) {
  const role = normalizeRole(user?.role);
  return role === 'admin' || role === 'super_admin';
}

function trashExpiryFrom(date) {
  return new Date(date.getTime() + TRASH_RETENTION_DAYS * oneDay);
}

function trashDaysLeft(deleteExpiresAt) {
  if (!deleteExpiresAt) return null;
  const expiresAt = new Date(deleteExpiresAt);
  if (Number.isNaN(expiresAt.getTime())) return null;
  return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / oneDay));
}

function amcLifecycleState(contract = {}) {
  if (contract.isDeleted) return 'trash';
  if (contract.archivedAt) return 'archived';
  return 'active';
}

function amcLifecycleFilter(query = {}) {
  const lifecycle = clean(query.lifecycle || query.archiveStatus).toLowerCase();
  if (lifecycle === 'archived') return { isDeleted: { $ne: true }, archivedAt: { $type: 'date' } };
  if (lifecycle === 'trash') return { isDeleted: true };
  if (lifecycle === 'all') return {};
  return { isDeleted: { $ne: true }, archivedAt: null };
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
  const lifecycleState = amcLifecycleState(item);
  return {
    ...item,
    ...coverage,
    linkedBusinessHistory: linked,
    hasLinkedBusinessHistory,
    lifecycleState,
    lifecycleAction: lifecycleState === 'active' ? 'archive' : 'restore',
    canArchive: lifecycleState === 'active',
    canMoveToTrash: lifecycleState !== 'trash',
    canRestore: lifecycleState !== 'active',
    canPermanentDelete: lifecycleState === 'trash' && !hasLinkedBusinessHistory,
    permanentDeleteBlockedReason: lifecycleState === 'trash' && hasLinkedBusinessHistory ? 'Kept for history' : '',
    trashDaysLeft: lifecycleState === 'trash' ? trashDaysLeft(item.deleteExpiresAt) : null,
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
        action: { $nin: ['amc_contract_created', ...AMC_LIFECYCLE_AUDIT_ACTIONS] }
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
  const baseFilter = {};
  const technicianScope = await getTechnicianScope(user);
  if (technicianScope) baseFilter._id = { $in: technicianScope.amcContractObjectIds };
  const search = clean(query.search);
  if (search) {
    baseFilter.$or = [
      { contractId: new RegExp(search, 'i') },
      { customerName: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') },
      { contractType: new RegExp(search, 'i') },
      { coverageType: new RegExp(search, 'i') },
      { coveredService: new RegExp(search, 'i') }
    ];
  }
  const filter = { ...baseFilter, ...amcLifecycleFilter(query) };
  const lifecycleCountQueries = {
    active: { ...baseFilter, ...amcLifecycleFilter({ lifecycle: 'active' }) },
    archived: { ...baseFilter, ...amcLifecycleFilter({ lifecycle: 'archived' }) },
    trash: { ...baseFilter, ...amcLifecycleFilter({ lifecycle: 'trash' }) },
    all: { ...baseFilter, ...amcLifecycleFilter({ lifecycle: 'all' }) }
  };

  const [contracts, activeCount, archivedCount, trashCount, allCount] = await Promise.all([
    AMCContract.find(filter).populate('customerId technicianId visits.technicianId visits.workOrderId invoiceId').sort({ createdAt: -1 }),
    AMCContract.countDocuments(lifecycleCountQueries.active),
    AMCContract.countDocuments(lifecycleCountQueries.archived),
    AMCContract.countDocuments(lifecycleCountQueries.trash),
    AMCContract.countDocuments(lifecycleCountQueries.all)
  ]);
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
  return {
    contracts: serialized,
    summary,
    lifecycleCounts: {
      active: activeCount,
      archived: archivedCount,
      trash: trashCount,
      all: allCount
    }
  };
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

export async function archiveAmcContract(contractId, user) {
  assertPermission(user, 'create_amc', 'You do not have permission to archive AMC contracts');
  const contract = await AMCContract.findById(contractId).populate('customerId technicianId visits.technicianId visits.workOrderId invoiceId');
  if (!contract) throw appError('AMC contract not found', 404);
  if (contract.isDeleted) throw appError('Restore the AMC contract before archiving it', 409);
  if (contract.archivedAt) throw appError('AMC contract is already archived', 409);

  const linked = await linkedBusinessHistorySummaries([contract]);
  const summary = linked.get(String(contract._id)) || {};
  const before = {
    contractId: contract.contractId,
    customerName: contract.customerName,
    status: contract.status,
    technicianId: contract.technicianId || null,
    linkedBusinessHistory: summary
  };

  contract.archivedAt = new Date();
  contract.archivedBy = user?._id || null;
  await contract.save();

  await logAudit({
    userId: user?._id || null,
    action: 'amc_contract_archived',
    module: 'amc',
    recordId: contract._id,
    before,
    after: {
      contractId: contract.contractId,
      customerName: contract.customerName,
      archivedAt: contract.archivedAt,
      linkedBusinessHistory: summary
    }
  });

  return {
    id: String(contract._id),
    action: 'archived',
    message: 'AMC contract archived'
  };
}

export async function moveAmcContractToTrash(contractId, user) {
  assertPermission(user, 'create_amc', 'You do not have permission to move AMC contracts to Trash');
  const contract = await AMCContract.findById(contractId).populate('customerId technicianId visits.technicianId visits.workOrderId invoiceId');
  if (!contract) throw appError('AMC contract not found', 404);
  if (contract.isDeleted) throw appError('AMC contract is already in Trash', 409);

  const linked = await linkedBusinessHistorySummaries([contract]);
  const summary = linked.get(String(contract._id)) || {};
  const before = {
    contractId: contract.contractId,
    customerName: contract.customerName,
    status: contract.status,
    technicianId: contract.technicianId || null,
    archivedAt: contract.archivedAt || null,
    linkedBusinessHistory: summary
  };

  const deletedAt = new Date();
  contract.isDeleted = true;
  contract.deletedAt = deletedAt;
  contract.deletedBy = user?._id || null;
  contract.deleteExpiresAt = trashExpiryFrom(deletedAt);
  await contract.save();

  await logAudit({
    userId: user?._id || null,
    action: 'amc_contract_moved_to_trash',
    module: 'amc',
    recordId: contract._id,
    before,
    after: {
      contractId: contract.contractId,
      customerName: contract.customerName,
      deletedAt: contract.deletedAt,
      deleteExpiresAt: contract.deleteExpiresAt,
      linkedBusinessHistory: summary
    }
  });

  return {
    id: String(contract._id),
    action: 'trashed',
    message: 'Moved to Trash. You can restore this AMC contract within 30 days from Trash.'
  };
}

export async function restoreAmcContract(contractId, user) {
  assertPermission(user, 'create_amc', 'You do not have permission to restore AMC contracts');
  const contract = await AMCContract.findById(contractId);
  if (!contract) throw appError('AMC contract not found', 404);
  if (!contract.isDeleted && !contract.archivedAt) throw appError('AMC contract is already active', 409);

  const restoringFromTrash = Boolean(contract.isDeleted);
  if (restoringFromTrash && contract.deleteExpiresAt && new Date(contract.deleteExpiresAt).getTime() < Date.now()) {
    throw appError('Trash restore period has expired. Permanently delete it from Trash or contact an administrator.', 410);
  }

  const before = {
    archivedAt: contract.archivedAt || null,
    isDeleted: Boolean(contract.isDeleted),
    deletedAt: contract.deletedAt || null,
    deleteExpiresAt: contract.deleteExpiresAt || null
  };

  if (contract.isDeleted) {
    contract.isDeleted = false;
    contract.deletedAt = null;
    contract.deletedBy = null;
    contract.deleteExpiresAt = null;
  } else {
    contract.archivedAt = null;
    contract.archivedBy = null;
  }

  await contract.save();
  await logAudit({
    userId: user?._id || null,
    action: 'amc_contract_restored',
    module: 'amc',
    recordId: contract._id,
    before,
    after: {
      archivedAt: contract.archivedAt || null,
      isDeleted: Boolean(contract.isDeleted),
      deletedAt: contract.deletedAt || null,
      deleteExpiresAt: contract.deleteExpiresAt || null
    }
  });

  const lifecycleState = amcLifecycleState(contract);
  return {
    id: String(contract._id),
    action: 'restored',
    lifecycleState,
    message: lifecycleState === 'archived' ? 'AMC contract restored to Archived.' : 'AMC contract restored.'
  };
}

export async function permanentlyDeleteAmcContract(contractId, user) {
  assertPermission(user, 'create_amc', 'You do not have permission to permanently delete AMC contracts');
  if (!isAdminUser(user)) throw appError('Only Admin users can permanently delete AMC contracts', 403);
  const contract = await AMCContract.findOne({ _id: contractId, isDeleted: true }).populate('customerId technicianId visits.technicianId visits.workOrderId invoiceId');
  if (!contract) throw appError('AMC contract not found in Trash', 404);

  const linked = await linkedBusinessHistorySummaries([contract]);
  const summary = linked.get(String(contract._id)) || {};
  if (summary.hasLinkedBusinessHistory) {
    throw appError('Kept for history. This AMC contract has linked jobs, invoices, payments, visits, or history.', 409);
  }

  const before = {
    contractId: contract.contractId,
    customerName: contract.customerName,
    deletedAt: contract.deletedAt || null,
    deleteExpiresAt: contract.deleteExpiresAt || null
  };

  await AMCContract.deleteOne({ _id: contract._id });
  await logAudit({
    userId: user?._id || null,
    action: 'amc_contract_permanently_deleted',
    module: 'amc',
    recordId: contract._id,
    before
  });

  return { id: String(contract._id), action: 'permanentlyDeleted', message: 'AMC contract permanently deleted.' };
}

export async function deleteOrArchiveAmcContract(contractId, user) {
  return moveAmcContractToTrash(contractId, user);
}

export async function createWorkOrderFromAmc(contractId, payload, user) {
  assertPermission(user, 'create_amc_job');
  const contract = await AMCContract.findOne(activeContractFilter({ _id: contractId }));
  if (!contract) throw appError('AMC contract not found', 404);
  const visit = payload.visitId ? contract.visits.id(payload.visitId) : contract.visits.find((item) => item.status !== 'Completed');
  const existingFilter = {
    amcContractId: contract._id,
    isDeleted: { $ne: true },
    archivedAt: null,
    status: { $nin: ['Completed', 'Delivered', 'Returned'] }
  };
  if (payload.visitId && visit?._id) existingFilter.amcVisitId = visit._id;
  const existingWorkOrder = await WorkOrder.findOne(existingFilter).sort({ createdAt: -1 });
  if (existingWorkOrder) {
    return {
      workOrder: await getWorkOrder(existingWorkOrder._id, user),
      contract: serializeContract(await contract.populate('customerId technicianId visits.technicianId visits.workOrderId invoiceId')),
      reused: true
    };
  }

  const workOrder = await createWorkOrder({
    customerId: contract.customerId,
    serviceType: visit?.serviceType || contract.coveredService,
    bookingSource: 'AMC',
    source: 'AMC',
    device: contract.coveredDevices || contract.contractType,
    deviceBrand: contract.deviceBrand || '',
    deviceModel: contract.deviceModel || '',
    issue: clean(payload.issue) || `AMC visit for ${contract.contractType}`,
    technicianId: payload.technicianId || visit?.technicianId || null,
    amcContractId: contract._id,
    amcVisitId: visit?._id || null,
    amcContractNo: contract.contractId
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
