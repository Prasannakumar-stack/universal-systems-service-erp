import Customer from '../models/Customer.js';
import AuditLog from '../models/AuditLog.js';
import WorkOrder from '../models/WorkOrder.js';
import Invoice from '../models/Invoice.js';
import { logAudit } from './auditService.js';
import { appError, clean } from '../utils/http.js';
import { normalizePhoneInput, phoneLookupValues } from '../utils/phone.js';
import { getTechnicianScope } from './technicianScopeService.js';

export async function upsertCustomer(payload) {
  const rawPhone = clean(payload.phone);
  const phone = normalizePhoneInput(rawPhone);
  if (!phone) throw appError('Customer phone is required');

  const update = {
    name: clean(payload.name || payload.customerName),
    phone,
    address: clean(payload.address)
  };
  if (clean(payload.device)) update.$addToSet = { devices: clean(payload.device) };

  const existing = await Customer.findOne({ phone: { $in: phoneLookupValues(rawPhone) } });
  if (existing) {
    Object.entries(update).forEach(([key, value]) => {
      if (key !== '$addToSet' && value) existing[key] = value;
    });
    if (clean(payload.device) && !existing.devices.includes(clean(payload.device))) existing.devices.push(clean(payload.device));
    return existing.save();
  }

  return Customer.create({
    ...update,
    devices: clean(payload.device) ? [clean(payload.device)] : []
  });
}

export async function createCustomer(payload) {
  const existing = await Customer.findOne({ phone: { $in: phoneLookupValues(payload.phone) } });
  if (existing) throw appError('A customer with this phone already exists', 409);
  return upsertCustomer(payload);
}

export async function updateCustomer(id, payload, user = null) {
  const customer = await Customer.findById(id);
  if (!customer) throw appError('Customer not found', 404);
  const previousCustomerType = clean(customer.customerType);

  if (Object.prototype.hasOwnProperty.call(payload, 'name')) customer.name = clean(payload.name);
  if (Object.prototype.hasOwnProperty.call(payload, 'address')) customer.address = clean(payload.address);
  if (Object.prototype.hasOwnProperty.call(payload, 'customerType')) customer.customerType = clean(payload.customerType);
  if (Object.prototype.hasOwnProperty.call(payload, 'type') && !Object.prototype.hasOwnProperty.call(payload, 'customerType')) {
    customer.customerType = clean(payload.type);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'phone')) {
    const rawPhone = clean(payload.phone);
    const phone = normalizePhoneInput(rawPhone);
    if (!phone) throw appError('Customer phone is required');
    const existing = await Customer.findOne({
      _id: { $ne: customer._id },
      phone: { $in: phoneLookupValues(rawPhone) }
    });
    if (existing) throw appError('A customer with this phone already exists', 409);
    customer.phone = phone;
  }

  const updated = await customer.save();
  const nextCustomerType = clean(updated.customerType);
  if (previousCustomerType !== nextCustomerType) {
    await logAudit({
      userId: user?._id || null,
      action: 'customer_type_changed',
      module: 'customer',
      recordId: updated._id,
      before: { customerType: previousCustomerType },
      after: { customerType: nextCustomerType }
    });
  }

  return updated;
}

export async function getCustomerProfile(id, user = null) {
  const customer = await Customer.findById(id);
  if (!customer) throw appError('Customer not found', 404);
  const technicianScope = await getTechnicianScope(user);
  if (technicianScope && !technicianScope.customerIds.includes(String(customer._id))) {
    throw appError('Customer not found', 404);
  }
  const serviceHistory = await WorkOrder.find({
    customerId: id,
    ...(technicianScope ? { _id: { $in: technicianScope.workOrderObjectIds } } : {})
  }).populate('technicianId', 'name').sort({ createdAt: -1 });
  const invoices = await Invoice.find({
    customerId: id,
    ...(technicianScope ? { _id: { $in: technicianScope.invoiceObjectIds } } : {})
  }).sort({ createdAt: -1 });
  const profileEvents = await AuditLog.find({
    module: 'customer',
    recordId: customer._id,
    action: 'customer_type_changed'
  }).populate('userId', 'name username role').sort({ createdAt: -1 }).lean();
  return { customer, serviceHistory, invoices, profileEvents };
}
