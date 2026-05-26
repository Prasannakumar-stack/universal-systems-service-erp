import Booking from '../models/Booking.js';
import { createBooking } from '../services/bookingService.js';
import { getTechnicianScope } from '../services/technicianScopeService.js';
import { clean, required } from '../utils/http.js';
import { addDateRange, paginatedPayload, paginationMeta, parsePagination, searchRegex, validObjectId, withNestedIds } from '../utils/pagination.js';

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
    const bookings = rows.map((booking) => withNestedIds(booking, ['customerId', 'technicianId', 'workOrderId']));
    res.json(paginatedPayload('bookings', bookings, paginationMeta(page, limit, total)));
  } catch (error) {
    console.error('Booking list failed', error);
    res.status(500).json({ success: false, message: 'Unable to load bookings right now' });
  }
}
