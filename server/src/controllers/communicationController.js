import Communication from '../models/Communication.js';
import Customer from '../models/Customer.js';
import WorkOrder from '../models/WorkOrder.js';
import { logAudit } from '../services/auditService.js';
import { appError, clean, required } from '../utils/http.js';

export async function create(req, res) {
  required(req.body, ['customerId', 'type', 'message']);
  if (!['Call', 'WhatsApp', 'Email', 'Note'].includes(req.body.type)) throw appError('Invalid communication type');
  const customer = await Customer.findById(req.body.customerId);
  if (!customer) throw appError('Customer not found', 404);
  if (req.body.workOrderId) {
    const workOrder = await WorkOrder.findById(req.body.workOrderId);
    if (!workOrder) throw appError('Work order not found', 404);
    if (req.user.role === 'technician' && String(workOrder.technicianId) !== String(req.user._id)) {
      throw appError('You do not have permission to add communication for this work order', 403);
    }
  }
  const communication = await Communication.create({
    customerId: req.body.customerId,
    workOrderId: req.body.workOrderId || null,
    type: req.body.type,
    message: clean(req.body.message),
    createdBy: req.user._id
  });
  await logAudit({ userId: req.user._id, action: 'created', module: 'communication', recordId: communication._id, after: communication.toObject() });
  res.status(201).json({ communication, message: 'Communication logged' });
}

export async function list(req, res) {
  const filter = {};
  if (req.query.customerId) filter.customerId = req.query.customerId;
  if (req.query.workOrderId) filter.workOrderId = req.query.workOrderId;
  if (req.query.type) filter.type = req.query.type;
  if (req.user.role === 'technician') {
    const assigned = await WorkOrder.find({ technicianId: req.user._id }).select('_id');
    const assignedIds = assigned.map((item) => item._id);
    filter.workOrderId = filter.workOrderId && assignedIds.some((id) => String(id) === String(filter.workOrderId))
      ? filter.workOrderId
      : { $in: assignedIds };
  }
  const communications = await Communication.find(filter).populate('customerId workOrderId createdBy', 'name phone device issue username role').sort({ createdAt: -1 });
  res.json({ communications });
}
