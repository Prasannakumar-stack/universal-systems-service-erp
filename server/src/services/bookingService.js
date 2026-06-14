import { randomUUID } from 'node:crypto';
import Booking from '../models/Booking.js';
import { upsertCustomer } from './customerService.js';
import { appError, clean } from '../utils/http.js';
import { logAudit } from './auditService.js';
import { createNotification } from './notificationService.js';

const bookingSources = ['Walk-in', 'Call', 'Website', 'Website Booking', 'Contact Form', 'WhatsApp', 'Referral'];
const bookingStatuses = ['Pending', 'New Enquiry', 'Contacted', 'Waiting Customer', 'Pending Enquiry', 'Closed', 'Converted'];
const contactEnquiryStatuses = ['New Enquiry', 'Contacted', 'Waiting Customer', 'Closed'];
const urgentEnquiryPattern = /\b(urgent|emergency|not working|today|immediately|no power|dead|broken|stopped)\b/i;

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

function isContactFormSource(value) {
  return clean(value).toLowerCase() === 'contact form';
}

function validBookingStatus(value, source = '') {
  const status = clean(value);
  if (isContactFormSource(source) && (!status || status === 'Pending')) return 'New Enquiry';
  return bookingStatuses.includes(status) ? status : 'Pending';
}

function enquiryPriorityValue(payload, source = '') {
  const explicit = clean(payload.enquiryPriority || payload.priority);
  if (['Normal', 'Urgent'].includes(explicit)) return explicit;
  if (!isContactFormSource(source)) return 'Normal';
  const text = `${payload.issue || ''} ${payload.problemDescription || ''} ${payload.problem || ''} ${payload.message || ''}`;
  return urgentEnquiryPattern.test(text) ? 'Urgent' : 'Normal';
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
    status: validBookingStatus(payload.status, bookingSource),
    enquiryPriority: enquiryPriorityValue(payload, bookingSource),
    adminNote: clean(payload.adminNote),
    followUpReminder: clean(payload.followUpReminder),
    followUpAt: preferredDateValue(payload.followUpAt),
    technicianId: payload.technicianId || payload.assignedTo || (user?.role === 'technician' ? user._id : null)
  });

  await createNotification({
    title: 'New booking received',
    message: isContactFormSource(bookingSource)
      ? `${booking.customerName} sent a contact enquiry for ${booking.device}.`
      : `${booking.customerName} booked service for ${booking.device}.`,
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
        status: booking.status,
        enquiryPriority: booking.enquiryPriority,
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

export async function updateBookingEnquiry(id, payload, user = null) {
  const booking = await Booking.findById(id);
  if (!booking) throw appError('Booking not found', 404);
  const before = {
    status: booking.status,
    adminNote: booking.adminNote,
    followUpReminder: booking.followUpReminder,
    followUpAt: booking.followUpAt
  };
  const isContact = isContactFormSource(booking.bookingSource);

  if (payload.status !== undefined) {
    const nextStatus = clean(payload.status);
    if (!bookingStatuses.includes(nextStatus)) throw appError('Invalid enquiry status', 400);
    if (nextStatus === 'Converted' && !booking.workOrderId) throw appError('Use Convert to create the service job first', 400);
    if (isContact && !contactEnquiryStatuses.includes(nextStatus) && nextStatus !== 'Converted') {
      throw appError('Invalid Contact Form enquiry status', 400);
    }
    booking.status = nextStatus;
  }

  if (payload.adminNote !== undefined) booking.adminNote = clean(payload.adminNote);
  if (payload.followUpReminder !== undefined) booking.followUpReminder = clean(payload.followUpReminder);
  if (payload.followUpAt !== undefined) booking.followUpAt = preferredDateValue(payload.followUpAt);

  await booking.save();

  try {
    await logAudit({
      userId: user?._id || user?.id || null,
      action: 'booking_enquiry_updated',
      module: 'booking',
      recordId: booking._id,
      before,
      after: {
        status: booking.status,
        adminNote: booking.adminNote,
        followUpReminder: booking.followUpReminder,
        followUpAt: booking.followUpAt
      }
    });
  } catch (error) {
    console.warn('Audit log failed for booking enquiry update:', error.message);
  }

  return booking.populate('customerId technicianId workOrderId');
}
