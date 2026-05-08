import CallRequest from '../models/CallRequest.js';
import { createBooking } from '../services/bookingService.js';
import { appError, clean, required } from '../utils/http.js';

export async function create(req, res) {
  required(req.body, ['name', 'phone']);
  const request = await CallRequest.create({
    name: clean(req.body.name),
    phone: clean(req.body.phone),
    serviceInterest: clean(req.body.serviceInterest || req.body.service),
    message: clean(req.body.message)
  });
  res.status(201).json({ request, message: 'Contact request saved' });
}

export async function list(req, res) {
  const filter = clean(req.query.status) ? { status: clean(req.query.status) } : {};
  const requests = await CallRequest.find(filter).populate('convertedBookingId').sort({ createdAt: -1 });
  res.json({ requests });
}

export async function update(req, res) {
  const request = await CallRequest.findById(req.params.id);
  if (!request) throw appError('Call request not found', 404);
  if (req.body.status !== undefined) request.status = clean(req.body.status);
  if (req.body.message !== undefined) request.message = clean(req.body.message);
  await request.save();
  res.json({ request, message: 'Call request updated' });
}

export async function convert(req, res) {
  const request = await CallRequest.findById(req.params.id);
  if (!request) throw appError('Call request not found', 404);
  if (request.convertedBookingId) throw appError('Call request already converted', 409);

  const booking = await createBooking({
    customerName: request.name,
    phone: request.phone,
    address: clean(req.body.address) || 'Address to be updated',
    serviceType: clean(req.body.serviceType || req.body.service) || request.serviceInterest || '',
    bookingSource: clean(req.body.bookingSource || req.body.source) || 'Call',
    device: clean(req.body.device || req.body.serviceType) || request.serviceInterest || 'General Service',
    issue: request.message || 'Customer call request',
    technicianId: req.body.technicianId || req.body.assignedTo || null
  }, req.user);
  request.status = 'Converted';
  request.convertedBookingId = booking._id;
  await request.save();
  res.status(201).json({ booking, request, message: 'Call request converted to booking' });
}
