import mongoose from 'mongoose';

const timelineSchema = new mongoose.Schema(
  {
    type: { type: String, trim: true, default: 'status' },
    status: { type: String, enum: ['Pending', 'In Progress', 'Awaiting Parts', 'Completed', 'Delivered', 'Returned'], required: true },
    message: { type: String, required: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const workOrderSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    serviceType: { type: String, trim: true, default: '' },
    bookingSource: { type: String, trim: true, default: '' },
    device: { type: String, required: true, trim: true },
    issue: { type: String, required: true, trim: true },
    technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['Pending', 'In Progress', 'Awaiting Parts', 'Completed', 'Delivered', 'Returned'], default: 'Pending' },
    completedAt: { type: Date, default: null },
    serviceCharge: { type: Number, min: 0, default: 0 },
    notes: [
      {
        text: { type: String, required: true, trim: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    partsUsed: [
      {
        inventoryPartId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryPart', default: null },
        name: { type: String, required: true, trim: true },
        quantity: { type: Number, min: 1, required: true },
        unitPrice: { type: Number, min: 0, default: 0 },
        total: { type: Number, min: 0, default: 0 },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    partRequests: [
      {
        inventoryPartId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryPart', default: null },
        name: { type: String, required: true, trim: true },
        quantity: { type: Number, min: 1, required: true },
        status: { type: String, enum: ['Requested', 'Reserved', 'Fulfilled', 'Cancelled'], default: 'Requested' },
        note: { type: String, trim: true, default: '' },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    images: [
      {
        url: { type: String, required: true },
        filename: { type: String, required: true },
        originalName: { type: String, default: '' },
        mimetype: { type: String, default: '' },
        size: { type: Number, min: 0, default: 0 },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    timeline: [timelineSchema],
    documentsSent: [
      {
        type: { type: String, enum: ['quotation', 'work', 'service-completed'], required: true },
        sentVia: { type: String, trim: true, default: 'WhatsApp' },
        sentAt: { type: Date, default: Date.now }
      }
    ],
    approvalStatus: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export default mongoose.model('WorkOrder', workOrderSchema);
