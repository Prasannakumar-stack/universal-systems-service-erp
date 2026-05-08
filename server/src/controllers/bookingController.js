import Booking from '../models/Booking.js';
import { createBooking } from '../services/bookingService.js';
import { required } from '../utils/http.js';

export async function create(req, res) {
  required(req.body, ['customerName', 'phone']);
  const booking = await createBooking(req.body, req.user);
  res.status(201).json({ booking, message: 'Booking created' });
}

export async function list(req, res) {
  const query = {};
  if (req.query.status) query.status = req.query.status;
  const bookings = await Booking.find(query).populate('customerId technicianId workOrderId').sort({ createdAt: -1 });
  res.json({ bookings });
}
