import Booking from '../models/Booking.js';
import Customer from '../models/Customer.js';
import WorkOrder from '../models/WorkOrder.js';
import { createBooking, updateBookingEnquiry } from '../services/bookingService.js';
import { getTechnicianScope } from '../services/technicianScopeService.js';
import { clean, required } from '../utils/http.js';
import { addDateRange, paginatedPayload, paginationMeta, parsePagination, searchRegex, validObjectId, withNestedIds } from '../utils/pagination.js';

function normalizedPhone(value) {
  return clean(value).replace(/\D/g, '');
}

function isContactFormSource(value) {
  return clean(value).toLowerCase() === 'contact form';
}

function referenceDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

async function duplicateInfoForBooking(booking) {
  if (!isContactFormSource(booking.bookingSource)) return null;
  const phone = normalizedPhone(booking.phone);
  if (!phone) return null;

  const bookingCreatedAt = referenceDate(booking.createdAt);
  const customerId = booking.customerId?._id || booking.customerId;
  const [customer, bookings, workOrders] = await Promise.all([
    customerId ? Customer.findById(customerId).select('name phone createdAt').lean() : null,
    Booking.find({ _id: { $ne: booking._id }, phone }).select('bookingCode customerName bookingSource status createdAt workOrderId').sort({ createdAt: -1 }).limit(3).lean(),
    customerId ? WorkOrder.find({ customerId }).select('device status createdAt bookingId').sort({ createdAt: -1 }).limit(3).lean() : []
  ]);

  const matches = [];
  if (customer && referenceDate(customer.createdAt) && referenceDate(customer.createdAt) < bookingCreatedAt - 1000) {
    matches.push({
      type: 'Customer',
      label: customer.name || 'Existing customer',
      reference: phone,
      createdAt: customer.createdAt
    });
  }
  bookings.forEach((item) => {
    matches.push({
      type: isContactFormSource(item.bookingSource) ? 'Enquiry' : 'Booking',
      label: item.bookingCode || item.customerName || 'Existing booking',
      reference: item.status || item.bookingSource || '',
      createdAt: item.createdAt
    });
  });
  workOrders
    .filter((item) => String(item.bookingId || '') !== String(booking._id || ''))
    .forEach((item) => {
      matches.push({
        type: 'Work Order',
        label: item.device || 'Existing service job',
        reference: item.status || '',
        createdAt: item.createdAt
      });
    });

  if (!matches.length) return null;
  return {
    hasDuplicate: true,
    message: 'Existing customer/enquiry found.',
    matches: matches.slice(0, 5)
  };
}

async function enrichBookingRows(rows) {
  return Promise.all(rows.map(async (booking) => ({
    ...withNestedIds(booking, ['customerId', 'technicianId', 'workOrderId']),
    duplicateInfo: await duplicateInfoForBooking(booking)
  })));
}

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
  const booking = await createBooking({
    ...req.body,
    status: req.publicWebsiteSettings?.booking?.defaultBookingStatus || req.body.status,
    problemImage: imageFromUpload(req.file)
  }, req.user);
  res.status(201).json({ booking, message: 'Booking created' });
}

export async function list(req, res) {
  try {
    const filter = {};
    const clauses = [];
    const { page, limit, skip } = parsePagination(req.query);

    if (clean(req.query.status)) filter.status = clean(req.query.status);
    if (clean(req.query.serviceType)) filter.serviceType = searchRegex(req.query.serviceType);
    if (clean(req.query.source)) {
      const source = searchRegex(req.query.source);
      clauses.push({ $or: [{ bookingSource: source }, { source }, { channel: source }] });
    }
    addDateRange(filter, req.query);
    const technicianScope = await getTechnicianScope(req.user);
    if (technicianScope) {
      clauses.push({
        $or: [
          { technicianId: technicianScope.technicianId },
          { _id: { $in: technicianScope.bookingObjectIds } },
          { workOrderId: { $in: technicianScope.workOrderObjectIds } }
        ]
      });
    }

    const search = clean(req.query.search);
    const regex = searchRegex(search);
    if (regex) {
      const searchFields = [
        { bookingCode: regex },
        { customerName: regex },
        { phone: regex },
        { device: regex },
        { serviceType: regex },
        { issue: regex },
        { bookingSource: regex },
        { source: regex },
        { channel: regex }
      ];
      const objectId = validObjectId(search);
      if (objectId) searchFields.push({ _id: objectId });
      clauses.push({ $or: searchFields });
    }
    if (clauses.length) filter.$and = clauses;

    const [total, rows] = await Promise.all([
      Booking.countDocuments(filter),
      Booking.find(filter)
        .populate('customerId technicianId workOrderId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);
    const bookings = await enrichBookingRows(rows);
    res.json(paginatedPayload('bookings', bookings, paginationMeta(page, limit, total)));
  } catch (error) {
    console.error('Booking list failed', error);
    res.status(500).json({ success: false, message: 'Unable to load bookings right now' });
  }
}

export async function update(req, res) {
  const booking = await updateBookingEnquiry(req.params.id, req.body, req.user);
  const row = {
    ...withNestedIds(booking.toObject ? booking.toObject() : booking, ['customerId', 'technicianId', 'workOrderId']),
    duplicateInfo: await duplicateInfoForBooking(booking)
  };
  res.json({ success: true, booking: row, message: 'Enquiry details saved' });
}
