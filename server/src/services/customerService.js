import Customer from '../models/Customer.js';
import WorkOrder from '../models/WorkOrder.js';
import Invoice from '../models/Invoice.js';
import { appError, clean } from '../utils/http.js';

export async function upsertCustomer(payload) {
  const phone = clean(payload.phone);
  if (!phone) throw appError('Customer phone is required');

  const update = {
    name: clean(payload.name || payload.customerName),
    phone,
    address: clean(payload.address)
  };
  if (clean(payload.device)) update.$addToSet = { devices: clean(payload.device) };

  const existing = await Customer.findOne({ phone });
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
  const existing = await Customer.findOne({ phone: clean(payload.phone) });
  if (existing) throw appError('A customer with this phone already exists', 409);
  return upsertCustomer(payload);
}

export async function getCustomerProfile(id) {
  const customer = await Customer.findById(id);
  if (!customer) throw appError('Customer not found', 404);
  const serviceHistory = await WorkOrder.find({ customerId: id }).populate('technicianId', 'name').sort({ createdAt: -1 });
  const invoices = await Invoice.find({ customerId: id }).sort({ createdAt: -1 });
  return { customer, serviceHistory, invoices };
}
