import Customer from '../models/Customer.js';
import Invoice from '../models/Invoice.js';
import WorkOrder from '../models/WorkOrder.js';
import { createCustomer, getCustomerProfile, updateCustomer } from '../services/customerService.js';
import { getTechnicianScope } from '../services/technicianScopeService.js';
import { clean, required } from '../utils/http.js';
import { addDateRange, paginatedPayload, paginationMeta, parsePagination, searchRegex, withIds } from '../utils/pagination.js';
import { phoneLookupValues } from '../utils/phone.js';

export async function create(req, res) {
  required(req.body, ['name', 'phone']);
  const customer = await createCustomer(req.body);
  res.status(201).json({ customer, message: 'Customer created' });
}

export async function list(req, res) {
  try {
    const filter = {};
    const { page, limit, skip } = parsePagination(req.query);
    const regex = searchRegex(req.query.search);
    if (regex) {
      const phoneClauses = phoneLookupValues(req.query.search).map((value) => ({ phone: searchRegex(value) }));
      filter.$or = [{ name: regex }, { phone: regex }, { email: regex }, { address: regex }, { devices: regex }, ...phoneClauses];
    }
    addDateRange(filter, req.query);
    const technicianScope = await getTechnicianScope(req.user);
    if (technicianScope) filter._id = { $in: technicianScope.customerObjectIds };

    const [total, rows] = await Promise.all([
      Customer.countDocuments(filter),
      Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
    ]);
    const customers = withIds(rows);
    const customerIds = customers.map((customer) => customer._id);
    const [workOrders, invoices] = customerIds.length ? await Promise.all([
      WorkOrder.find({
        customerId: { $in: customerIds },
        ...(technicianScope ? { _id: { $in: technicianScope.workOrderObjectIds } } : {})
      }).select('customerId device status serviceType issue bookingId createdAt').lean(),
      Invoice.find({
        customerId: { $in: customerIds },
        ...(technicianScope ? { _id: { $in: technicianScope.invoiceObjectIds } } : {})
      }).select('customerId invoiceNumber balance paidAmount status createdAt').lean()
    ]) : [[], []];

    res.json(paginatedPayload('customers', customers, paginationMeta(page, limit, total), {
      workOrders: workOrders.map((order) => ({ ...order, id: String(order._id), customerId: String(order.customerId) })),
      invoices: invoices.map((invoice) => ({ ...invoice, id: String(invoice._id), customerId: String(invoice.customerId) }))
    }));
  } catch (error) {
    console.error('Customer list failed', error);
    res.status(500).json({ success: false, message: 'Unable to load customers right now' });
  }
}

export async function getById(req, res) {
  const profile = await getCustomerProfile(req.params.id, req.user);
  res.json(profile);
}

export async function update(req, res) {
  const customer = await updateCustomer(req.params.id, req.body, req.user);
  res.json({ customer, message: 'Customer updated' });
}
