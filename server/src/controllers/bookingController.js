import Booking from '../models/Booking.js';
import { createBooking } from '../services/bookingService.js';
import { required } from '../utils/http.js';

function imageFromUpload(file) {
  if (!file) return null;
  return {
    filename: file.filename,
    originalName: file.originalname || '',
    url: `/uploads/${file.filename}`,
    mimetype: file.mimetype || '',
    size: file.size || 0
  };
}

export async function create(req, res) {
  required(req.body, ['customerName', 'phone']);
  const booking = await createBooking({ ...req.body, problemImage: imageFromUpload(req.file) }, req.user);
  res.status(201).json({ booking, message: 'Booking created' });
}

export async function list(req, res) {
  const query = {};
  if (req.query.status) query.status = req.query.status;
  const bookings = await Booking.find(query).populate('customerId technicianId workOrderId').sort({ createdAt: -1 });
  res.json({ bookings });
}
