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
    amcContractId: { type: mongoose.Schema.Types.ObjectId, ref: 'AMCContract', default: null },
    amcVisitId: { type: mongoose.Schema.Types.ObjectId, default: null },
    amcContractNo: { type: String, trim: true, default: '' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    serviceType: { type: String, trim: true, default: '' },
    bookingSource: { type: String, trim: true, default: '' },
    source: { type: String, trim: true, default: '' },
    device: { type: String, required: true, trim: true },
    deviceBrand: { type: String, trim: true, maxlength: 80, default: '' },
    deviceModel: { type: String, trim: true, maxlength: 80, default: '' },
    issue: { type: String, required: true, trim: true },
    technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['Pending', 'In Progress', 'Awaiting Parts', 'Completed', 'Delivered', 'Returned'], default: 'Pending' },
    priority: { type: String, enum: ['Low', 'Normal', 'High', 'Urgent'], default: 'Normal' },
    completedAt: { type: Date, default: null },
    serviceCharge: { type: Number, min: 0, default: 0 },
    serviceChargeBillingType: { type: String, enum: ['covered', 'chargeable', 'none'], default: 'chargeable' },
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
        chargeType: { type: String, enum: ['Chargeable', 'Covered under AMC'], default: 'Chargeable' },
        chargeTypeMode: { type: String, enum: ['Auto', 'Manual'], default: 'Auto' },
        source: { type: String, trim: true, default: '' },
        note: { type: String, trim: true, default: '' },
        stockDeducted: { type: Boolean, default: false },
        stockDeductedAt: { type: Date, default: null },
        addedAt: { type: Date, default: Date.now },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    partRequests: [
      {
        inventoryPartId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryPart', default: null },
        name: { type: String, required: true, trim: true },
        quantity: { type: Number, min: 1, required: true },
        status: {
          type: String,
          enum: ['Requested', 'Reserved', 'Fulfilled', 'Cancelled', 'Pending', 'Approved', 'Rejected', 'Moved to Parts Used'],
          default: 'Pending'
        },
        note: { type: String, trim: true, default: '' },
        rejectionReason: { type: String, trim: true, default: '' },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        approvedAt: { type: Date, default: null },
        rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        rejectedAt: { type: Date, default: null },
        movedAt: { type: Date, default: null },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    images: [
      {
        type: { type: String, enum: ['customer_problem', 'before_service', 'after_service'], default: 'before_service' },
        url: { type: String, required: true },
        filename: { type: String, required: true },
        originalName: { type: String, default: '' },
        mimetype: { type: String, default: '' },
        size: { type: Number, min: 0, default: 0 },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        uploadedByRole: { type: String, enum: ['', 'customer', 'technician', 'admin', 'system'], default: '' },
        uploadedAt: { type: Date, default: Date.now },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    timeline: [timelineSchema],
    documentsSent: [
      {
        type: { type: String, enum: ['quotation', 'work', 'service-completed', 'amc-contract', 'amc-service-visit', 'amc-invoice', 'amc-renewal-reminder'], required: true },
        sentVia: { type: String, trim: true, default: 'WhatsApp' },
        sentAt: { type: Date, default: Date.now }
      }
    ],
    approvalStatus: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
    archivedAt: { type: Date, default: null },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deleteExpiresAt: { type: Date, default: null }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

workOrderSchema.virtual('extraInvoices', {
  ref: 'Invoice',
  localField: '_id',
  foreignField: 'workOrderId'
});

export default mongoose.model('WorkOrder', workOrderSchema);
