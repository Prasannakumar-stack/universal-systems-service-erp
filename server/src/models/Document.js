import mongoose from 'mongoose';

const documentItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, min: 1, default: 1 },
    price: { type: Number, min: 0, default: 0 },
    subtotal: { type: Number, min: 0, default: 0 }
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['invoice', 'quotation', 'service'], required: true },
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
    items: [documentItemSchema],
    serviceCharge: { type: Number, min: 0, default: 0 },
    totalAmount: { type: Number, min: 0, required: true },
    status: { type: String, enum: ['draft', 'sent', 'approved'], default: 'draft' }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export default mongoose.model('Document', documentSchema);
