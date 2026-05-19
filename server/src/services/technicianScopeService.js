import mongoose from 'mongoose';
import AMCContract from '../models/AMCContract.js';
import Booking from '../models/Booking.js';
import Invoice from '../models/Invoice.js';
import WorkOrder from '../models/WorkOrder.js';
import { validObjectId } from '../utils/pagination.js';

function idString(value) {
  const raw = value?._id || value?.id || value;
  return raw ? String(raw) : '';
}

function addId(set, value) {
  const id = idString(value);
  if (id) set.add(id);
}

function objectIds(values = []) {
  return [...values].filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id));
}

export function technicianUserId(user) {
  if (user?.role !== 'technician') return '';
  return validObjectId(user._id || user.id);
}

export function technicianWorkOrderScope(user) {
  const technicianId = technicianUserId(user);
  if (!technicianId) return null;
  return {
    $or: [
      { technicianId },
      { 'timeline.userId': technicianId }
    ]
  };
}

export function technicianCanAccessWorkOrder(workOrder, user) {
  const technicianId = technicianUserId(user);
  if (!technicianId) return true;
  if (idString(workOrder?.technicianId) === technicianId) return true;
  return (workOrder?.timeline || []).some((item) => idString(item.userId) === technicianId);
}

export async function getTechnicianScope(user) {
  const technicianId = technicianUserId(user);
  if (!technicianId) return null;

  const workOrderIds = new Set();
  const bookingIds = new Set();
  const customerIds = new Set();
  const invoiceIds = new Set();
  const amcContractIds = new Set();

  const workOrders = await WorkOrder.find(technicianWorkOrderScope(user))
    .select('_id bookingId customerId invoiceId amcContractId')
    .lean();

  workOrders.forEach((order) => {
    addId(workOrderIds, order._id);
    addId(bookingIds, order.bookingId);
    addId(customerIds, order.customerId);
    addId(invoiceIds, order.invoiceId);
    addId(amcContractIds, order.amcContractId);
  });

  const directBookings = await Booking.find({
    $or: [
      { technicianId },
      { _id: { $in: [...bookingIds] } },
      { workOrderId: { $in: [...workOrderIds] } }
    ]
  }).select('_id customerId workOrderId').lean();

  directBookings.forEach((booking) => {
    addId(bookingIds, booking._id);
    addId(customerIds, booking.customerId);
    addId(workOrderIds, booking.workOrderId);
  });

  const amcContracts = await AMCContract.find({
    $or: [
      { _id: { $in: [...amcContractIds] } },
      { 'visits.technicianId': technicianId },
      { 'visits.workOrderId': { $in: [...workOrderIds] } }
    ]
  }).select('_id customerId invoiceId visits.workOrderId').lean();

  amcContracts.forEach((contract) => {
    addId(amcContractIds, contract._id);
    addId(customerIds, contract.customerId);
    addId(invoiceIds, contract.invoiceId);
    (contract.visits || []).forEach((visit) => addId(workOrderIds, visit.workOrderId));
  });

  const invoices = await Invoice.find({
    $or: [
      { _id: { $in: [...invoiceIds] } },
      { workOrderId: { $in: [...workOrderIds] } },
      { amcContractId: { $in: [...amcContractIds] } }
    ]
  }).select('_id customerId workOrderId amcContractId').lean();

  invoices.forEach((invoice) => {
    addId(invoiceIds, invoice._id);
    addId(customerIds, invoice.customerId);
    addId(workOrderIds, invoice.workOrderId);
    addId(amcContractIds, invoice.amcContractId);
  });

  return {
    technicianId,
    workOrderIds: [...workOrderIds],
    workOrderObjectIds: objectIds(workOrderIds),
    bookingIds: [...bookingIds],
    bookingObjectIds: objectIds(bookingIds),
    customerIds: [...customerIds],
    customerObjectIds: objectIds(customerIds),
    invoiceIds: [...invoiceIds],
    invoiceObjectIds: objectIds(invoiceIds),
    amcContractIds: [...amcContractIds],
    amcContractObjectIds: objectIds(amcContractIds)
  };
}
