import Customer from '../models/Customer.js';
import { createCustomer, getCustomerProfile } from '../services/customerService.js';
import { clean, required } from '../utils/http.js';

export async function create(req, res) {
  required(req.body, ['name', 'phone']);
  const customer = await createCustomer(req.body);
  res.status(201).json({ customer, message: 'Customer created' });
}

export async function list(req, res) {
  const filter = {};
  const search = clean(req.query.search);
  if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }];
  if (clean(req.query.dateFrom) || clean(req.query.dateTo)) {
    filter.createdAt = {};
    if (clean(req.query.dateFrom)) filter.createdAt.$gte = new Date(req.query.dateFrom);
    if (clean(req.query.dateTo)) filter.createdAt.$lte = new Date(req.query.dateTo);
  }
  const customers = await Customer.find(filter).sort({ createdAt: -1 });
  res.json({ customers });
}

export async function getById(req, res) {
  const profile = await getCustomerProfile(req.params.id);
  res.json(profile);
}
