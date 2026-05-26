import { randomUUID } from 'node:crypto';
import Booking from '../models/Booking.js';
import { upsertCustomer } from './customerService.js';
import { clean } from '../utils/http.js';
import { logAudit } from './auditService.js';
import { createNotification } from './notificationService.js';

const bookingSources = ['Walk-in', 'Call', 'Website', 'WhatsApp', 'Referral'];
const bookingStatuses = ['Pending', 'Converted'];

function bookingCode() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `BK-${date}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

function cleanBookingSource(value) {
  const source = clean(value);
  if (!source) return '';
  return bookingSources.includes(source) ? source : source;
}

function validBookingStatus(value) {
  const status = clean(value);
  return bookingStatuses.includes(status) ? status : 'Pending';
}

function preferredDateValue(value) {
  const text = clean(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createBooking(payload, user = null) {
  const serviceType = clean(payload.serviceType || payload.service || '');
  const bookingSource = cleanBookingSource(payload.bookingSource || payload.source || '');
  const problemImage = payload.problemImage
    ? {
        filename: clean(payload.problemImage.filename),
        originalName: clean(payload.problemImage.originalName),
        url: clean(payload.problemImage.url),
        mimetype: clean(payload.problemImage.mimetype),
        size: Number(payload.problemImage.size || 0)
      }
    : null;
  const customer = await upsertCustomer({
    name: payload.customerName || payload.name,
    phone: payload.phone,
    address: payload.address,
    device: payload.device || serviceType || payload.product
  });

  const booking = await Booking.create({
    bookingCode: bookingCode(),
    customerId: customer._id,
    customerName: customer.name,
    phone: customer.phone,
    address: customer.address,
    serviceType,
    bookingSource,
    problemImage,
    device: clean(payload.device || serviceType || payload.product || 'General Service'),
    issue: clean(payload.issue || payload.problemDescription || payload.problem || 'Service request'),
    preferredDate: preferredDateValue(payload.preferredDate),
    preferredTime: clean(payload.preferredTime),
    status: validBookingStatus(payload.status),
    technicianId: payload.technicianId || payload.assignedTo || (user?.role === 'technician' ? user._id : null)
  });

  await createNotification({
    title: 'New booking received',
    message: `${booking.customerName} booked service for ${booking.device}.`,
    type: 'BOOKING',
    role: 'admin',
    sourceId: booking._id
  });

  try {
    await logAudit({
      userId: user?._id || user?.id || null,
      action: 'booking_created',
      module: 'booking',
      recordId: booking._id,
      after: {
        entityType: 'Booking',
        bookingId: booking._id,
        bookingCode: booking.bookingCode,
        customerName: booking.customerName,
        phone: booking.phone,
        serviceType: booking.serviceType,
        bookingSource: booking.bookingSource,
        problemImage: booking.problemImage?.url || '',
        device: booking.device,
        preferredDate: booking.preferredDate,
        preferredTime: booking.preferredTime,
        timestamp: booking.createdAt
      }
    });
  } catch (error) {
    console.warn('Audit log failed for booking create:', error.message);
  }

  return booking;
}
